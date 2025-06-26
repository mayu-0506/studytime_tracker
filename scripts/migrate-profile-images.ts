#!/usr/bin/env tsx
/**
 * Base64プロフィール画像をSupabase StorageのURLに移行するスクリプト
 * 
 * 実行方法:
 * npm run migrate:images
 * または
 * tsx scripts/migrate-profile-images.ts
 */

import { config } from 'dotenv'
import { migrateProfileImagesToUrls } from '../utils/supabase/admin'

// 環境変数読み込み
config({ path: '.env.local' })

async function main() {
  console.log('🚀 プロフィール画像マイグレーションを開始します...')
  console.log('環境:', process.env.NODE_ENV || 'development')
  
  // 必要な環境変数チェック
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ エラー: SUPABASE_SERVICE_ROLE_KEY が設定されていません')
    console.error('💡 .env.local に以下を追加してください:')
    console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
    process.exit(1)
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ エラー: NEXT_PUBLIC_SUPABASE_URL が設定されていません')
    process.exit(1)
  }
  
  try {
    // 確認プロンプト
    console.log('\n⚠️  警告: このスクリプトは全ユーザーのprofile_imageを変更します')
    console.log('続行しますか？ (yes/no): ')
    
    // 標準入力から確認を取得
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
    
    // マイグレーション実行
    console.log('\n🔄 マイグレーションを実行中...')
    const result = await migrateProfileImagesToUrls()
    
    if (result.success) {
      console.log('\n✅ マイグレーション完了！')
      console.log(`📊 移行したユーザー数: ${result.totalMigrated}`)
    } else {
      console.error('\n❌ マイグレーション失敗:', result.error)
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ 予期しないエラー:', error)
    process.exit(1)
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error)
  process.exit(1)
})

// メイン実行
main().catch(console.error)