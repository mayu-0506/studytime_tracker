-- Study Time Tracker - subject_id制約の修正

-- ========================================
-- 1. 現在のテーブル構造を確認
-- ========================================

-- study_sessionsテーブルのカラム情報を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'study_sessions'
AND column_name IN ('subject_id', 'preset_subject', 'custom_subject_id', 'user_id', 'start_time')
ORDER BY ordinal_position;

-- ========================================
-- 2. subject_idカラムの制約を確認
-- ========================================

-- NOT NULL制約の確認
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'study_sessions'::regclass
AND contype = 'c';  -- CHECK制約

-- ========================================
-- 3. subject_idカラムをNULL許可に変更
-- ========================================

-- subject_idカラムが存在し、NOT NULLの場合はNULL許可に変更
ALTER TABLE study_sessions 
ALTER COLUMN subject_id DROP NOT NULL;

-- ========================================
-- 4. 一時的な解決策：デフォルト値を設定
-- ========================================

-- または、一時的にデフォルト値を設定（プリセット科目「その他」のID）
-- まず「その他」のIDを取得
DO $$
DECLARE
    default_subject_id UUID;
BEGIN
    -- 旧subjectsテーブルから「その他」のIDを取得
    SELECT id INTO default_subject_id
    FROM subjects
    WHERE name = 'その他' AND user_id IS NULL
    LIMIT 1;
    
    -- デフォルト値として設定
    IF default_subject_id IS NOT NULL THEN
        EXECUTE format('ALTER TABLE study_sessions ALTER COLUMN subject_id SET DEFAULT %L', default_subject_id);
        RAISE NOTICE 'subject_idのデフォルト値を設定しました: %', default_subject_id;
    END IF;
END$$;

-- ========================================
-- 5. 既存データの確認
-- ========================================

-- subject_idがNULLのレコードを確認
SELECT COUNT(*) as null_subject_count
FROM study_sessions
WHERE subject_id IS NULL;

-- 新しいカラムを使用しているレコードを確認
SELECT 
    COUNT(*) as total_records,
    COUNT(subject_id) as with_subject_id,
    COUNT(preset_subject) as with_preset_subject,
    COUNT(custom_subject_id) as with_custom_subject_id
FROM study_sessions
WHERE created_at > NOW() - INTERVAL '7 days';

-- ========================================
-- 6. 推奨される長期的解決策
-- ========================================

-- オプション1: 移行期間が終わったらsubject_idカラムを削除
-- ALTER TABLE study_sessions DROP COLUMN subject_id;

-- オプション2: ビューを使って新旧両方の構造をサポート
CREATE OR REPLACE VIEW study_sessions_unified AS
SELECT 
    ss.*,
    COALESCE(
        ss.subject_id,
        ss.custom_subject_id,
        (SELECT id FROM subjects WHERE name = ss.preset_subject::text AND user_id IS NULL LIMIT 1)
    ) as unified_subject_id
FROM study_sessions ss;

-- ビューへのアクセス権限を設定
GRANT SELECT ON study_sessions_unified TO authenticated;

-- ========================================
-- 7. テスト用クエリ
-- ========================================

-- NULL値での挿入が可能か確認
-- INSERT INTO study_sessions (user_id, start_time, source, subject_id)
-- VALUES (auth.uid(), NOW(), 'timer', NULL)
-- RETURNING *;