import { createClient } from './client'
import { PresetSubject } from '@/types/database'

/**
 * geminiと協力して外部キー制約エラーを診断
 */
export const diagnoseWithGemini = async (subjectId: string) => {
  console.log('🤖 === Gemini診断モード開始 ===')
  console.log('選択された科目ID:', subjectId)
  
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('❌ ユーザーが認証されていません')
    return
  }
  
  console.log('\n📋 ステップ1: 科目タイプの判定')
  const isPreset = subjectId.startsWith('preset_')
  console.log('科目タイプ:', isPreset ? 'プリセット科目' : 'カスタム科目')
  
  if (isPreset) {
    // プリセット科目の診断
    console.log('\n📋 ステップ2: プリセット科目の診断')
    const presetKey = subjectId.replace('preset_', '')
    console.log('プリセット科目名:', presetKey)
    
    // 旧subjectsテーブルの確認
    const { data: oldSubjects, error: oldError } = await supabase
      .from('subjects')
      .select('id, name, color')
      .is('user_id', null)
    
    console.log('\n🔍 旧subjectsテーブルのプリセット科目:')
    if (oldError) {
      console.error('❌ エラー:', oldError)
    } else {
      console.table(oldSubjects)
      const exists = oldSubjects?.some(s => s.name === presetKey)
      if (!exists) {
        console.error(`❌ プリセット科目「${presetKey}」が旧subjectsテーブルに存在しません`)
        console.log('💡 解決策: Supabaseでプリセット科目を挿入してください')
      }
    }
    
  } else {
    // カスタム科目の診断
    console.log('\n📋 ステップ2: カスタム科目の診断')
    
    // custom_subjectsテーブルの確認
    const { data: customSubject, error: customError } = await supabase
      .from('custom_subjects')
      .select('*')
      .eq('id', subjectId)
      .single()
    
    if (customError) {
      console.error('❌ カスタム科目取得エラー:', customError)
      
      // すべてのカスタム科目を表示
      const { data: allCustom } = await supabase
        .from('custom_subjects')
        .select('id, name, user_id')
        .eq('user_id', user.id)
      
      console.log('\n🔍 あなたのカスタム科目一覧:')
      console.table(allCustom)
      
      console.log('\n💡 問題の可能性:')
      console.log('1. 科目IDが間違っている')
      console.log('2. 他のユーザーの科目を参照している')
      console.log('3. 科目が削除されている')
      
    } else {
      console.log('✅ カスタム科目が見つかりました:', customSubject)
    }
  }
  
  // 外部キー制約の確認
  console.log('\n📋 ステップ3: 外部キー制約の確認')
  const { data: constraints, error: constraintError } = await supabase
    .rpc('get_foreign_keys', { table_name: 'study_sessions' })
    .catch(() => ({ data: null, error: 'RPC not available' }))
  
  if (constraintError) {
    console.log('⚠️ 外部キー制約の確認ができません（RPCが利用不可）')
  } else {
    console.log('外部キー制約:', constraints)
  }
  
  // テスト挿入の詳細診断
  console.log('\n📋 ステップ4: テスト挿入の詳細診断')
  
  const testData: any = {
    user_id: user.id,
    start_time: new Date().toISOString(),
    source: 'timer'
  }
  
  if (isPreset) {
    testData.preset_subject = subjectId.replace('preset_', '')
    testData.custom_subject_id = null
    
    // 旧subject_idも設定
    const { data: oldSubject } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', testData.preset_subject)
      .is('user_id', null)
      .single()
    
    testData.subject_id = oldSubject?.id || crypto.randomUUID()
  } else {
    testData.preset_subject = null
    testData.custom_subject_id = subjectId
    testData.subject_id = subjectId
  }
  
  console.log('テスト挿入データ:', JSON.stringify(testData, null, 2))
  
  const { error: insertError } = await supabase
    .from('study_sessions')
    .insert(testData)
  
  if (insertError) {
    console.error('\n❌ 挿入エラーの詳細:')
    console.error('メッセージ:', insertError.message)
    console.error('詳細:', insertError.details)
    console.error('ヒント:', insertError.hint)
    console.error('コード:', insertError.code)
    
    if (insertError.message.includes('foreign key constraint')) {
      console.log('\n🔧 外部キー制約エラーの解決方法:')
      console.log('1. custom_subjectsテーブルにデータが存在することを確認')
      console.log('2. 外部キー制約を一時的に無効化')
      console.log('3. または、外部キー制約を削除')
    }
  } else {
    console.log('✅ テスト挿入成功！問題は解決されているようです。')
  }
  
  console.log('\n🤖 === Gemini診断完了 ===')
}

/**
 * 外部キー制約を修正するSQL生成
 */
export const generateFixSQL = (isPreset: boolean) => {
  if (isPreset) {
    return `
-- プリセット科目の挿入
INSERT INTO subjects (id, name, color, user_id) VALUES
(gen_random_uuid(), '数学', '#4ECDC4', NULL),
(gen_random_uuid(), '英語', '#45B7D1', NULL),
(gen_random_uuid(), '国語', '#FF6B6B', NULL),
(gen_random_uuid(), '理科', '#96CEB4', NULL),
(gen_random_uuid(), '社会', '#F4A460', NULL),
(gen_random_uuid(), 'その他', '#95A5A6', NULL)
ON CONFLICT DO NOTHING;

-- subject_idをNULL許可に
ALTER TABLE study_sessions 
ALTER COLUMN subject_id DROP NOT NULL;
    `
  } else {
    return `
-- 外部キー制約を一時的に削除
ALTER TABLE study_sessions
DROP CONSTRAINT IF EXISTS study_sessions_custom_subject_id_fkey;

-- 外部キー制約を再作成（ON DELETE SET NULL付き）
ALTER TABLE study_sessions
ADD CONSTRAINT study_sessions_custom_subject_id_fkey
FOREIGN KEY (custom_subject_id) 
REFERENCES custom_subjects(id) 
ON DELETE SET NULL;

-- custom_subject_idをNULL許可に
ALTER TABLE study_sessions
ALTER COLUMN custom_subject_id DROP NOT NULL;
    `
  }
}