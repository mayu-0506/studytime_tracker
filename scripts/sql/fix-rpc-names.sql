-- Fix RPC function names
-- このスクリプトは、間違った名前で作成された関数を削除し、正しい名前で再作成します

-- 古い関数を削除（存在する場合）
DROP FUNCTION IF EXISTS public.last_7day_buckets();
DROP FUNCTION IF EXISTS public.last_4week_buckets();

-- 新しい関数は dashboard-rpc-functions.sql で作成されます
-- 実行手順:
-- 1. このスクリプトを実行して古い関数を削除
-- 2. dashboard-rpc-functions.sql を実行して正しい関数を作成