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
  console.error('使用方法: npm run users:hard-delete:one -- your@email.com')
  process.exit(1)
}

async function hardDeleteSpecificUser(email: string) {
  console.log(`🗑️ ${email} のハードデリートを開始します...\n`)
  
  try {
    // 1. ユーザーを検索
    const { data: userData, error: searchError } = await supabase.auth.admin.getUserByEmail(email)
    
    if (searchError || !userData) {
      console.log('❌ ユーザーが見つかりません')
      return
    }
    
    const user = userData.user
    console.log('✅ ユーザーが見つかりました:')
    console.log(`  - ID: ${user.id}`)
    console.log(`  - Email: ${user.email}`)
    console.log(`  - 削除済み: ${user.deleted_at ? 'はい' : 'いいえ'}`)
    
    if (!user.deleted_at) {
      console.log('\n⚠️  警告: このユーザーはまだアクティブです！')
      console.log('本当に削除しますか？（5秒後に続行します...）')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    
    // 2. 関連データを削除
    console.log('\n🧹 関連データを削除中...')
    
    // profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id)
      .select()
    console.log(`  ✅ profiles: ${profileData?.length || 0}件削除`)
    
    // subjects
    const { data: subjectsData } = await supabase
      .from('subjects')
      .delete()
      .eq('user_id', user.id)
      .select()
    console.log(`  ✅ subjects: ${subjectsData?.length || 0}件削除`)
    
    // study_sessions（存在する場合）
    try {
      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .delete()
        .eq('user_id', user.id)
        .select()
      console.log(`  ✅ study_sessions: ${sessionsData?.length || 0}件削除`)
    } catch (e) {
      // テーブルが存在しない場合は無視
    }
    
    // Storage内の画像
    const { data: files } = await supabase
      .storage
      .from('profile')
      .list(user.id)
    
    if (files && files.length > 0) {
      const filePaths = files.map(file => `${user.id}/${file.name}`)
      await supabase.storage.from('profile').remove(filePaths)
      console.log(`  ✅ Storage: ${files.length}個のファイルを削除`)
    }
    
    // 3. ユーザーをハードデリート
    console.log('\n🔥 ユーザーをハードデリート中...')
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id,
      false // shouldSoftDelete = false でハードデリート
    )
    
    if (deleteError) {
      console.error('❌ ハードデリートに失敗しました:', deleteError.message)
      return
    }
    
    console.log('✅ ハードデリートが完了しました！')
    
    // 4. 確認
    console.log('\n🔍 削除を確認中...')
    const { data: checkUser } = await supabase.auth.admin.getUserByEmail(email)
    
    if (!checkUser) {
      console.log('✅ ユーザーは完全に削除されました')
      console.log(`📧 ${email} は再登録可能になりました`)
    } else {
      console.log('❌ ユーザーがまだ存在します')
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  }
}

// メイン実行
hardDeleteSpecificUser(targetEmail)