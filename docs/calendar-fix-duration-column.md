# 月間学習カレンダーの表示エラー修正

## 問題
月間学習カレンダーで全ての日付が「-」（0分）として表示される問題が発生。

## 原因
データベースのRPC関数（`monthly_calendar`など）が古い`duration`カラムを使用していたが、
新しいDB構造では`duration_min`カラムを使用するように変更されていたため。

## 解決策

### 1. Supabaseで以下のSQLを実行
`scripts/sql/fix-monthly-calendar-function.sql`のファイルを実行してください。

このSQLファイルは以下の関数を修正します：
- `monthly_calendar`: 月間カレンダーのデータ取得
- `dashboard_totals`: ダッシュボードの合計時間取得
- `last_7_day_buckets`: 直近7日間のデータ取得
- `last_4_week_buckets`: 直近4週間のデータ取得

各関数は`duration_min`カラムを優先的に使用し、存在しない場合は`duration`カラムにフォールバックするようになっています。

### 2. 実行方法
1. Supabaseのダッシュボードにログイン
2. SQL Editorを開く
3. `scripts/sql/fix-monthly-calendar-function.sql`の内容をコピー＆ペースト
4. Runボタンをクリックして実行

### 3. 確認方法
1. アプリケーションをリロード
2. ダッシュボードページを開く
3. 月間学習カレンダーに勉強時間が正しく表示されることを確認

## 技術的な詳細
- 旧DB構造: `duration`カラム（分単位）
- 新DB構造: `duration_min`カラム（分単位）
- 修正内容: CASE文を使用して両方のカラムに対応

```sql
CASE 
  WHEN ss.duration_min IS NOT NULL THEN ss.duration_min
  WHEN ss.duration IS NOT NULL THEN ss.duration
  ELSE 0
END
```

これにより、新旧両方のデータ構造に対応できるようになりました。