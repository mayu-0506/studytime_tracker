-- Supabaseサインアップエラー修正SQL
-- 実行日: 2025-06-27

-- 1. profilesテーブルの制約を緩和
ALTER TABLE public.profiles 
  ALTER COLUMN grade DROP NOT NULL,
  ALTER COLUMN current_school DROP NOT NULL,
  ALTER COLUMN target_school DROP NOT NULL;

-- 2. トリガー関数の修正（正しいカラム名とSECURITY DEFINER）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    grade,
    introduce,
    bio
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'grade' IS NULL THEN NULL
      WHEN NEW.raw_user_meta_data->>'grade' = '' THEN NULL
      ELSE (NEW.raw_user_meta_data->>'grade')::int
    END,
    '',
    ''
  );
  RETURN NEW;
END;
$$;

-- 3. RLSポリシー確認・修正
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- 4. 既存のポリシーを確認（デバッグ用）
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'profiles';