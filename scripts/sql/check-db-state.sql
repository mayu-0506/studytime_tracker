-- Study Time Tracker - データベース状態確認スクリプト

-- 1. 現在のユーザーを確認
SELECT auth.uid() as current_user_id, auth.email() as current_user_email;

-- 2. テーブルの存在確認
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('custom_subjects', 'study_sessions', 'subjects', 'profiles')
ORDER BY tablename;

-- 3. custom_subjectsテーブルの構造確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'custom_subjects'
ORDER BY ordinal_position;

-- 4. study_sessionsテーブルの構造確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'study_sessions'
ORDER BY ordinal_position;

-- 5. ENUM型の確認
SELECT 
    n.nspname as schema,
    t.typname as name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'preset_subject'
GROUP BY n.nspname, t.typname;

-- 6. RLSポリシーの確認
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
WHERE tablename IN ('custom_subjects', 'study_sessions')
ORDER BY tablename, policyname;

-- 7. カスタム科目のサンプルデータ（現在のユーザー）
SELECT * FROM custom_subjects WHERE user_id = auth.uid() LIMIT 5;

-- 8. 最新のセッションデータ（現在のユーザー）
SELECT 
    s.id,
    s.preset_subject,
    s.custom_subject_id,
    cs.name as custom_subject_name,
    s.start_time,
    s.end_time,
    s.duration_min,
    s.source
FROM study_sessions s
LEFT JOIN custom_subjects cs ON s.custom_subject_id = cs.id
WHERE s.user_id = auth.uid()
ORDER BY s.created_at DESC
LIMIT 10;

-- 9. 権限の確認
SELECT 
    has_table_privilege(auth.uid(), 'public.custom_subjects', 'SELECT') as can_select,
    has_table_privilege(auth.uid(), 'public.custom_subjects', 'INSERT') as can_insert,
    has_table_privilege(auth.uid(), 'public.custom_subjects', 'UPDATE') as can_update,
    has_table_privilege(auth.uid(), 'public.custom_subjects', 'DELETE') as can_delete;

-- 10. RLSが有効かどうか確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('custom_subjects', 'study_sessions');

-- 11. カスタム科目の挿入テスト（実行後は削除してください）
-- INSERT INTO custom_subjects (user_id, name, color_hex)
-- VALUES (auth.uid(), 'SQLテスト科目', '#FF0000')
-- RETURNING *;