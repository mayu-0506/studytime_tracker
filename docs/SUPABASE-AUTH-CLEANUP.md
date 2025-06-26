# Supabase認証ユーザーのクリーンアップガイド

## 問題：「このメールアドレスは既に使用されています」

過去に登録したメールアドレスを削除したはずなのに、再登録できない場合の解決方法です。

## 原因

Supabaseのauth.usersテーブルは**ソフトデリート（論理削除）**を使用しています：
- 削除してもレコードは残る（`deleted_at`フラグが立つだけ）
- メールアドレスは永続的に「使用済み」扱い
- 同じメールで再登録するには**ハードデリート（完全削除）**が必要

## 解決手順

### 1. 問題のメールアドレスの状態を確認

```bash
# 特定のメールアドレスの状態を確認
npm run users:check:one -- your@email.com
```

出力例：
```
✅ ユーザーが見つかりました:
  - ID: 123e4567-e89b-12d3-a456-426614174000
  - Email: your@email.com
  - 削除済み: はい (2024-01-01T00:00:00.000Z)

⚠️  このユーザーはソフトデリートされています！
同じメールアドレスで再登録するには、ハードデリートが必要です。
```

### 2. ハードデリート（完全削除）を実行

```bash
# 特定のユーザーをハードデリート
npm run users:hard-delete:one -- your@email.com
```

このコマンドは以下を実行します：
- profiles、subjects、study_sessionsテーブルから関連データを削除
- Storage内の画像ファイルを削除
- auth.usersからユーザーレコードを完全削除

### 3. 削除の確認

再度状態確認コマンドを実行：
```bash
npm run users:check:one -- your@email.com
```

「❌ ユーザーが見つかりません」と表示されれば、メールアドレスは再登録可能です。

## 複数ユーザーの一括処理

特定のユーザー（s13102502969@toyo.jp、kyogoate@gmail.com）用：
```bash
# 状態確認
npm run users:check

# ハードデリート
npm run users:hard-delete
```

## 注意事項

⚠️ **ハードデリートは取り消しできません**
- 実行前に必ずデータのバックアップを取得してください
- 削除されたデータは復元できません
- 関連する全てのデータ（プロフィール、科目、学習記録など）も削除されます

## トラブルシューティング

### エラー: "SUPABASE_SERVICE_ROLE_KEY is not set"
Service Role Keyが設定されていません。`.env.local`ファイルに以下を追加：
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### エラー: "User not found"
指定したメールアドレスのユーザーが存在しません（既に削除済みか、typoの可能性）。

### それでも登録できない場合
Supabase管理画面から直接確認：
1. Supabase Dashboard → Authentication → Users
2. 検索バーでメールアドレスを検索
3. ユーザーが見つかった場合は、3点メニューから「Delete user」を選択
4. 「Hard delete」オプションを選択して削除