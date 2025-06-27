-- Study Time Tracker - スキーマキャッシュエラーの修正

-- ========================================
-- 1. 外部キー制約の確認
-- ========================================

-- 現在の外部キー制約を確認
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
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'study_sessions'
AND tc.table_schema = 'public';

-- ========================================
-- 2. custom_subjects外部キー制約の修正
-- ========================================

-- 既存の制約を削除（存在する場合）
DO $$ 
BEGIN
    -- 制約名を動的に取得して削除
    DECLARE
        constraint_name text;
    BEGIN
        SELECT tc.constraint_name INTO constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'study_sessions'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND EXISTS (
            SELECT 1 
            FROM information_schema.key_column_usage kcu
            WHERE kcu.constraint_name = tc.constraint_name
            AND kcu.column_name = 'custom_subject_id'
        );
        
        IF constraint_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE study_sessions DROP CONSTRAINT ' || constraint_name;
            RAISE NOTICE 'Dropped constraint: %', constraint_name;
        END IF;
    END;
END $$;

-- 新しい外部キー制約を追加
ALTER TABLE study_sessions
DROP CONSTRAINT IF EXISTS study_sessions_custom_subject_id_fkey;

ALTER TABLE study_sessions
ADD CONSTRAINT study_sessions_custom_subject_id_fkey
FOREIGN KEY (custom_subject_id) 
REFERENCES custom_subjects(id) 
ON DELETE SET NULL;

-- ========================================
-- 3. スキーマキャッシュのリフレッシュ
-- ========================================

-- PostgREST用のスキーマキャッシュをリフレッシュするシグナル
-- Supabaseの場合、以下のいずれかの方法でリフレッシュ可能：

-- 方法1: テーブルにダミーのコメントを追加（スキーマ変更として認識される）
COMMENT ON TABLE study_sessions IS 'Study sessions with timer and manual entries - updated';
COMMENT ON TABLE custom_subjects IS 'Custom subjects for study sessions - updated';

-- 方法2: ダミーカラムを追加して削除（強制的なスキーマ変更）
-- ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS _temp_refresh BOOLEAN DEFAULT false;
-- ALTER TABLE study_sessions DROP COLUMN IF EXISTS _temp_refresh;

-- ========================================
-- 4. 関連の確認用ビューを作成（オプション）
-- ========================================

CREATE OR REPLACE VIEW study_sessions_with_subjects AS
SELECT 
    ss.*,
    cs.name as custom_subject_name,
    cs.color_hex as custom_subject_color
FROM study_sessions ss
LEFT JOIN custom_subjects cs ON ss.custom_subject_id = cs.id
WHERE ss.user_id = auth.uid();

-- ビューへのアクセス権限を設定
GRANT SELECT ON study_sessions_with_subjects TO authenticated;

-- ========================================
-- 5. 動作確認用クエリ
-- ========================================

-- 外部キー制約が正しく設定されたか確認
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint
WHERE contype = 'f'
AND conrelid::regclass::text = 'study_sessions'
AND confrelid::regclass::text = 'custom_subjects';

-- テスト: JOINが動作するか確認
SELECT 
    ss.id,
    ss.preset_subject,
    ss.custom_subject_id,
    cs.name as custom_subject_name
FROM study_sessions ss
LEFT JOIN custom_subjects cs ON ss.custom_subject_id = cs.id
WHERE ss.user_id = auth.uid()
LIMIT 5;

-- ========================================
-- 6. Supabase Dashboard での追加作業
-- ========================================

-- 重要: 上記のSQLを実行後、以下を行ってください：
-- 1. Supabaseダッシュボードで「Database」→「Replication」を確認
-- 2. 必要に応じて「Reload Schema」ボタンをクリック
-- 3. またはプロジェクトを再起動（Settings → General → Restart project）