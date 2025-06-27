-- 現在のsubject_breakdown関数の状態を確認

-- 1. subject_breakdown関数の存在と返却型を確認
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'subject_breakdown'
ORDER BY n.nspname, p.proname;

-- 2. 実際にsubject_breakdown関数を実行してみる（最初の1行だけ）
SELECT * FROM subject_breakdown() LIMIT 1;