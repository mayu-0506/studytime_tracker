-- profilesテーブルのスキーマを拡張
-- 既存のテーブルがある場合は、新しいカラムを追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS grade text,
ADD COLUMN IF NOT EXISTS target_school text,
ADD COLUMN IF NOT EXISTS current_school text,
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- profilesテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text,
  introduce text,
  avatar_url text,
  grade text,
  target_school text,
  current_school text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを作成
-- ユーザーは自分のプロフィールのみ参照可能
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- ユーザーは自分のプロフィールのみ更新可能
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ユーザーは自分のプロフィールを作成可能
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- auth.usersの変更を監視して自動的にprofilesにエントリを作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE 
      WHEN profiles.name = '' OR profiles.name IS NULL 
      THEN COALESCE(EXCLUDED.name, profiles.name)
      ELSE profiles.name
    END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの作成（既存の場合は削除して再作成）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 既存のauth.usersのデータをprofilesテーブルに移行
INSERT INTO profiles (id, email, name, introduce, grade, target_school, current_school, avatar_url)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'name', email),
  raw_user_meta_data->>'bio',
  raw_user_meta_data->>'grade',
  raw_user_meta_data->>'target_school',
  raw_user_meta_data->>'current_school',
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'profile_image')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  name = CASE 
    WHEN profiles.name = '' OR profiles.name IS NULL 
    THEN EXCLUDED.name 
    ELSE profiles.name 
  END,
  introduce = COALESCE(profiles.introduce, EXCLUDED.introduce),
  grade = COALESCE(profiles.grade, EXCLUDED.grade),
  target_school = COALESCE(profiles.target_school, EXCLUDED.target_school),
  current_school = COALESCE(profiles.current_school, EXCLUDED.current_school),
  avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);

-- updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガーの作成
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();