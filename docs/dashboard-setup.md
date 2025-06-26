# Dashboard Setup Guide

## エラーの解決方法

### 1. "Unknown RPC: rpc" エラー
このエラーは、ダッシュボードで使用するRPC関数がSupabaseデータベースに存在しない場合に発生します。

### 2. "Could not find the function public.last_7day_buckets without parameters in the schema cache" エラー
このエラーは、RPC関数名が間違っている場合に発生します。正しい関数名は：
- `last_7_day_buckets` (アンダースコア付き)
- `last_4_week_buckets` (アンダースコア付き)

### 解決手順

1. **RPC関数をデータベースにデプロイ**
   ```bash
   # Supabase ダッシュボードのSQL Editor で以下のファイルを実行:
   scripts/sql/dashboard-rpc-functions.sql
   ```

2. **RPC関数の存在確認**
   ```bash
   # 環境変数を設定
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   
   # テストスクリプトを実行
   npx tsx scripts/test-dashboard-rpc.ts
   ```

3. **正常に動作することを確認**
   - ブラウザでダッシュボード (`/dashboard`) にアクセス
   - エラーが表示されないことを確認
   - タイマーを実行して、データが正しく表示されることを確認

### RPC関数の概要

以下のRPC関数がデプロイされます：

- `dashboard_totals()` - 総学習時間、過去7日間、過去4週間の合計を取得
- `subject_breakdown()` - 科目別の学習時間内訳を取得
- `last_7day_buckets()` - 過去7日間の日別学習時間を取得
- `last_4week_buckets()` - 過去4週間の週別学習時間を取得
- `monthly_calendar(_first, _last)` - 指定月のカレンダー用データを取得

全ての関数は `SECURITY DEFINER` で定義され、`auth.uid()` を使用して現在のユーザーのデータのみを返します。

### トラブルシューティング

1. **権限エラーの場合**
   ```sql
   -- 実行権限を再付与
   GRANT EXECUTE ON FUNCTION dashboard_totals() TO authenticated;
   GRANT EXECUTE ON FUNCTION subject_breakdown() TO authenticated;
   GRANT EXECUTE ON FUNCTION last_7day_buckets() TO authenticated;
   GRANT EXECUTE ON FUNCTION last_4week_buckets() TO authenticated;
   GRANT EXECUTE ON FUNCTION monthly_calendar(date, date) TO authenticated;
   ```

2. **データが表示されない場合**
   - `study_sessions` テーブルにデータが存在することを確認
   - `duration` フィールドがNULLでないことを確認
   - `user_id` が正しく設定されていることを確認