import { createClient } from './client'
import { PresetSubject } from '@/types/database'

/**
 * タイマー機能専用の詳細診断
 */
export const debugTimerSession = async () => {
  console.log('=== タイマーセッション診断開始 ===')
  console.log('geminiと一緒に問題を解決していきます...')
  
  const supabase = createClient()
  
  // 1. 認証状態の詳細確認
  console.log('\n--- 認証状態 ---')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('❌ 認証エラー:', authError)
    return
  }
  if (!user) {
    console.error('❌ ユーザーが認証されていません')
    return
  }
  console.log('✅ 認証ユーザー:', { id: user.id, email: user.email })
  
  // 2. study_sessionsテーブルの構造確認
  console.log('\n--- study_sessionsテーブル構造 ---')
  try {
    // カラム情報を取得するためのダミークエリ
    const { data: dummyData, error: structError } = await supabase
      .from('study_sessions')
      .select('*')
      .limit(0)
    
    if (structError) {
      console.error('❌ テーブル構造取得エラー:', structError)
    } else {
      console.log('✅ テーブルアクセス可能')
    }
  } catch (e) {
    console.error('❌ 予期しないエラー:', e)
  }
  
  // 3. ENUM型の値をテスト
  console.log('\n--- ENUM型テスト ---')
  const enumValues: PresetSubject[] = ['数学', '英語', '国語', '理科', '社会', 'その他']
  
  for (const enumValue of enumValues) {
    try {
      const testData = {
        user_id: user.id,
        preset_subject: enumValue,
        start_time: new Date().toISOString(),
        source: 'timer' as const
      }
      
      console.log(`\nテスト挿入 (${enumValue}):`, testData)
      
      const { data, error } = await supabase
        .from('study_sessions')
        .insert(testData)
        .select()
        .single()
      
      if (error) {
        console.error(`❌ ${enumValue} 挿入エラー:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      } else {
        console.log(`✅ ${enumValue} 挿入成功:`, data.id)
        // テストデータを削除
        await supabase.from('study_sessions').delete().eq('id', data.id)
      }
    } catch (e) {
      console.error(`❌ ${enumValue} 予期しないエラー:`, e)
    }
  }
  
  // 4. カスタム科目のテスト
  console.log('\n--- カスタム科目テスト ---')
  
  // まずカスタム科目を取得
  const { data: customSubjects, error: customError } = await supabase
    .from('custom_subjects')
    .select('*')
    .eq('user_id', user.id)
    .limit(1)
  
  if (customError) {
    console.error('❌ カスタム科目取得エラー:', customError)
  } else if (customSubjects && customSubjects.length > 0) {
    const customSubject = customSubjects[0]
    console.log('テスト用カスタム科目:', customSubject)
    
    const testData = {
      user_id: user.id,
      custom_subject_id: customSubject.id,
      start_time: new Date().toISOString(),
      source: 'timer' as const
    }
    
    console.log('カスタム科目テスト挿入:', testData)
    
    const { data, error } = await supabase
      .from('study_sessions')
      .insert(testData)
      .select()
      .single()
    
    if (error) {
      console.error('❌ カスタム科目セッション挿入エラー:', error)
    } else {
      console.log('✅ カスタム科目セッション挿入成功:', data.id)
      // テストデータを削除
      await supabase.from('study_sessions').delete().eq('id', data.id)
    }
  } else {
    console.log('⚠️ カスタム科目が存在しません')
  }
  
  // 5. RLSポリシーのテスト
  console.log('\n--- RLSポリシーテスト ---')
  
  // 他のユーザーのデータにアクセスできないことを確認
  const { data: allSessions, error: rlsError } = await supabase
    .from('study_sessions')
    .select('*')
    .limit(5)
  
  if (rlsError) {
    console.error('❌ RLS取得エラー:', rlsError)
  } else {
    console.log(`✅ 取得可能なセッション数: ${allSessions?.length || 0}`)
    if (allSessions && allSessions.length > 0) {
      const userIds = new Set(allSessions.map(s => s.user_id))
      console.log('ユーザーID一覧:', Array.from(userIds))
      if (userIds.size === 1 && userIds.has(user.id)) {
        console.log('✅ RLSが正しく動作しています（自分のデータのみ表示）')
      } else {
        console.error('❌ RLSエラー: 他のユーザーのデータが見えています')
      }
    }
  }
  
  // 6. sourceカラムの制約確認
  console.log('\n--- sourceカラム制約テスト ---')
  const invalidSourceData = {
    user_id: user.id,
    preset_subject: '数学' as PresetSubject,
    start_time: new Date().toISOString(),
    source: 'invalid_source' // 無効な値
  }
  
  const { error: sourceError } = await supabase
    .from('study_sessions')
    .insert(invalidSourceData as any)
  
  if (sourceError) {
    console.log('✅ source制約が正しく動作:', sourceError.message)
  } else {
    console.error('❌ source制約が機能していません')
  }
  
  console.log('\n=== タイマーセッション診断完了 ===')
}

/**
 * 科目IDの形式を検証
 */
export const validateSubjectId = (subjectId: string) => {
  console.log('科目ID検証:', subjectId)
  
  if (subjectId.startsWith('preset_')) {
    const presetKey = subjectId.replace('preset_', '')
    const validPresets = ['数学', '英語', '国語', '理科', '社会', 'その他']
    
    if (validPresets.includes(presetKey)) {
      console.log('✅ 有効なプリセット科目:', presetKey)
      return { valid: true, type: 'preset', value: presetKey }
    } else {
      console.error('❌ 無効なプリセット科目:', presetKey)
      return { valid: false, error: '無効なプリセット科目です' }
    }
  } else {
    // UUID形式の確認
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    
    if (uuidRegex.test(subjectId)) {
      console.log('✅ 有効なカスタム科目ID')
      return { valid: true, type: 'custom', value: subjectId }
    } else {
      console.error('❌ 無効なカスタム科目ID形式')
      return { valid: false, error: '無効なカスタム科目IDです' }
    }
  }
}