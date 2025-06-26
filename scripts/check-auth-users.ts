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

// 調査対象のメールアドレス
const TARGET_EMAILS = [
  's13102502969@toyo.jp',
  'kyogoate@gmail.com'
]

async function checkAuthUsers() {
  console.log('🔍 auth.usersテーブルを調査中...\n')
  
  try {
    // 1. 全ユーザーをリスト（削除済みも含む）
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ ユーザーリストの取得に失敗:', listError)
      return
    }
    
    console.log(`📊 総ユーザー数: ${allUsers.users.length}`)
    
    // 2. ターゲットメールの状態を確認
    console.log('\n🎯 ターゲットメールアドレスの状態:')
    for (const email of TARGET_EMAILS) {
      console.log(`\n📧 ${email}:`)
      
      const user = allUsers.users.find(u => 
        u.email?.toLowerCase() === email.toLowerCase()
      )
      
      if (user) {
        console.log(`  ✅ ユーザーが存在します`)
        console.log(`  - ID: ${user.id}`)
        console.log(`  - 作成日: ${user.created_at}`)
        console.log(`  - 確認済み: ${user.confirmed_at ? 'はい' : 'いいえ'}`)
        console.log(`  - 削除済み: ${user.deleted_at ? `はい (${user.deleted_at})` : 'いいえ'}`)
        console.log(`  - メタデータ:`, JSON.stringify(user.user_metadata, null, 2))
      } else {
        console.log(`  ❌ ユーザーが見つかりません`)
      }
      
      // GetUserByEmailでも確認
      const { data: userByEmail, error: emailError } = await supabase.auth.admin.getUserByEmail(email)
      
      if (userByEmail && !emailError) {
        console.log(`  📌 getUserByEmail: 見つかりました (ID: ${userByEmail.user.id})`)
      } else {
        console.log(`  📌 getUserByEmail: 見つかりません`)
      }
    }
    
    // 3. 削除済みユーザーの統計
    const deletedUsers = allUsers.users.filter(u => u.deleted_at)
    console.log(`\n🗑️ 削除済みユーザー数: ${deletedUsers.length}`)
    
    if (deletedUsers.length > 0) {
      console.log('\n削除済みユーザーのリスト:')
      deletedUsers.forEach(user => {
        console.log(`  - ${user.email} (削除日: ${user.deleted_at})`)
      })
    }
    
    // 4. プロフィールテーブルとの整合性確認
    console.log('\n🔗 プロフィールテーブルとの整合性確認:')
    for (const email of TARGET_EMAILS) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
      
      if (profileError) {
        console.log(`  ❌ ${email}: プロフィール取得エラー - ${profileError.message}`)
      } else if (profiles && profiles.length > 0) {
        console.log(`  ✅ ${email}: ${profiles.length}件のプロフィールが存在`)
        profiles.forEach(p => {
          console.log(`     - ID: ${p.id}, 名前: ${p.name}`)
        })
      } else {
        console.log(`  ⚠️ ${email}: プロフィールなし`)
      }
    }
    
    // 5. 推奨アクション
    console.log('\n💡 推奨アクション:')
    const problematicUsers = allUsers.users.filter(u => 
      u.email && TARGET_EMAILS.includes(u.email.toLowerCase()) && u.deleted_at
    )
    
    if (problematicUsers.length > 0) {
      console.log('以下のユーザーはソフトデリートされています。ハードデリートが必要です:')
      problematicUsers.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id})`)
      })
      console.log('\n実行コマンド: npm run users:hard-delete')
    } else {
      console.log('特に問題は見つかりませんでした。')
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  }
}

// SQL直接実行での確認（オプション）
async function checkWithSQL() {
  console.log('\n\n📝 SQL直接実行での確認:')
  console.log('以下のSQLをSupabase SQL Editorで実行してください:\n')
  
  console.log(`-- auth.usersテーブルの確認
SELECT 
    id,
    email,
    created_at,
    confirmed_at,
    deleted_at,
    raw_user_meta_data
FROM auth.users 
WHERE lower(email) IN (${TARGET_EMAILS.map(e => `'${e.toLowerCase()}'`).join(', ')});

-- auth.identitiesテーブルの確認  
SELECT 
    id,
    user_id,
    identity_data->>'email' as email,
    provider,
    created_at
FROM auth.identities 
WHERE lower(identity_data->>'email') IN (${TARGET_EMAILS.map(e => `'${e.toLowerCase()}'`).join(', ')});`)
}

// メイン実行
async function main() {
  await checkAuthUsers()
  await checkWithSQL()
}

main()