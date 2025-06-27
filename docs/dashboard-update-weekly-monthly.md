# ダッシュボード表示変更 - 今週・今月の勉強時間

## 変更内容

ダッシュボード上部の表示を「直近7日間」「直近4週間」から「今週の勉強時間」「今月の勉強時間」に変更しました。

### 変更点

1. **SQLファンクションの修正**
   - `dashboard_totals()`関数を修正
   - `last7_min` → `current_week_min`（今週の勉強時間）
   - `last4w_min` → `current_month_min`（今月の勉強時間）

2. **週の定義**
   - 週の始まりは**月曜日**として計算
   - PostgreSQLの`date_trunc('week', ...)`は月曜日始まりがデフォルト

3. **表示の変更**
   - 「今週の勉強時間」: 月曜日からの累計
   - 「今月の勉強時間」: 当月の累計（例：6月の累計）

## 実装詳細

### SQLファンクション
```sql
-- 今週の勉強時間（月曜日始まり）
COALESCE(SUM(CASE 
  WHEN start_time >= date_trunc('week', CURRENT_DATE)::timestamp
    AND start_time < date_trunc('week', CURRENT_DATE)::timestamp + INTERVAL '7 days'
  THEN duration 
  ELSE 0 
END), 0)::integer as current_week_min

-- 今月の勉強時間
COALESCE(SUM(CASE 
  WHEN start_time >= date_trunc('month', CURRENT_DATE)::timestamp
    AND start_time < date_trunc('month', CURRENT_DATE)::timestamp + INTERVAL '1 month'
  THEN duration 
  ELSE 0 
END), 0)::integer as current_month_min
```

### 更新が必要なデータベース

Supabaseで以下のSQLを実行してください：
`/scripts/sql/dashboard-rpc-functions-current-week-month.sql`

## 影響範囲

- `/app/(main)/dashboard/DashboardView.tsx`
- `/actions/dashboard-stats.ts`
- `/types/dashboard.ts`

## 注意事項

- 週の始まりは月曜日として計算されます
- 月の表示は現在の月（例：6月）として表示されます