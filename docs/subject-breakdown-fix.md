# 科目別円グラフ修正内容 (緊急)

## 問題の概要
ダッシュボードの科目別学習時間円グラフに他のユーザーの科目データが含まれていた。

## 原因
`subject_breakdown()` RPC関数のWHERE句に問題があった：
```sql
WHERE s.user_id = auth.uid() OR s.user_id IS NULL
```

`OR s.user_id IS NULL` の条件により、user_idがNULLの科目（他のユーザーの科目）も取得されていた。

## 修正内容
WHERE句を以下のように修正：
```sql
WHERE s.user_id = auth.uid()
```

現在ログイン中のユーザーの科目のみを取得するよう変更。

## 適用方法 (必須)
**この修正はデータベースレベルで必要です。以下の手順を実行してください：**

1. Supabaseダッシュボードにログイン
2. SQL Editorを開く
3. `/scripts/sql/fix-subject-breakdown.sql` の内容を実行
4. アプリケーションを再読み込みして動作確認

## フロントエンド修正（適用済み）
- SubjectPieChartコンポーネントで0分の科目をフィルタリング追加
- `data.filter(item => item.total_min > 0)` でクライアント側でも除外

## 動作確認ポイント
- 円グラフに表示される科目が自分の登録した科目のみであること
- 他のユーザーの科目が表示されないこと
- 学習時間の集計が正確であること