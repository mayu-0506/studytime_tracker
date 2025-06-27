-- Study Time Tracker - 外部キー制約エラーの緊急修正

-- ========================================
-- Gemini診断結果に基づく修正
-- ========================================

-- 1. 現在の外部キー制約を確認
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'study_sessions';

-- 2. プリセット科目を旧subjectsテーブルに挿入（必須）
INSERT INTO subjects (id, name, color, user_id, created_at) VALUES
(gen_random_uuid(), '数学', '#4ECDC4', NULL, NOW()),
(gen_random_uuid(), '英語', '#45B7D1', NULL, NOW()),
(gen_random_uuid(), '国語', '#FF6B6B', NULL, NOW()),
(gen_random_uuid(), '理科', '#96CEB4', NULL, NOW()),
(gen_random_uuid(), '社会', '#F4A460', NULL, NOW()),
(gen_random_uuid(), 'その他', '#95A5A6', NULL, NOW())
ON CONFLICT DO NOTHING;

-- 挿入結果を確認
SELECT id, name, color FROM subjects WHERE user_id IS NULL ORDER BY name;

-- 3. subject_idカラムの制約を緩和
ALTER TABLE study_sessions 
ALTER COLUMN subject_id DROP NOT NULL;

-- 4. custom_subject_idの外部キー制約を修正
-- 既存の制約を削除
ALTER TABLE study_sessions
DROP CONSTRAINT IF EXISTS study_sessions_custom_subject_id_fkey;

-- 新しい制約を追加（削除時にNULLを設定）
ALTER TABLE study_sessions
ADD CONSTRAINT study_sessions_custom_subject_id_fkey
FOREIGN KEY (custom_subject_id) 
REFERENCES custom_subjects(id) 
ON DELETE SET NULL;

-- 5. テスト: プリセット科目でセッション作成
-- 数学のIDを取得してテスト
DO $$
DECLARE
    math_subject_id UUID;
BEGIN
    SELECT id INTO math_subject_id FROM subjects WHERE name = '数学' AND user_id IS NULL LIMIT 1;
    
    IF math_subject_id IS NOT NULL THEN
        -- テスト挿入
        INSERT INTO study_sessions (
            user_id, 
            subject_id, 
            preset_subject, 
            start_time, 
            source
        ) VALUES (
            auth.uid(), 
            math_subject_id, 
            '数学', 
            NOW(), 
            'timer'
        ) RETURNING id;
        
        RAISE NOTICE 'テスト挿入成功: 数学のsubject_id = %', math_subject_id;
    ELSE
        RAISE NOTICE '数学の科目が見つかりません';
    END IF;
END$$;

-- 6. カスタム科目の確認
SELECT 
    cs.id,
    cs.name,
    cs.user_id,
    cs.created_at
FROM custom_subjects cs
WHERE cs.user_id = auth.uid()
ORDER BY cs.created_at DESC;

-- 7. 最終確認: 制約の状態
SELECT 
    c.conname AS constraint_name,
    c.contype AS constraint_type,
    pg_catalog.pg_get_constraintdef(c.oid, true) AS definition
FROM pg_catalog.pg_constraint c
WHERE c.conrelid = 'study_sessions'::regclass
AND c.conname LIKE '%subject%';