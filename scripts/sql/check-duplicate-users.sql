-- Supabase SQL Editorで実行してください
-- 重複ユーザーや削除済みユーザーを確認するSQL

-- 1. 特定のメールアドレスでauth.usersを検索
SELECT 
    id,
    email,
    created_at,
    confirmed_at,
    deleted_at,
    raw_user_meta_data
FROM auth.users 
WHERE lower(email) IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
ORDER BY created_at DESC;

-- 2. auth.identitiesテーブルも確認
SELECT 
    id,
    user_id,
    identity_data->>'email' as email,
    provider,
    created_at,
    updated_at
FROM auth.identities 
WHERE lower(identity_data->>'email') IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com');

-- 3. 削除済みユーザーの一覧
SELECT 
    id,
    email,
    deleted_at,
    created_at
FROM auth.users 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- 4. プロフィールテーブルとの不整合を確認
SELECT 
    p.id,
    p.email as profile_email,
    u.email as auth_email,
    u.deleted_at,
    p.created_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
   OR u.email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com');

-- 5. 孤立したプロフィール（auth.usersに対応するレコードがない）
SELECT 
    p.*
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- 6. 特定ユーザーのハードデリート（慎重に実行）
-- 注意: これは完全に削除されます。実行前に必ずバックアップを取得してください。
/*
-- まず関連データを削除
DELETE FROM profiles WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
);

DELETE FROM subjects WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('s13102502969@toyo.jp', 'kyogoate@gmail.com')
);

-- 最後にauth.usersから削除（Service Roleが必要）
-- これはSupabase管理画面のAuthentication > Usersから手動で削除するか、
-- TypeScriptスクリプトを使用してください
*/