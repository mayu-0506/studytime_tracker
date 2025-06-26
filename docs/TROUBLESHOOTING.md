# トラブルシューティングガイド

## 「このメールアドレスは既に登録されています」エラー

### 症状
- サインアップ時に「このメールアドレスは既に登録されています」と表示される
- 過去に削除したはずのメールアドレスで登録できない

### 原因
- Supabaseのauth.usersテーブルでソフトデリート（論理削除）されたユーザーが残っている
- `deleted_at`が設定されていても、メールアドレスは使用済みとして扱われる

### 解決方法

#### 1. 状態を確認
```bash
# auth.usersテーブルの状態を確認
npm run users:check
```

#### 2. ハードデリート（完全削除）を実行
```bash
# 問題のユーザーをハードデリート
npm run users:hard-delete
```

#### 3. SQL直接実行（管理者向け）
Supabase SQL Editorで以下を実行：
```sql
-- 削除済みユーザーの確認
SELECT id, email, deleted_at 
FROM auth.users 
WHERE email = 'target@email.com';

-- identitiesテーブルも確認
SELECT * FROM auth.identities 
WHERE identity_data->>'email' = 'target@email.com';
```

## 特定のユーザーがログインできない問題

### 症状
- `s13102502969@toyo.jp` や `kyogoate@gmail.com` などのユーザーがログインできない
- ログイン後にエラーが発生する
- プロフィール画面でエラーが表示される

### 原因
1. **Cookieサイズの問題**: レガシーデータが蓄積してCookieが大きくなりすぎている
2. **プロフィールデータの不整合**: 古い形式のデータが残っている
3. **画像データの問題**: Base64形式の画像データが残っている

### 解決方法

#### 1. データベースのクリーンアップ（管理者向け）

**方法A: TypeScriptスクリプトを使用（推奨）**
```bash
npm run reset:problem-users
```

**方法B: SQLを直接実行**
Supabase SQL Editorで以下を実行：
```sql
-- scripts/sql/reset-problem-users.sql の内容を実行
```

#### 2. ユーザー側での対処

1. **ブラウザのCookieをクリア**
   - Chrome: 設定 → プライバシーとセキュリティ → Cookieと他のサイトデータ
   - Safari: 設定 → プライバシー → Webサイトデータを管理
   - Firefox: 設定 → プライバシーとセキュリティ → Cookieとサイトデータ

2. **ブラウザのキャッシュをクリア**
   - Ctrl+Shift+Delete (Windows) または Cmd+Shift+Delete (Mac)

3. **再度ログイン**

#### 3. 開発環境での確認

```bash
# Cookieの状態を確認
curl http://localhost:3000/api/clear-cookies

# デバッグ情報を確認
curl http://localhost:3000/api/debug-profiles
```

### 予防策

1. **定期的なクリーンアップ**
   - 古いユーザーメタデータの削除
   - 未使用の画像ファイルの削除

2. **ログイン時の自動クリーンアップ**
   - 問題のあるユーザーは自動的にCookieがクリアされる

3. **データサイズの制限**
   - プロフィール名: 最大50文字
   - Email: 最大255文字
   - 画像: 最大2MB

## その他の問題

### プロフィール画像がアップロードできない
- ファイルサイズが2MBを超えていないか確認
- 対応フォーマット: JPG, JPEG, PNG

### 科目が追加できない
- 同じ名前の科目が既に存在していないか確認
- 科目名が50文字以内か確認