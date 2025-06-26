#!/usr/bin/env tsx
/**
 * 大きなCookieとuser_metadataをクリーンアップするスクリプト
 * 
 * 実行方法:
 * npm run admin:cleanup
 * または
 * tsx scripts/cleanup-large-cookies.ts
 */

import { config } from 'dotenv'
import { supabaseAdmin, cleanupUserMetadata } from '../utils/supabase/admin'

// 環境変数読み込み
config({ path: '.env.local' })

interface CleanupOptions {
  userId?: string
  batchSize?: number
  dryRun?: boolean
}

async function cleanupLargeCookies(options: CleanupOptions = {}) {
  const { userId, batchSize = 50, dryRun = false } = options
  
  console.log('🧹 Cookie/Metadata クリーンアップを開始します...')
  console.log('設定:', { userId, batchSize, dryRun })
  
  if (dryRun) {
    console.log('📝 Dry run モード: 実際の変更は行いません')
  }
  
  try {
    let totalCleaned = 0
    
    if (userId) {
      // 特定ユーザーのクリーンアップ
      console.log(`\n👤 ユーザー ${userId} をクリーンアップ中...`)
      
      if (!dryRun) {
        const result = await cleanupUserMetadata(userId)
        if (result.success && result.cleaned) {
          totalCleaned++
        }
      }
      
    } else {
      // 全ユーザーのクリーンアップ
      console.log('\n👥 全ユーザーをチェック中...')
      
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
          page: page,
          perPage: batchSize
        })
        
        if (error) {
          throw error
        }
        
        if (!users || users.length === 0) {
          hasMore = false
          break
        }
        
        console.log(`\n📄 ページ ${page}: ${users.length} ユーザー`)
        
        for (const user of users) {
          // メタデータサイズをチェック
          const metadataString = JSON.stringify(user.user_metadata || {})
          const metadataSize = new TextEncoder().encode(metadataString).length
          
          if (metadataSize > 1024) { // 1KB以上
            console.log(`⚠️  大きなメタデータ検出: ${user.email} (${(metadataSize / 1024).toFixed(2)} KB)`)
            
            // 大きなフィールドを表示
            const metadata = user.user_metadata || {}
            Object.keys(metadata).forEach(key => {
              const value = metadata[key]
              if (typeof value === 'string' && value.length > 500) {
                const preview = value.substring(0, 50)
                console.log(`   - ${key}: ${value.length} bytes (${preview}...)`)
              }
            })
            
            if (!dryRun) {
              const result = await cleanupUserMetadata(user.id)
              if (result.success && result.cleaned) {
                totalCleaned++
                console.log(`   ✅ クリーンアップ完了`)
              }
            }
          }
        }
        
        page++
      }
    }
    
    console.log(`\n✨ クリーンアップ完了！`)
    console.log(`📊 処理したユーザー数: ${totalCleaned}`)
    
  } catch (error) {
    console.error('\n❌ エラー:', error)
    process.exit(1)
  }
}

// CLIパラメータ処理
async function main() {
  const args = process.argv.slice(2)
  
  const options: CleanupOptions = {
    userId: args.find(arg => arg.startsWith('--user='))?.split('=')[1],
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch='))?.split('=')[1] || '50'),
    dryRun: args.includes('--dry-run')
  }
  
  if (args.includes('--help')) {
    console.log(`
使用方法:
  npm run admin:cleanup [options]

オプション:
  --user=<userId>    特定のユーザーIDのみクリーンアップ
  --batch=<number>   バッチサイズ (デフォルト: 50)
  --dry-run          実際の変更を行わずに確認のみ
  --help             このヘルプを表示

例:
  npm run admin:cleanup --dry-run
  npm run admin:cleanup --user=123e4567-e89b-12d3-a456-426614174000
  npm run admin:cleanup --batch=100
    `)
    process.exit(0)
  }
  
  // 環境変数チェック
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ エラー: SUPABASE_SERVICE_ROLE_KEY が設定されていません')
    process.exit(1)
  }
  
  // 確認（dry-runでない場合）
  if (!options.dryRun) {
    console.log('\n⚠️  警告: このスクリプトはユーザーメタデータを変更します')
    console.log('--dry-run オプションで事前確認することをお勧めします')
    console.log('\n続行しますか？ (yes/no): ')
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise<string>(resolve => {
      readline.question('', (answer: string) => {
        readline.close()
        resolve(answer.toLowerCase())
      })
    })
    
    if (answer !== 'yes' && answer !== 'y') {
      console.log('❌ キャンセルしました')
      process.exit(0)
    }
  }
  
  await cleanupLargeCookies(options)
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error)
  process.exit(1)
})

// メイン実行
main().catch(console.error)