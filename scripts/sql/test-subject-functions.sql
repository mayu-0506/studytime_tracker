-- 現在のsubject_breakdown関数の状態を確認

-- 1. public.subject_breakdown関数が存在するか確認
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'subject_breakdown'
  AND n.nspname = 'public';

-- 2. 他のダッシュボード関数も確認
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('dashboard_totals', 'last_7_day_buckets', 'last_4_week_buckets')
  AND n.nspname = 'public';

-- 3. study_sessionsテーブルの列を確認
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'study_sessions' 
  AND column_name IN ('preset_subject', 'custom_subject_id', 'duration', 'duration_min')
ORDER BY ordinal_position;

-- 4. custom_subjectsテーブルの存在を確認
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'custom_subjects'
ORDER BY ordinal_position;