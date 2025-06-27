-- 重複セッションIDがないか確認
SELECT 
  id as session_id,
  COUNT(*) as count
FROM study_sessions
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 同じユーザーで同時刻に開始された複数のセッションがないか確認
SELECT 
  user_id,
  start_time,
  COUNT(*) as count,
  array_agg(id) as session_ids
FROM study_sessions
WHERE end_time IS NULL  -- アクティブなセッションのみ
GROUP BY user_id, start_time
HAVING COUNT(*) > 1
ORDER BY start_time DESC;

-- 現在アクティブなセッション（end_timeがNULL）を確認
SELECT 
  id,
  user_id,
  start_time,
  end_time,
  duration,
  duration_min,
  created_at
FROM study_sessions
WHERE end_time IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 最近更新されたセッションを確認
SELECT 
  id,
  user_id,
  start_time,
  end_time,
  duration,
  duration_min,
  created_at,
  updated_at
FROM study_sessions
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 20;