#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// コマンドライン引数からメールアドレスを取得
const targetEmail = process.argv[2]

if (!targetEmail) {
  console.error('❌ メールアドレスを指定してください')
  console.error('使用方法: npm run users:check:one -- your@email.com')
  process.exit(1)
}

async function checkSpecificUser(email: string) {
  console.log(`🔍 ${email} の状態を確認中...\n`)
  
  try {
    // 1. getUserByEmailで確認
    const { data: userByEmail, error: emailError } = await supabase.auth.admin.getUserByEmail(email)
    
    if (userByEmail) {
      const user = userByEmail.user
      console.log('✅ ユーザーが見つかりました:')
      console.log(`  - ID: ${user.id}`)
      console.log(`  - Email: ${user.email}`)
      console.log(`  - 作成日: ${user.created_at}`)
      console.log(`  - 確認済み: ${user.confirmed_at ? 'はい' : 'いいえ'}`)
      console.log(`  - 削除済み: ${user.deleted_at ? `はい (${user.deleted_at})` : 'いいえ'}`)
      console.log(`  - identities: ${user.identities?.length || 0}個`)
      
      if (user.deleted_at) {
        console.log('\n⚠️  このユーザーはソフトデリートされています！')
        console.log('同じメールアドレスで再登録するには、ハードデリートが必要です。')
      }
      
      // プロフィールも確認
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        console.log('\n📋 プロフィール情報:')
        console.log(`  - 名前: ${profile.name}`)
        console.log(`  - 作成日: ${profile.created_at}`)
      } else {
        console.log('\n⚠️  プロフィールが見つかりません')
      }
      
      return user
    } else {
      console.log('❌ ユーザーが見つかりません')
      console.log('このメールアドレスは登録可能です。')
      return null
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    return null
  }
}

// メイン実行
async function main() {
  const user = await checkSpecificUser(targetEmail)
  
  if (user && user.deleted_at) {
    console.log('\n💡 推奨アクション:')
    console.log('以下のコマンドでこのユーザーをハードデリートできます:')
    console.log(`npm run users:hard-delete:one -- ${targetEmail}`)
  }
}

main()