# 認証エラーデバッグガイド

## 概要
Study Time Trackerの認証エラーをデバッグするための機能強化を実施しました。

## 実施した修正

### 1. サインアップ処理のエラーハンドリング強化
**ファイル**: `/components/auth/Signup.tsx`

#### 追加されたデバッグ機能：
- サインアップ開始時のログ出力
- レスポンスの詳細ログ
- エラー発生時の詳細情報（タイムスタンプ、エラー内容、スタックトレース）
- 成功時の確認ログ

#### コンソールで確認できる情報：
```javascript
// サインアップ開始時
console.log("サインアップ処理開始:", { email, name })

// エラー時
console.error("サインアップエラー詳細:", {
  error: res.error,
  timestamp: new Date().toISOString(),
  values: { email, name }
})

// 成功時
console.log("サインアップ成功:", { email })
```

### 2. データベース接続テストAPI
**エンドポイント**: `/api/test-db`

#### 使用方法：
```bash
# ブラウザまたはcurlでアクセス
curl http://localhost:3000/api/test-db
```

#### 取得できる情報：
- 認証状態（現在のユーザー情報）
- profilesテーブルへのアクセス可否
- study_sessionsテーブルの存在確認
- エラーの詳細メッセージ

#### レスポンス例：
```json
{
  "success": true,
  "results": {
    "timestamp": "2025-06-27T10:00:00.000Z",
    "profilesTable": {
      "success": true,
      "error": null,
      "data": [...]
    },
    "authStatus": {
      "user": { "id": "...", "email": "..." },
      "error": null
    },
    "tablesList": {
      "tables": ["study_sessions"],
      "error": null
    }
  }
}
```

## デバッグ手順

### 1. サインアップエラーの調査
1. ブラウザの開発者ツールを開く（F12）
2. Consoleタブを選択
3. サインアップを実行
4. コンソールに出力されるログを確認

### 2. データベース接続の確認
1. `/api/test-db`にアクセス
2. レスポンスを確認：
   - `profilesTable.error`が存在する場合：テーブルアクセスの問題
   - `authStatus.error`が存在する場合：認証の問題

### 3. よくあるエラーと対処法

#### "Database error saving new user"
**原因**：profilesテーブルへの挿入時のエラー
**確認事項**：
- RLSポリシーが正しく設定されているか
- トリガー関数が正しく動作しているか
- カラム名が一致しているか

#### "relation 'profiles' does not exist"
**原因**：profilesテーブルが存在しない
**対処法**：
- Supabaseダッシュボードでテーブルの存在を確認
- マイグレーションの実行状態を確認

## Supabase側の確認事項

### 1. ログの確認
Supabaseダッシュボード → Logs → Edge Logsで以下を確認：
- トリガー関数のRAISE NOTICEメッセージ
- SQLエラーメッセージ

### 2. RLSポリシーの確認
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### 3. トリガーの確認
```sql
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';
```

## 追加のデバッグTips

### ローカルストレージのクリア
認証情報がキャッシュされている場合：
```javascript
// ブラウザコンソールで実行
localStorage.clear()
sessionStorage.clear()
```

### Supabaseクライアントの状態確認
```javascript
// ブラウザコンソールで実行
const { data: { session } } = await supabase.auth.getSession()
console.log('Current session:', session)
```