# ダッシュボード修正サマリー

## 修正内容

### 1. 一時的な対応（現在の状態）
- `DashboardView.tsx`でクライアントサイドのSWRフックを無効化
- 初期データ（サーバーサイドで取得）のみを使用
- カレンダーデータは一時的に空配列を表示

### 2. 根本的な解決に必要なアクション

#### A. Supabaseデータベースの更新
```sql
-- 1. 古い関数を削除
DROP FUNCTION IF EXISTS public.last_7day_buckets();
DROP FUNCTION IF EXISTS public.last_4week_buckets();

-- 2. 正しい関数を作成
-- scripts/sql/dashboard-rpc-functions.sql を実行
```

#### B. 型定義の生成
```bash
# Supabase CLIで型を再生成
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

#### C. 完全な実装への復元
DashboardView.tsxを以下のように戻す：
```typescript
// SWRフックを有効化
const { data: totals, error: totalsError } = useDashboardTotals(initialData.totals || undefined)
const { data: subjectBreakdown, error: subjectError } = useSubjectBreakdown()
// ... 他のフックも同様
```

## 現在の動作状況
- ✅ ダッシュボードが表示される
- ✅ 初期データ（総時間、日別、週別グラフ）が表示される
- ❌ リアルタイム更新は無効（SWRフックを無効化したため）
- ❌ カレンダーヒートマップは空（monthly_calendar関数の問題）

## 次のステップ
1. Supabase SQL Editorで上記のSQL実行
2. 型定義の再生成
3. DashboardView.tsxをSWR対応版に戻す
4. カレンダーデータの初期取得を追加