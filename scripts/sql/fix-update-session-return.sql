-- Supabaseのupdateが結果を返さない問題を解決するためのRLSポリシー確認

-- 現在のRLSポリシーを確認
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
ORDER BY policyname;

-- study_sessionsテーブルのRLS状態を確認
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'study_sessions';

-- 推奨: updateポリシーが結果を返すように修正
-- 注意: これは参考例です。実際のポリシーは環境に応じて調整してください

-- 1. 既存のupdateポリシーを確認
-- 2. 必要に応じて以下のようなポリシーを作成：
/*
CREATE POLICY "Users can update their own sessions with return" 
ON study_sessions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
RETURNING *;
*/

-- もしくは、RLSを一時的に無効化してテスト（本番環境では推奨しません）
-- ALTER TABLE study_sessions DISABLE ROW LEVEL SECURITY;