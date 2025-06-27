# NaN時間NaN分表示問題の解決方法

## 問題の原因

1. **データベースのRPC関数が更新されていない**
   - `dashboard_totals()`関数が古い列名（`last7_min`, `last4w_min`）を返している
   - TypeScriptコードは新しい列名（`current_week_min`, `current_month_min`）を期待している

2. **formatMinutesToHoursMinutes関数がNaNを処理できていない**
   - undefined や NaN の値を受け取った場合の処理が不足

## 実装した修正

### 1. formatMinutesToHoursMinutes関数の改善
```typescript
// undefined, null, NaNのチェックを追加
if (minutes === undefined || minutes === null || isNaN(minutes)) {
  return '0分'
}
```

### 2. データマッピングの改善
- 新しい列名と古い列名の両方に対応
- 存在する列名を動的に検出してマッピング

### 3. デバッグログの追加
- 問題の原因を特定するためのログを追加

## データベースの更新方法

Supabaseのダッシュボードで以下のSQLを実行してください：

```sql
-- /scripts/sql/update-dashboard-totals-urgent.sql の内容を実行
```

## 現在の動作

データベースが更新されるまで：
- 「今週の勉強時間」→ 過去7日間の勉強時間を表示
- 「今月の勉強時間」→ 過去28日間の勉強時間を表示

データベース更新後：
- 「今週の勉強時間」→ 月曜日からの累計を表示
- 「今月の勉強時間」→ 当月1日からの累計を表示

## 確認方法

1. ブラウザのコンソールで以下のログを確認：
   - `Dashboard totals raw data:` - DBから返されたデータ
   - `Dashboard totals mapped:` - マッピング後のデータ
   - `DashboardView - displayTotals:` - 表示用のデータ

2. 値が0または正しい数値で表示されることを確認