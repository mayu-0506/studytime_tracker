#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

// Service role clientでRLSをバイパス
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ハードデリート対象のメールアドレス
const TARGET_EMAILS = [
  's13102502969@toyo.jp',
  'kyogoate@gmail.com'
]

async function hardDeleteUsers() {
  console.log('🗑️ ユーザーのハードデリートを開始します...')
  console.log('対象ユーザー:', TARGET_EMAILS)
  console.log('\n⚠️ 警告: この操作は取り消しできません！\n')
  
  try {
    // 1. 対象ユーザーを検索
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ ユーザーリストの取得に失敗:', listError)
      return
    }
    
    const usersToDelete = allUsers.users.filter(user => 
      user.email && TARGET_EMAILS.includes(user.email.toLowerCase())
    )
    
    if (usersToDelete.length === 0) {
      console.log('⚠️ 対象ユーザーが見つかりません')
      return
    }
    
    console.log(`\n📋 ${usersToDelete.length}人のユーザーが見つかりました:`)
    usersToDelete.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`)
      console.log(`    作成日: ${user.created_at}`)
      console.log(`    削除済み: ${user.deleted_at ? 'はい' : 'いいえ'}`)
    })
    
    // 確認プロンプト（本番では削除）
    console.log('\n🔄 処理を開始します...\n')
    
    for (const user of usersToDelete) {
      console.log(`\n📍 処理中: ${user.email} (ID: ${user.id})`)
      
      // 2. 関連データを削除（外部キー制約を避けるため）
      const tables = ['profiles', 'subjects', 'study_sessions']
      
      for (const table of tables) {
        console.log(`  🧹 ${table}テーブルをクリーンアップ...`)
        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', user.id)
          .select()
        
        if (error) {
          console.warn(`  ⚠️ ${table}削除エラー:`, error.message)
        } else {
          console.log(`  ✅ ${table}から${data?.length || 0}件削除`)
        }
      }
      
      // profilesテーブルはidカラムでも削除を試みる
      console.log(`  🧹 profilesテーブル(id)をクリーンアップ...`)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)
        .select()
      
      if (profileError) {
        console.warn(`  ⚠️ profiles(id)削除エラー:`, profileError.message)
      } else {
        console.log(`  ✅ profiles(id)から${profileData?.length || 0}件削除`)
      }
      
      // 3. Storage内の画像を削除
      console.log('  🖼️ Storage内の画像を削除...')
      const { data: files, error: listError } = await supabase
        .storage
        .from('profile')
        .list(user.id)
      
      if (listError) {
        console.warn(`  ⚠️ ファイルリスト取得エラー:`, listError.message)
      } else if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`)
        const { error: removeError } = await supabase
          .storage
          .from('profile')
          .remove(filePaths)
        
        if (removeError) {
          console.warn(`  ⚠️ ファイル削除エラー:`, removeError.message)
        } else {
          console.log(`  ✅ ${files.length}個のファイルを削除`)
        }
      } else {
        console.log('  ℹ️ 削除する画像はありません')
      }
      
      // 4. ユーザーをハードデリート
      console.log('  🔥 ユーザーをハードデリート...')
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        user.id,
        false // shouldSoftDelete = false でハードデリート
      )
      
      if (deleteError) {
        console.error(`  ❌ ユーザー削除エラー:`, deleteError.message)
      } else {
        console.log(`  ✅ ユーザーをハードデリートしました`)
      }
    }
    
    // 5. 削除の確認
    console.log('\n🔍 削除を確認中...')
    const { data: checkUsers } = await supabase.auth.admin.listUsers()
    
    for (const email of TARGET_EMAILS) {
      const stillExists = checkUsers?.users.find(u => 
        u.email?.toLowerCase() === email.toLowerCase()
      )
      
      if (stillExists) {
        console.log(`  ❌ ${email} はまだ存在します`)
      } else {
        console.log(`  ✅ ${email} は正常に削除されました`)
      }
    }
    
    console.log('\n🎉 ハードデリート処理が完了しました！')
    console.log('\n📝 次のステップ:')
    console.log('1. ユーザーが再度サインアップできることを確認')
    console.log('2. 必要に応じてデータベースのバックアップを確認')
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  }
}

// メイン実行
async function main() {
  console.log('⚠️  警告: このスクリプトはユーザーデータを完全に削除します')
  console.log('実行する前に、必ずデータベースのバックアップを取得してください\n')
  
  // 5秒待機（誤実行防止）
  console.log('5秒後に実行を開始します... (Ctrl+Cでキャンセル)')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  await hardDeleteUsers()
}

main()