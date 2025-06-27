-- Study Time Tracker - タイマー機能の問題解決SQL

-- ========================================
-- 1. 現在の状態を確認
-- ========================================

-- ENUM型の存在確認
SELECT EXISTS (
    SELECT 1 
    FROM pg_type 
    WHERE typname = 'preset_subject'
) as enum_exists;

-- ENUM型の値を確認
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'preset_subject')
ORDER BY enumsortorder;

-- study_sessionsテーブルの構造確認
\d study_sessions

-- ========================================
-- 2. 問題の修正
-- ========================================

-- ENUM型が存在しない場合は作成
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preset_subject') THEN
        CREATE TYPE preset_subject AS ENUM ('数学', '英語', '国語', '理科', '社会', 'その他');
    END IF;
END$$;

-- study_sessionsテーブルに必要なカラムを追加
ALTER TABLE study_sessions 
  ADD COLUMN IF NOT EXISTS preset_subject preset_subject,
  ADD COLUMN IF NOT EXISTS custom_subject_id UUID REFERENCES custom_subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_min INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT;

-- sourceカラムに制約を追加（既存の制約がある場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'study_sessions_source_check'
    ) THEN
        ALTER TABLE study_sessions 
        ADD CONSTRAINT study_sessions_source_check 
        CHECK (source IN ('timer', 'manual'));
    END IF;
END$$;

-- custom_subjectsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS custom_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- ========================================
-- 3. RLSポリシーの設定
-- ========================================

-- RLSを有効化
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_subjects ENABLE ROW LEVEL SECURITY;

-- study_sessionsのRLSポリシー（既存のポリシーを削除して再作成）
DROP POLICY IF EXISTS "Users can view own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can create own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can update own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can delete own study sessions" ON study_sessions;

CREATE POLICY "Users can view own study sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions" ON study_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- custom_subjectsのRLSポリシー（既存のポリシーを削除して再作成）
DROP POLICY IF EXISTS "Users can view own custom subjects" ON custom_subjects;
DROP POLICY IF EXISTS "Users can create own custom subjects" ON custom_subjects;
DROP POLICY IF EXISTS "Users can update own custom subjects" ON custom_subjects;
DROP POLICY IF EXISTS "Users can delete own custom subjects" ON custom_subjects;

CREATE POLICY "Users can view own custom subjects" ON custom_subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own custom subjects" ON custom_subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom subjects" ON custom_subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom subjects" ON custom_subjects
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 4. インデックスの作成（パフォーマンス改善）
-- ========================================

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_preset_subject ON study_sessions(preset_subject);
CREATE INDEX IF NOT EXISTS idx_study_sessions_custom_subject_id ON study_sessions(custom_subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_custom_subjects_user_id ON custom_subjects(user_id);

-- ========================================
-- 5. 権限の確認
-- ========================================

-- anon ロールに必要な権限を付与
GRANT SELECT, INSERT, UPDATE, DELETE ON study_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_subjects TO anon;

-- authenticated ロールに必要な権限を付与
GRANT SELECT, INSERT, UPDATE, DELETE ON study_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_subjects TO authenticated;

-- ========================================
-- 6. テストクエリ（手動で実行）
-- ========================================

-- 現在のユーザーでテスト挿入（実行後は削除してください）
/*
-- プリセット科目のテスト
INSERT INTO study_sessions (user_id, preset_subject, start_time, source)
VALUES (auth.uid(), '数学', NOW(), 'timer')
RETURNING *;

-- カスタム科目のテスト（まずカスタム科目を作成）
WITH new_subject AS (
  INSERT INTO custom_subjects (user_id, name, color_hex)
  VALUES (auth.uid(), 'テスト科目', '#FF0000')
  RETURNING id
)
INSERT INTO study_sessions (user_id, custom_subject_id, start_time, source)
SELECT auth.uid(), id, NOW(), 'timer'
FROM new_subject
RETURNING *;
*/

-- ========================================
-- 7. 最終確認
-- ========================================

-- テーブル構造の最終確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'study_sessions'
ORDER BY ordinal_position;

-- RLSポリシーの確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('study_sessions', 'custom_subjects')
ORDER BY tablename, policyname;