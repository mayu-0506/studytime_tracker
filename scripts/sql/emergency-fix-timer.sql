-- Study Time Tracker - タイマー機能の緊急修正
-- ENUM型の問題を回避するための代替案

-- ========================================
-- オプション1: ENUM型を作成する（推奨）
-- ========================================

-- ENUM型が存在しない場合のみ作成
DO $$ 
BEGIN
    -- 既存のENUM型を確認
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preset_subject') THEN
        CREATE TYPE preset_subject AS ENUM ('数学', '英語', '国語', '理科', '社会', 'その他');
        RAISE NOTICE 'ENUM型 preset_subject を作成しました';
    ELSE
        RAISE NOTICE 'ENUM型 preset_subject は既に存在します';
    END IF;
END$$;

-- ========================================
-- オプション2: ENUM型の代わりにTEXT型を使用（回避策）
-- ========================================

-- 既存のカラムの型を確認
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'study_sessions'
AND column_name = 'preset_subject';

-- ENUM型が作成できない場合は、TEXT型に変更（実行前に確認！）
/*
-- 既存のpreset_subjectカラムを削除
ALTER TABLE study_sessions DROP COLUMN IF EXISTS preset_subject;

-- TEXT型で再作成し、制約を追加
ALTER TABLE study_sessions 
ADD COLUMN preset_subject TEXT,
ADD CONSTRAINT preset_subject_check 
CHECK (preset_subject IN ('数学', '英語', '国語', '理科', '社会', 'その他', NULL));
*/

-- ========================================
-- 必須カラムの確認と追加
-- ========================================

-- 必要なカラムを確認
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'study_sessions'
AND column_name IN ('preset_subject', 'custom_subject_id', 'duration_min', 'source', 'user_id', 'start_time')
ORDER BY ordinal_position;

-- 不足しているカラムを追加
ALTER TABLE study_sessions 
  ADD COLUMN IF NOT EXISTS custom_subject_id UUID REFERENCES custom_subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_min INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'timer';

-- sourceカラムの制約を追加
DO $$ 
BEGIN
    -- 既存の制約を削除
    ALTER TABLE study_sessions DROP CONSTRAINT IF EXISTS study_sessions_source_check;
    -- 新しい制約を追加
    ALTER TABLE study_sessions 
    ADD CONSTRAINT study_sessions_source_check 
    CHECK (source IN ('timer', 'manual') OR source IS NULL);
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'source制約の追加でエラー: %', SQLERRM;
END$$;

-- ========================================
-- custom_subjectsテーブルの作成
-- ========================================

CREATE TABLE IF NOT EXISTS custom_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- ========================================
-- RLSの設定（シンプル版）
-- ========================================

-- RLSを有効化
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_subjects ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON study_sessions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON custom_subjects;

-- シンプルなポリシーを作成（認証されたユーザーは自分のデータのみアクセス可能）
CREATE POLICY "Enable all access for authenticated users" ON study_sessions
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable all access for authenticated users" ON custom_subjects
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 権限の付与
-- ========================================

-- 必要な権限を付与
GRANT ALL ON study_sessions TO authenticated;
GRANT ALL ON custom_subjects TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- 動作確認用のテストクエリ
-- ========================================

-- 1. 現在のユーザーを確認
SELECT auth.uid() as user_id, auth.email() as email;

-- 2. 簡単なテスト挿入（プリセット科目）
INSERT INTO study_sessions (user_id, preset_subject, start_time, source)
VALUES (auth.uid(), '数学', NOW(), 'timer')
RETURNING id, preset_subject, start_time;

-- 3. 挿入したデータを確認
SELECT id, preset_subject, custom_subject_id, start_time, source
FROM study_sessions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- 4. テストデータを削除（必要に応じて）
-- DELETE FROM study_sessions WHERE user_id = auth.uid() AND source = 'timer' AND end_time IS NULL;