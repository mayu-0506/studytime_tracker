#!/usr/bin/env tsx
/**
 * Base64画像をSupabase Storageに移行するNode.jsスクリプト
 * バックアップテーブルから画像を取得してStorageにアップロード
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// 環境変数読み込み
config({ path: '.env.local' })

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface BackupImage {
  user_id: string
  base64_image: string
  backed_up_at: string
}

interface MigrationResult {
  userId: string
  success: boolean
  error?: string
  storageUrl?: string
  imageSize?: number
}

/**
 * Base64をBufferに変換
 */
function base64ToBuffer(base64String: string): { buffer: Buffer; mimeType: string; extension: string } {
  // data:image/png;base64,iVBORw... の形式から抽出
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
  
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string format')
  }
  
  const mimeType = matches[1]
  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, 'base64')
  
  // MIMEタイプから拡張子を決定
  const extension = mimeType.split('/')[1] || 'png'
  
  return { buffer, mimeType, extension }
}

/**
 * 画像をSupabase Storageにアップロード
 */
async function uploadImageToStorage(
  userId: string,
  base64Image: string
): Promise<{ url: string; path: string }> {
  const { buffer, mimeType, extension } = base64ToBuffer(base64Image)
  
  // ファイル名を生成
  const timestamp = Date.now()
  const fileName = `${userId}_${timestamp}.${extension}`
  const filePath = `avatars/${fileName}`
  
  console.log(`📤 Uploading ${filePath} (${(buffer.length / 1024).toFixed(2)} KB)`)
  
  // Storageにアップロード
  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
      cacheControl: '3600'
    })
  
  if (error) {
    throw error
  }
  
  // 公開URLを取得
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('avatars')
    .getPublicUrl(filePath)
  
  return { url: publicUrl, path: filePath }
}

/**
 * メイン処理
 */
async function migrateImages() {
  console.log('🚀 Starting image migration from backup table...')
  
  const results: MigrationResult[] = []
  const logDir = join(process.cwd(), 'logs')
  mkdirSync(logDir, { recursive: true })
  
  try {
    // バックアップテーブルから画像を取得
    const { data: backups, error: fetchError } = await supabaseAdmin
      .from('user_image_backup')
      .select('*')
      .order('backed_up_at', { ascending: true })
    
    if (fetchError) {
      throw fetchError
    }
    
    if (!backups || backups.length === 0) {
      console.log('ℹ️ No backup images found')
      return
    }
    
    console.log(`📊 Found ${backups.length} images to migrate`)
    
    // 各画像を処理
    for (const backup of backups) {
      const result: MigrationResult = {
        userId: backup.user_id,
        success: false
      }
      
      try {
        // 画像サイズチェック
        const imageSize = backup.base64_image.length
        result.imageSize = imageSize
        
        console.log(`\n👤 Processing user: ${backup.user_id}`)
        console.log(`   Image size: ${(imageSize / 1024).toFixed(2)} KB`)
        
        // Storageにアップロード
        const { url, path } = await uploadImageToStorage(
          backup.user_id,
          backup.base64_image
        )
        
        result.storageUrl = url
        
        // ユーザーメタデータを更新
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          backup.user_id,
          {
            user_metadata: {
              avatar_url: url,
              avatar_path: path,
              image_migrated: true,
              migrated_at: new Date().toISOString()
            }
          }
        )
        
        if (updateError) {
          throw updateError
        }
        
        // 成功後、バックアップを削除（オプション）
        const { error: deleteError } = await supabaseAdmin
          .from('user_image_backup')
          .delete()
          .eq('user_id', backup.user_id)
        
        if (deleteError) {
          console.warn(`   ⚠️ Failed to delete backup: ${deleteError.message}`)
        }
        
        result.success = true
        console.log(`   ✅ Successfully migrated to: ${url}`)
        
      } catch (error) {
        result.success = false
        result.error = error instanceof Error ? error.message : String(error)
        console.error(`   ❌ Error: ${result.error}`)
      }
      
      results.push(result)
    }
    
    // 結果をログファイルに保存
    const logFile = join(logDir, `migration-${Date.now()}.json`)
    writeFileSync(logFile, JSON.stringify(results, null, 2))
    
    // サマリー
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log('\n📊 Migration Summary:')
    console.log(`✅ Successful: ${successful}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📄 Log file: ${logFile}`)
    
    // 失敗したものを表示
    if (failed > 0) {
      console.log('\n❌ Failed migrations:')
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`- User ${r.userId}: ${r.error}`)
        })
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// ストレージバケットの作成確認
async function ensureStorageBucket() {
  console.log('🪣 Checking storage bucket...')
  
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()
  
  if (error) {
    console.error('❌ Failed to list buckets:', error)
    return false
  }
  
  const avatarBucket = buckets.find(b => b.name === 'avatars')
  
  if (!avatarBucket) {
    console.log('📦 Creating avatars bucket...')
    
    const { error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    })
    
    if (createError) {
      console.error('❌ Failed to create bucket:', createError)
      return false
    }
    
    console.log('✅ Avatars bucket created')
  } else {
    console.log('✅ Avatars bucket exists')
  }
  
  return true
}

// メイン実行
async function main() {
  // 環境変数チェック
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set')
    process.exit(1)
  }
  
  // ストレージバケット確認
  const bucketReady = await ensureStorageBucket()
  if (!bucketReady) {
    console.error('❌ Storage bucket is not ready')
    process.exit(1)
  }
  
  // マイグレーション実行
  await migrateImages()
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error)
  process.exit(1)
})

main().catch(console.error)