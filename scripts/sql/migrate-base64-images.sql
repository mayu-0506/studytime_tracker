-- Supabase SQL Editor で実行するスクリプト
-- Base64画像をプレースホルダーURLに変換（実際の画像移行は別途スクリプトで実行）

-- 1. Base64画像を持つユーザーを確認
SELECT 
    id,
    email,
    raw_user_meta_data->>'profile_image' as profile_image,
    LENGTH(raw_user_meta_data->>'profile_image') as image_size,
    created_at
FROM auth.users
WHERE 
    raw_user_meta_data->>'profile_image' LIKE 'data:image/%'
ORDER BY LENGTH(raw_user_meta_data->>'profile_image') DESC
LIMIT 20;

-- 2. Base64画像を一時的にバックアップ（必要に応じて）
CREATE TABLE IF NOT EXISTS public.user_image_backup (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    base64_image TEXT,
    backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- バックアップ実行
INSERT INTO public.user_image_backup (user_id, base64_image)
SELECT 
    id,
    raw_user_meta_data->>'profile_image'
FROM auth.users
WHERE 
    raw_user_meta_data->>'profile_image' LIKE 'data:image/%'
ON CONFLICT (user_id) DO NOTHING;

-- 3. ユーザーメタデータを更新（Base64を削除し、URLプレースホルダーを設定）
UPDATE auth.users
SET raw_user_meta_data = 
    CASE 
        WHEN raw_user_meta_data ? 'profile_image' AND raw_user_meta_data->>'profile_image' LIKE 'data:image/%'
        THEN 
            -- profile_imageを削除し、avatar_urlを追加
            (raw_user_meta_data - 'profile_image') || 
            jsonb_build_object(
                'avatar_url', 
                CONCAT('https://your-supabase-url.supabase.co/storage/v1/object/public/avatars/', id, '_avatar.png'),
                'image_migrated', true,
                'migrated_at', NOW()
            )
        ELSE raw_user_meta_data
    END
WHERE 
    raw_user_meta_data->>'profile_image' LIKE 'data:image/%';

-- 4. 結果確認
SELECT 
    id,
    email,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    raw_user_meta_data->>'image_migrated' as migrated,
    LENGTH(raw_user_meta_data::text) as metadata_size
FROM auth.users
WHERE 
    raw_user_meta_data->>'image_migrated' = 'true'
LIMIT 20;

-- 5. メタデータサイズの統計
SELECT 
    COUNT(*) as total_users,
    AVG(LENGTH(raw_user_meta_data::text)) as avg_metadata_size,
    MAX(LENGTH(raw_user_meta_data::text)) as max_metadata_size,
    MIN(LENGTH(raw_user_meta_data::text)) as min_metadata_size
FROM auth.users;

-- 6. 大きなメタデータを持つユーザーを特定
SELECT 
    id,
    email,
    LENGTH(raw_user_meta_data::text) as metadata_size,
    raw_user_meta_data
FROM auth.users
WHERE LENGTH(raw_user_meta_data::text) > 1024
ORDER BY LENGTH(raw_user_meta_data::text) DESC
LIMIT 10;