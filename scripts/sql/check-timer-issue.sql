-- タイマー終了時の問題調査用SQL

-- 1. study_sessionsテーブルの定義確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'study_sessions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. RLSポリシーの確認（特にUPDATE権限）
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'study_sessions'
  AND cmd = 'UPDATE';

-- 3. トリガーの確認（UPDATE時に何か処理があるか）
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'study_sessions'
  AND event_manipulation = 'UPDATE';

-- 4. 最新のセッションを確認（durationとend_timeの状態）
SELECT 
  id,
  user_id,
  subject_id,
  start_time,
  end_time,
  duration,
  created_at,
  CASE 
    WHEN end_time IS NULL THEN 'アクティブ'
    WHEN duration IS NULL THEN 'end_timeありdurationなし'
    WHEN duration = 0 THEN '0分として記録'
    ELSE CONCAT(duration::text, '分として記録')
  END as status,
  -- 実際の経過時間を計算
  CASE 
    WHEN end_time IS NOT NULL AND start_time IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::integer
    ELSE NULL
  END as calculated_duration_minutes
FROM study_sessions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- 5. 手動記録と自動記録の比較
SELECT 
  id,
  CASE 
    WHEN memo IS NOT NULL THEN '手動記録の可能性'
    ELSE 'タイマー記録の可能性'
  END as record_type,
  start_time,
  end_time,
  duration,
  memo,
  created_at
FROM study_sessions
WHERE user_id = auth.uid()
  AND end_time IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;