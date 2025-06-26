-- 問題のあるユーザーのデータを初期化するSQLスクリプト
-- Supabase SQL Editorで実行してください

-- 対象ユーザーのauth.users IDを取得（実行前に確認）
SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com');

-- プロフィールデータを削除
DELETE FROM public.profiles 
WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
   OR id IN (
     SELECT id FROM auth.users 
     WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
   );

-- 科目データを削除
DELETE FROM public.subjects 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
);

-- 学習セッションデータを削除（もしテーブルが存在する場合）
-- DELETE FROM public.study_sessions 
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
-- );

-- user_metadataをクリア（auth.usersの更新）
UPDATE auth.users 
SET raw_user_meta_data = '{}'::jsonb
WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com');

-- 確認：削除後の状態
SELECT 'Profiles' as table_name, COUNT(*) as remaining_count 
FROM public.profiles 
WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
UNION ALL
SELECT 'Subjects', COUNT(*) 
FROM public.subjects 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
);

-- Storage内の画像は管理画面から手動で削除するか、
-- TypeScriptスクリプト（reset-problem-users.ts）を使用してください