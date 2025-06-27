-- 現在のdashboard_totals関数が返す列を確認
SELECT 
    proname AS function_name,
    pg_catalog.pg_get_function_result(oid) AS return_type
FROM 
    pg_catalog.pg_proc
WHERE 
    proname = 'dashboard_totals';

-- dashboard_totals関数を実行して実際に返される列を確認
SELECT * FROM dashboard_totals() LIMIT 1;

-- 既存の関数定義を確認
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'dashboard_totals' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');