# RPC関数修正ガイド

## 問題の概要
エラー「Could not find the function public.last_7day_buckets without parameters in the schema cache」が発生する原因は、RPC関数名の不一致です。

### 間違った関数名:
- `last_7day_buckets` (アンダースコアなし)
- `last_4week_buckets` (アンダースコアなし)

### 正しい関数名:
- `last_7_day_buckets` (アンダースコア付き)
- `last_4_week_buckets` (アンダースコア付き)

## 修正手順

1. **古い関数を削除**
   ```sql
   -- Supabase SQL Editorで実行
   scripts/sql/fix-rpc-names.sql
   ```

2. **正しい関数を作成**
   ```sql
   -- Supabase SQL Editorで実行
   scripts/sql/dashboard-rpc-functions.sql
   ```

3. **動作確認**
   ```bash
   # ローカルで実行
   npx tsx scripts/test-dashboard-rpc.ts
   ```

## 変更内容

### データベース側の変更:
- `last_7day_buckets()` → `last_7_day_buckets()` 
  - 戻り値: `{ d: date, total_min: integer }`
- `last_4week_buckets()` → `last_4_week_buckets()`
  - 戻り値: `{ week_start: date, total_min: integer }`

### コード側の変更:
- `hooks/useDashboardData.ts`: RPC呼び出し名を修正
- `actions/dashboard-stats.ts`: 型定義をDatabase型から取得
- `types/dashboard.ts`: インターフェースをRPCの戻り値に合わせて修正

## トラブルシューティング

### エラーが続く場合:
1. Supabaseダッシュボードで関数が正しく作成されているか確認
2. ブラウザのキャッシュをクリア（Ctrl+F5）
3. Next.jsの開発サーバーを再起動