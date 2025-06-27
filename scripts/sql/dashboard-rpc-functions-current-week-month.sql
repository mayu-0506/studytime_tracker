-- Dashboard RPC Functions - Current Week/Month Version
-- Modified to show current week and current month totals

-- 1. Dashboard totals function (modified)
CREATE OR REPLACE FUNCTION dashboard_totals()
RETURNS TABLE (
  total_min integer,
  current_week_min integer,
  current_month_min integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(duration), 0)::integer as total_min,
    -- 今週の勉強時間（月曜日始まり）
    COALESCE(SUM(CASE 
      WHEN start_time >= date_trunc('week', CURRENT_DATE)::timestamp
        AND start_time < date_trunc('week', CURRENT_DATE)::timestamp + INTERVAL '7 days'
      THEN duration 
      ELSE 0 
    END), 0)::integer as current_week_min,
    -- 今月の勉強時間
    COALESCE(SUM(CASE 
      WHEN start_time >= date_trunc('month', CURRENT_DATE)::timestamp
        AND start_time < date_trunc('month', CURRENT_DATE)::timestamp + INTERVAL '1 month'
      THEN duration 
      ELSE 0 
    END), 0)::integer as current_month_min
  FROM study_sessions
  WHERE user_id = auth.uid()
    AND duration IS NOT NULL;
END;
$$;

-- 週の始まりを月曜日に設定（PostgreSQLのデフォルトは月曜日）
-- 念のため設定を確認/変更する場合は以下を実行
-- SET lc_time = 'ja_JP.UTF-8';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION dashboard_totals() TO authenticated;