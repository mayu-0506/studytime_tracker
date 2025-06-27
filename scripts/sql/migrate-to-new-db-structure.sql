-- Study Time Tracker - 新DB構造への移行スクリプト
-- 実行前に必ずバックアップを取得してください

-- 1. ENUM型の作成
CREATE TYPE preset_subject AS ENUM ('数学', '英語', '国語', '理科', '社会', 'その他');

-- 2. custom_subjectsテーブルの作成
CREATE TABLE IF NOT EXISTS custom_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- RLSポリシーの設定
ALTER TABLE custom_subjects ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のカスタム科目のみ操作可能
CREATE POLICY "Users can view own custom subjects" ON custom_subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own custom subjects" ON custom_subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom subjects" ON custom_subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom subjects" ON custom_subjects
  FOR DELETE USING (auth.uid() = user_id);

-- 3. study_sessionsテーブルの新規カラム追加
ALTER TABLE study_sessions 
  ADD COLUMN IF NOT EXISTS preset_subject preset_subject,
  ADD COLUMN IF NOT EXISTS custom_subject_id UUID REFERENCES custom_subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_min INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('timer', 'manual'));

-- 4. 既存データの移行

-- 4.1 プリセット科目の判定と移行
UPDATE study_sessions ss
SET preset_subject = 
  CASE s.name
    WHEN '国語' THEN '国語'::preset_subject
    WHEN '数学' THEN '数学'::preset_subject
    WHEN '英語' THEN '英語'::preset_subject
    WHEN '理科' THEN '理科'::preset_subject
    WHEN '社会' THEN '社会'::preset_subject
    ELSE 'その他'::preset_subject
  END
FROM subjects s
WHERE ss.subject_id = s.id
  AND s.user_id IS NULL;

-- 4.2 カスタム科目をcustom_subjectsテーブルに移行
INSERT INTO custom_subjects (id, user_id, name, color_hex, created_at)
SELECT 
  s.id,
  s.user_id,
  s.name,
  COALESCE(s.color, '#95A5A6'),
  COALESCE(s.created_at, NOW())
FROM subjects s
WHERE s.user_id IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

-- 4.3 カスタム科目のstudy_sessionsを更新
UPDATE study_sessions ss
SET custom_subject_id = s.id
FROM subjects s
WHERE ss.subject_id = s.id
  AND s.user_id IS NOT NULL;

-- 4.4 duration_minの移行（既存のdurationから）
UPDATE study_sessions
SET duration_min = duration
WHERE duration IS NOT NULL;

-- 4.5 sourceの設定（既存データはすべてtimerとして扱う）
UPDATE study_sessions
SET source = 'timer'
WHERE source IS NULL;

-- 5. インデックスの追加（パフォーマンス改善）
CREATE INDEX IF NOT EXISTS idx_study_sessions_preset_subject ON study_sessions(preset_subject);
CREATE INDEX IF NOT EXISTS idx_study_sessions_custom_subject_id ON study_sessions(custom_subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id_start_time ON study_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_custom_subjects_user_id ON custom_subjects(user_id);

-- 6. 既存のRPC関数を新しいものに置き換える
-- （dashboard-rpc-functions-v2.sqlを実行）

-- 7. 検証クエリ
-- 移行が正しく行われたか確認
SELECT 
  COUNT(*) as total_sessions,
  COUNT(preset_subject) as preset_count,
  COUNT(custom_subject_id) as custom_count,
  COUNT(subject_id) as old_subject_count,
  COUNT(duration_min) as duration_min_count
FROM study_sessions;

-- カスタム科目の移行状況
SELECT 
  COUNT(DISTINCT s.id) as original_custom_subjects,
  COUNT(DISTINCT cs.id) as migrated_custom_subjects
FROM subjects s
LEFT JOIN custom_subjects cs ON s.id = cs.id
WHERE s.user_id IS NOT NULL;

-- 注意事項：
-- 1. このスクリプトを実行する前に必ずデータベースのバックアップを取得してください
-- 2. 移行後は旧subject_idカラムは削除せず、互換性のために残しています
-- 3. アプリケーションコードを新しいDB構造に対応させてから、本番環境で実行してください