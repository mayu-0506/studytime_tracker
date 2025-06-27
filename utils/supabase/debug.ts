import { createClient } from './client'

/**
 * Supabaseクライアントの診断機能
 * 認証状態とテーブルへのアクセス権限を確認
 */
export const debugSupabase = async () => {
  console.log('=== Supabase診断開始 ===')
  
  const supabase = createClient()
  
  // 1. 認証状態の確認
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('認証ユーザー:', user ? { id: user.id, email: user.email } : 'null')
  if (authError) {
    console.error('認証エラー:', authError)
  }
  
  // 2. テーブルアクセステスト
  const tests = [
    { table: 'profiles', operation: 'select' },
    { table: 'custom_subjects', operation: 'select' },
    { table: 'custom_subjects', operation: 'insert' },
    { table: 'study_sessions', operation: 'select' },
    { table: 'study_sessions', operation: 'insert' },
    { table: 'subjects', operation: 'select' } // 旧テーブル
  ]
  
  console.log('\n=== テーブルアクセステスト ===')
  for (const test of tests) {
    try {
      if (test.operation === 'select') {
        const { error } = await supabase.from(test.table).select('*').limit(1)
        console.log(`${test.table} SELECT:`, error ? `❌ ${error.message}` : '✅ OK')
      }
    } catch (e: any) {
      console.log(`${test.table} ${test.operation}: ❌`, e.message)
    }
  }
  
  // 3. custom_subjectsテーブルの詳細確認
  console.log('\n=== custom_subjectsテーブル詳細 ===')
  const { data: customSubjects, error: customError } = await supabase
    .from('custom_subjects')
    .select('*')
  
  if (customError) {
    console.error('custom_subjects取得エラー:', {
      message: customError.message,
      details: customError.details,
      hint: customError.hint,
      code: customError.code
    })
  } else {
    console.log('custom_subjects件数:', customSubjects?.length || 0)
    if (customSubjects && customSubjects.length > 0) {
      console.log('サンプルデータ:', customSubjects[0])
    }
  }
  
  // 4. study_sessionsテーブルの詳細確認
  console.log('\n=== study_sessionsテーブル詳細 ===')
  const { data: sessions, error: sessionError } = await supabase
    .from('study_sessions')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false })
  
  if (sessionError) {
    console.error('study_sessions取得エラー:', {
      message: sessionError.message,
      details: sessionError.details,
      hint: sessionError.hint,
      code: sessionError.code
    })
  } else {
    console.log('study_sessions件数:', sessions?.length || 0)
    if (sessions && sessions.length > 0) {
      console.log('最新セッション:', sessions[0])
      // 新しいカラムの存在確認
      const sample = sessions[0]
      console.log('カラム確認:', {
        preset_subject: 'preset_subject' in sample,
        custom_subject_id: 'custom_subject_id' in sample,
        duration_min: 'duration_min' in sample,
        source: 'source' in sample
      })
    }
  }
  
  console.log('\n=== Supabase診断完了 ===')
}

// カスタム科目の挿入テスト
export const testCustomSubjectInsert = async (name: string = 'テスト科目', color: string = '#FF0000') => {
  console.log('=== カスタム科目挿入テスト ===')
  
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('ユーザーが認証されていません')
    return
  }
  
  const { data, error } = await supabase
    .from('custom_subjects')
    .insert({
      user_id: user.id,
      name: name,
      color_hex: color
    })
    .select()
  
  if (error) {
    console.error('挿入エラー:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
  } else {
    console.log('挿入成功:', data)
  }
}