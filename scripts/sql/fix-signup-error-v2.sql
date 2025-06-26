-- Supabaseサインアップエラー修正SQL（正しいカラム名版）
-- 実行日: 2025-06-27

-- 1. profilesテーブルのカラムを確認
SELECT 
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. トリガー関数の修正（正しいカラム名でINSERT）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- デバッグ用ログ
  RAISE NOTICE 'handle_new_user triggered for user %', NEW.id;
  RAISE NOTICE 'raw_user_meta_data: %', NEW.raw_user_meta_data;
  
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    grade,
    introduce,
    bio,
    current_school,
    target_school
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'grade' IS NULL THEN NULL
      WHEN NEW.raw_user_meta_data->>'grade' = '' THEN NULL
      WHEN NEW.raw_user_meta_data->>'grade' ~ '^\d+$' THEN (NEW.raw_user_meta_data->>'grade')::int
      ELSE NULL
    END,
    '', -- introduce
    '', -- bio
    NULL, -- current_school
    NULL  -- target_school
  )
  ON CONFLICT (id) DO NOTHING; -- 既存のレコードがある場合はスキップ
  
  RAISE NOTICE 'Profile created successfully';
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
  RAISE;
END;
$$;

-- 3. RLSポリシー確認・修正
-- 既存のポリシーを削除
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 新しいINSERTポリシーを作成
CREATE POLICY profiles_insert_own 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- SELECTポリシーも確認
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own 
  ON public.profiles 
  FOR SELECT 
  USING (id = auth.uid());

-- UPDATEポリシーも確認
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own 
  ON public.profiles 
  FOR UPDATE 
  USING (id = auth.uid());

-- 4. RLSが有効になっているか確認
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. トリガーが正しく設定されているか確認
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 6. 現在のRLSポリシーを表示
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