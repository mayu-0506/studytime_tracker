-- 現在のセッション状態を確認するデバッグSQL

-- 1. kyogobiz@gmail.comのユーザーIDを取得
SELECT id, email 
FROM auth.users 
WHERE email = 'kyogobiz@gmail.com';

-- 2. 進行中のセッション（end_timeがNULL）を確認
SELECT 
    s.id,
    s.user_id,
    s.subject_id,
    s.preset_subject,
    s.custom_subject_id,
    s.start_time,
    s.end_time,
    s.duration,
    s.duration_min,
    s.created_at,
    s.source,
    -- 関連情報
    u.email as user_email,
    cs.name as custom_subject_name
FROM study_sessions s
LEFT JOIN auth.users u ON s.user_id = u.id
LEFT JOIN custom_subjects cs ON s.custom_subject_id = cs.id
WHERE u.email = 'kyogobiz@gmail.com'
  AND s.end_time IS NULL
ORDER BY s.created_at DESC;

-- 3. 最近のセッション（完了・未完了含む）を確認
SELECT 
    s.id,
    s.user_id,
    s.subject_id,
    s.preset_subject,
    s.custom_subject_id,
    s.start_time,
    s.end_time,
    s.duration,
    s.duration_min,
    s.created_at,
    s.source,
    -- 計算フィールド
    CASE 
        WHEN s.end_time IS NULL THEN '進行中'
        ELSE '完了'
    END as status,
    -- 関連情報
    u.email as user_email,
    cs.name as custom_subject_name
FROM study_sessions s
LEFT JOIN auth.users u ON s.user_id = u.id
LEFT JOIN custom_subjects cs ON s.custom_subject_id = cs.id
WHERE u.email = 'kyogobiz@gmail.com'
ORDER BY s.created_at DESC
LIMIT 10;

-- 4. ユーザーの科目（カスタム科目）を確認
SELECT 
    cs.id,
    cs.name,
    cs.color,
    cs.created_at
FROM custom_subjects cs
JOIN auth.users u ON cs.user_id = u.id
WHERE u.email = 'kyogobiz@gmail.com'
ORDER BY cs.created_at DESC;

-- 5. updateSession実行時のデバッグ用クエリ
-- セッションIDとユーザーIDの組み合わせで検索される条件を確認
SELECT 
    s.id,
    s.user_id,
    u.email,
    s.start_time,
    s.end_time,
    COUNT(*) OVER (PARTITION BY s.id, s.user_id) as matching_rows
FROM study_sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'kyogobiz@gmail.com'
  AND s.end_time IS NULL;