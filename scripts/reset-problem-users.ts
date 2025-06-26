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

// 問題のユーザーメールアドレス
const PROBLEM_USERS = [
  's13102502969@toyo.jp',
  'kyogoate@gmail.com'
]

async function resetProblemUsers() {
  console.log('🔧 問題ユーザーのデータ初期化を開始します...')
  console.log('対象ユーザー:', PROBLEM_USERS)
  
  try {
    // 1. auth.usersからユーザー情報を取得
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ ユーザー情報の取得に失敗:', authError)
      return
    }
    
    const problemUsers = authUsers.users.filter(user => 
      user.email && PROBLEM_USERS.includes(user.email)
    )
    
    if (problemUsers.length === 0) {
      console.log('⚠️ 対象ユーザーが見つかりません')
      return
    }
    
    console.log(`✅ ${problemUsers.length}人のユーザーが見つかりました`)
    
    for (const user of problemUsers) {
      console.log(`\n📍 処理中: ${user.email} (ID: ${user.id})`)
      
      // 2. 既存のプロフィールを削除
      console.log('  🗑️ 既存プロフィールを削除...')
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)
      
      if (deleteError) {
        console.error(`  ❌ プロフィール削除エラー: ${deleteError.message}`)
      } else {
        console.log('  ✅ プロフィール削除完了')
      }
      
      // 3. Storage内の画像を削除
      console.log('  🗑️ Storage内の画像を削除...')
      const { data: files, error: listError } = await supabase
        .storage
        .from('profile')
        .list(user.id)
      
      if (listError) {
        console.error(`  ❌ ファイルリスト取得エラー: ${listError.message}`)
      } else if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`)
        const { error: removeError } = await supabase
          .storage
          .from('profile')
          .remove(filePaths)
        
        if (removeError) {
          console.error(`  ❌ ファイル削除エラー: ${removeError.message}`)
        } else {
          console.log(`  ✅ ${files.length}個のファイルを削除`)
        }
      } else {
        console.log('  ℹ️ 削除する画像はありません')
      }
      
      // 4. 科目データを削除
      console.log('  🗑️ 科目データを削除...')
      const { error: subjectsDeleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('user_id', user.id)
      
      if (subjectsDeleteError) {
        console.error(`  ❌ 科目削除エラー: ${subjectsDeleteError.message}`)
      } else {
        console.log('  ✅ 科目データ削除完了')
      }
      
      // 5. 学習セッションデータを削除
      console.log('  🗑️ 学習セッションデータを削除...')
      const { error: sessionsDeleteError } = await supabase
        .from('study_sessions')
        .delete()
        .eq('user_id', user.id)
      
      if (sessionsDeleteError) {
        console.error(`  ❌ セッション削除エラー: ${sessionsDeleteError.message}`)
      } else {
        console.log('  ✅ 学習セッションデータ削除完了')
      }
      
      // 6. user_metadataをクリア
      console.log('  🧹 user_metadataをクリア...')
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            // レガシーデータを削除
            display_name: null,
            bio: null,
            grade: null,
            target_school: null,
            current_school: null,
            profile_image: null,
            avatar_url: null
          }
        }
      )
      
      if (updateError) {
        console.error(`  ❌ metadata更新エラー: ${updateError.message}`)
      } else {
        console.log('  ✅ metadata更新完了')
      }
      
      console.log(`✅ ${user.email} の初期化が完了しました`)
    }
    
    console.log('\n🎉 すべての処理が完了しました！')
    console.log('\n📝 次のステップ:')
    console.log('1. ユーザーにCookieをクリアしてもらう')
    console.log('2. ブラウザのキャッシュをクリアしてもらう')
    console.log('3. 再度ログインしてもらう')
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  }
}

// メイン実行
resetProblemUsers()