-- study_sessionsテーブルの調査SQL

-- 1. テーブルスキーマの確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'study_sessions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. インデックスの確認
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'study_sessions'
  AND schemaname = 'public';

-- 3. RLSポリシーの確認
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'study_sessions'
ORDER BY cmd;

-- 4. RLSが有効か確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'study_sessions';

-- 5. トリガーの確認
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'study_sessions';

-- 6. 最近のセッションデータを確認（問題調査用）
SELECT 
  id,
  user_id,
  subject_id,
  start_time,
  end_time,
  duration,
  created_at,
  CASE 
    WHEN end_time IS NULL THEN 'アクティブ'
    WHEN duration IS NULL THEN '終了したが時間記録なし'
    WHEN duration = 0 THEN '0分として記録'
    ELSE '正常終了'
  END as status
FROM study_sessions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;