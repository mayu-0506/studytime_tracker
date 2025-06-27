-- 既存のdashboard_totals関数を削除して再作成
DROP FUNCTION IF EXISTS dashboard_totals();

-- 新しいdashboard_totals関数を作成（今週・今月版）
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

-- 権限を付与
GRANT EXECUTE ON FUNCTION dashboard_totals() TO authenticated;

-- 関数が正しく作成されたか確認
SELECT * FROM dashboard_totals() LIMIT 1;