# Base64画像移行ガイド

## 概要
このガイドでは、Supabaseのuser_metadataに保存されているBase64画像をSupabase Storageに移行する手順を説明します。

## 前提条件
- Supabase Service Role Key が必要
- Node.js 18以上
- 必要な依存関係：
  ```bash
  npm i -D tsx cross-env
  npm i dotenv
  ```

## 手順

### 1. 環境変数の設定
`.env.local` に以下を追加：
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_API_TOKEN=your-secure-admin-token
NODE_OPTIONS="--max-http-header-size=32768"
```

### 2. SQLによるバックアップ作成
Supabase SQL Editorで以下を実行：
```bash
npm run db:migrate:sql
# 表示されるSQLファイルの内容をSupabase SQL Editorで実行
```

### 3. 画像の移行実行

#### オプション1: APIによる一括移行（推奨）
```bash
# 全ユーザーのBase64画像をURLに変換
npm run migrate:images
```

#### オプション2: Storageへの実際のアップロード
```bash
# バックアップテーブルからStorageに画像をアップロード
npm run migrate:storage
```

### 4. クリーンアップ

```bash
# Dry runで確認
npm run admin:cleanup --dry-run

# 実際のクリーンアップ実行
npm run admin:cleanup
```

### 5. 検証

```bash
# Cookieサイズテスト実行
npm run test

# 開発サーバーで動作確認
npm run dev:big
```

## トラブルシューティング

### HTTP 431エラーが発生する場合

1. ブラウザのCookieをクリア
2. 以下のコマンドで起動：
   ```bash
   # Unix/Mac
   npm run dev:big:unix
   
   # Windows
   npm run dev:big:win
   ```

### Supabase Storage エラー

1. Supabaseダッシュボードで`avatars`バケットが存在することを確認
2. バケットがpublicに設定されているか確認
3. RLSポリシーが適切に設定されているか確認

### メモリ不足エラー

大量のユーザーがいる場合、バッチ処理を使用：
```bash
npm run admin:cleanup --batch=10
```

## 移行後の確認事項

- [ ] 全ユーザーの`user_metadata.profile_image`が削除されている
- [ ] 新しい`user_metadata.avatar_url`が設定されている
- [ ] Cookieサイズが4KB未満になっている
- [ ] ログイン/ログアウトが正常に動作する
- [ ] プロフィール画像が正しく表示される

## ロールバック手順

万が一の場合、バックアップテーブルから復元：
```sql
-- Supabase SQL Editorで実行
UPDATE auth.users u
SET raw_user_meta_data = 
    raw_user_meta_data || 
    jsonb_build_object('profile_image', b.base64_image)
FROM public.user_image_backup b
WHERE u.id = b.user_id;
```