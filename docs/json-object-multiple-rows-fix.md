# JSON object requested, multiple (or no) rows returned エラーの修正

## 問題の詳細
タイマーの終了ボタンを押した際に「JSON object requested, multiple (or no) rows returned」エラーが発生。これはSupabaseの`.single()`メソッドが期待する1行の結果以外が返されたことを示す。

## 原因
1. **`.single()`メソッドの使用**: 0行または複数行が返される可能性がある場所で`.single()`を使用
2. **複数のアクティブセッション**: 同じユーザーが複数のタブでタイマーを使用
3. **データベースの重複**: セッションIDの重複や不整合
4. **24時間以上のアクティブセッション**: 終了されていない古いセッション

## 実装した修正

### 1. `.single()`を`.maybeSingle()`に変更
- `updateSession`関数内の3箇所
- `createSession`関数内の3箇所
- 0行または複数行が返されてもエラーにならない

### 2. エラーハンドリングの強化
```typescript
if (error.message?.includes('JSON object requested')) {
  // 重複セッションの調査
  // デバッグ情報の出力
}
```

### 3. 古いセッションの自動クリーンアップ
- タイマー開始時に24時間以上前のアクティブセッションを自動終了
- 複数タブでの使用による問題を軽減

### 4. デバッグSQL追加
`/scripts/sql/check-duplicate-sessions.sql`で以下を確認：
- 重複セッションID
- 同時刻の複数セッション
- アクティブなセッション一覧

## データベースでの確認事項

```sql
-- 重複セッションの確認
SELECT id, COUNT(*) as count
FROM study_sessions
GROUP BY id
HAVING COUNT(*) > 1;

-- アクティブセッションの確認
SELECT * FROM study_sessions
WHERE end_time IS NULL
ORDER BY created_at DESC;
```

## 今後の推奨事項

1. **ユニーク制約の追加**
   - study_sessionsテーブルのidカラムにPRIMARY KEYまたはUNIQUE制約を確認

2. **セッション管理の改善**
   - 1ユーザー1アクティブセッションの制限
   - タブ間でのセッション同期

3. **定期的なクリーンアップ**
   - 古いアクティブセッションの自動終了処理