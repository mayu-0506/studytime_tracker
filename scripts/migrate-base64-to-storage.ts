#!/usr/bin/env ts-node
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// 環境変数読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 環境変数が設定されていません:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗')
  process.exit(1)
}

// Supabase Admin Client
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface MigrationResult {
  userId: string
  email: string
  status: 'success' | 'skipped' | 'error'
  message: string
  oldSize?: number
  newSize?: number
}

async function base64ToBuffer(base64: string): Promise<Buffer> {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}

async function getMimeType(base64: string): string {
  const match = base64.match(/^data:image\/(\w+);base64,/)
  return match ? `image/${match[1]}` : 'image/png'
}

async function migrateUserProfileImage(user: any): Promise<MigrationResult> {
  const result: MigrationResult = {
    userId: user.id,
    email: user.email || 'unknown',
    status: 'skipped',
    message: 'No profile image found'
  }

  try {
    const profileImage = user.raw_user_meta_data?.profile_image || 
                        user.user_metadata?.profile_image

    if (!profileImage) {
      return result
    }

    // Base64でない場合はスキップ
    if (!profileImage.startsWith('data:image/')) {
      result.message = 'Profile image is already a URL'
      return result
    }

    result.oldSize = new TextEncoder().encode(profileImage).length

    // Base64をBufferに変換
    const buffer = await base64ToBuffer(profileImage)
    const mimeType = await getMimeType(profileImage)
    const extension = mimeType.split('/')[1] || 'png'
    const fileName = `${user.id}_${Date.now()}.${extension}`
    const filePath = `profile-images/${fileName}`

    console.log(`📤 Uploading ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)...`)

    // Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // user_metadataを更新：avatar_urlに保存し、profile_imageを削除
    const updatedMetadata = { ...user.raw_user_meta_data }
    updatedMetadata.avatar_url = publicUrl
    delete updatedMetadata.profile_image

    // Auth Admin APIで更新
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: updatedMetadata }
    )

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`)
    }

    result.status = 'success'
    result.message = `Migrated to ${publicUrl}`
    result.newSize = new TextEncoder().encode(publicUrl).length

    console.log(`✅ User ${user.email}: ${(result.oldSize! / 1024).toFixed(1)} KB → ${(result.newSize! / 1024).toFixed(1)} KB`)

    return result
  } catch (error) {
    result.status = 'error'
    result.message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ User ${user.email}: ${result.message}`)
    return result
  }
}

async function main() {
  console.log('🚀 Starting Base64 → Storage migration...\n')

  // Storage バケットの確認
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
  if (bucketError) {
    console.error('❌ Storage access error:', bucketError.message)
    process.exit(1)
  }

  const avatarsBucket = buckets.find(b => b.name === 'avatars')
  if (!avatarsBucket) {
    console.log('📦 Creating avatars bucket...')
    const { error: createError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880 // 5MB
    })
    if (createError) {
      console.error('❌ Bucket creation error:', createError.message)
      process.exit(1)
    }
  }

  // 全ユーザーを取得
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('❌ User list error:', listError.message)
    process.exit(1)
  }

  console.log(`Found ${users.length} users to check.\n`)

  const results: MigrationResult[] = []
  
  // バッチ処理（同時実行数を制限）
  const batchSize = 5
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(user => migrateUserProfileImage(user))
    )
    results.push(...batchResults)
    
    // レート制限回避のため少し待機
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // 結果サマリー
  console.log('\n📊 Migration Summary:')
  console.log('─'.repeat(50))
  
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error').length
  }

  console.log(`Total users: ${summary.total}`)
  console.log(`✅ Migrated: ${summary.success}`)
  console.log(`⏭️  Skipped: ${summary.skipped}`)
  console.log(`❌ Errors: ${summary.errors}`)

  // サイズ削減の統計
  const migrated = results.filter(r => r.status === 'success' && r.oldSize && r.newSize)
  if (migrated.length > 0) {
    const totalOldSize = migrated.reduce((sum, r) => sum + r.oldSize!, 0)
    const totalNewSize = migrated.reduce((sum, r) => sum + r.newSize!, 0)
    const reduction = ((totalOldSize - totalNewSize) / totalOldSize * 100).toFixed(1)
    
    console.log(`\n💾 Size Reduction:`)
    console.log(`Before: ${(totalOldSize / 1024).toFixed(1)} KB total`)
    console.log(`After: ${(totalNewSize / 1024).toFixed(1)} KB total`)
    console.log(`Saved: ${reduction}% 🎉`)
  }

  // エラー詳細
  const errors = results.filter(r => r.status === 'error')
  if (errors.length > 0) {
    console.log('\n❌ Error Details:')
    errors.forEach(e => {
      console.log(`- ${e.email}: ${e.message}`)
    })
  }

  // 結果をファイルに保存
  const resultFile = path.join(process.cwd(), `migration-result-${Date.now()}.json`)
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2))
  console.log(`\n📄 Detailed results saved to: ${resultFile}`)
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

// 実行
main().catch(console.error)