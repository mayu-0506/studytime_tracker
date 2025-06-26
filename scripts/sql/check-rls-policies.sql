-- RLSポリシーの確認と診断
-- 実行日: 2025-06-27

-- 1. profilesテーブルの現在のRLSポリシーを確認
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
WHERE tablename = 'profiles'
ORDER BY cmd;

-- 2. RLSが有効になっているか確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- 3. トリガーの状態を確認
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth';

-- 4. handle_new_user関数の存在確認
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 5. profilesテーブルの制約を確認
SELECT 
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;