-- タイマー更新バグの調査SQL

-- 1. study_sessionsテーブルの正確なスキーマを確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'study_sessions' 
AND column_name IN ('end_time', 'duration', 'duration_min')
ORDER BY ordinal_position;

-- 2. 最近のセッションでend_timeがNULLのものを確認
SELECT 
    id,
    user_id,
    start_time,
    end_time,
    duration,
    duration_min,
    created_at,
    updated_at
FROM study_sessions
WHERE created_at > NOW() - INTERVAL '1 day'
AND end_time IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. RLSポリシーの確認
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'study_sessions'
AND cmd = 'UPDATE';

-- 4. トリガーの確認
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'study_sessions';

-- 5. 制約の確認
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'study_sessions'::regclass;