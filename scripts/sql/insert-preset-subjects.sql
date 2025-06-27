-- Study Time Tracker - プリセット科目の初期データ挿入

-- ========================================
-- 1. 現在のプリセット科目を確認
-- ========================================

SELECT id, name, color, user_id 
FROM subjects 
WHERE user_id IS NULL
ORDER BY name;

-- ========================================
-- 2. プリセット科目を挿入（存在しない場合のみ）
-- ========================================

-- 各科目を個別に挿入（既存のものはスキップ）
INSERT INTO subjects (id, name, color, user_id) VALUES
(gen_random_uuid(), '数学', '#4ECDC4', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (id, name, color, user_id) VALUES
(gen_random_uuid(), '英語', '#45B7D1', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (id, name, color, user_id) VALUES
(gen_random_uuid(), '国語', '#FF6B6B', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (id, name, color, user_id) VALUES
(gen_random_uuid(), '理科', '#96CEB4', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (id, name, color, user_id) VALUES
(gen_random_uuid(), '社会', '#F4A460', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (id, name, color, user_id) VALUES
(gen_random_uuid(), 'その他', '#95A5A6', NULL)
ON CONFLICT DO NOTHING;

-- ========================================
-- 3. 挿入結果を確認
-- ========================================

SELECT id, name, color, user_id, created_at
FROM subjects 
WHERE user_id IS NULL
ORDER BY name;

-- ========================================
-- 4. study_sessionsのsubject_id制約を緩和
-- ========================================

-- NOT NULL制約を削除（エラーが出ても無視）
DO $$ 
BEGIN
    ALTER TABLE study_sessions ALTER COLUMN subject_id DROP NOT NULL;
    RAISE NOTICE 'subject_idのNOT NULL制約を削除しました';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'subject_idのNOT NULL制約の削除に失敗: %', SQLERRM;
END$$;

-- ========================================
-- 5. 移行用の更新クエリ（オプション）
-- ========================================

-- 既存のstudy_sessionsでsubject_idがNULLのレコードを更新
-- preset_subjectが設定されている場合、対応するsubject_idを設定
UPDATE study_sessions ss
SET subject_id = s.id
FROM subjects s
WHERE ss.preset_subject IS NOT NULL
AND s.name = ss.preset_subject::text
AND s.user_id IS NULL
AND ss.subject_id IS NULL;

-- 更新結果を確認
SELECT COUNT(*) as updated_count
FROM study_sessions
WHERE preset_subject IS NOT NULL
AND subject_id IS NOT NULL;