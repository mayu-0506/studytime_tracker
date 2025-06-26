-- Dashboard RPC Functions
-- These functions are used to efficiently fetch dashboard data with proper RLS

-- 1. Dashboard totals function
CREATE OR REPLACE FUNCTION dashboard_totals()
RETURNS TABLE (
  total_min integer,
  last7_min integer,
  last4w_min integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(duration), 0)::integer as total_min,
    COALESCE(SUM(CASE 
      WHEN start_time >= CURRENT_TIMESTAMP - INTERVAL '7 days' 
      THEN duration 
      ELSE 0 
    END), 0)::integer as last7_min,
    COALESCE(SUM(CASE 
      WHEN start_time >= CURRENT_TIMESTAMP - INTERVAL '28 days' 
      THEN duration 
      ELSE 0 
    END), 0)::integer as last4w_min
  FROM study_sessions
  WHERE user_id = auth.uid()
    AND duration IS NOT NULL;
END;
$$;

-- 2. Subject breakdown function
CREATE OR REPLACE FUNCTION subject_breakdown()
RETURNS TABLE (
  subject_name text,
  color text,
  total_min integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.name as subject_name,
    s.color,
    COALESCE(SUM(ss.duration), 0)::integer as total_min
  FROM subjects s
  LEFT JOIN study_sessions ss ON s.id = ss.subject_id AND ss.user_id = auth.uid()
  WHERE s.user_id = auth.uid() OR s.user_id IS NULL
  GROUP BY s.id, s.name, s.color
  HAVING COALESCE(SUM(ss.duration), 0) > 0
  ORDER BY total_min DESC;
END;
$$;

-- 3. Last 7 days buckets function
CREATE OR REPLACE FUNCTION last_7_day_buckets()
RETURNS TABLE (
  d date,
  total_min integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '6 days',
      CURRENT_DATE,
      '1 day'::interval
    )::date AS day
  )
  SELECT
    ds.day as d,
    COALESCE(SUM(ss.duration), 0)::integer as total_min
  FROM date_series ds
  LEFT JOIN study_sessions ss
    ON DATE(ss.start_time) = ds.day
    AND ss.user_id = auth.uid()
    AND ss.duration IS NOT NULL
  GROUP BY ds.day
  ORDER BY ds.day;
END;
$$;

-- 4. Last 4 weeks buckets function
CREATE OR REPLACE FUNCTION last_4_week_buckets()
RETURNS TABLE (
  week_start date,
  total_min integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH week_series AS (
    SELECT 
      date_trunc('week', generate_series(
        date_trunc('week', CURRENT_DATE - INTERVAL '3 weeks'),
        date_trunc('week', CURRENT_DATE),
        '1 week'::interval
      ))::date AS week_start
  )
  SELECT
    ws.week_start,
    COALESCE(SUM(ss.duration), 0)::integer as total_min
  FROM week_series ws
  LEFT JOIN study_sessions ss
    ON date_trunc('week', ss.start_time)::date = ws.week_start
    AND ss.user_id = auth.uid()
    AND ss.duration IS NOT NULL
  GROUP BY ws.week_start
  ORDER BY ws.week_start;
END;
$$;

-- 5. Monthly calendar function
CREATE OR REPLACE FUNCTION monthly_calendar(
  _first date,
  _last date
)
RETURNS TABLE (
  day date,
  total_min integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(_first, _last, '1 day'::interval)::date AS day
  )
  SELECT
    ds.day,
    COALESCE(SUM(ss.duration), 0)::integer as total_min
  FROM date_series ds
  LEFT JOIN study_sessions ss
    ON DATE(ss.start_time) = ds.day
    AND ss.user_id = auth.uid()
    AND ss.duration IS NOT NULL
  GROUP BY ds.day
  ORDER BY ds.day;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION dashboard_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION subject_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION last_7_day_buckets() TO authenticated;
GRANT EXECUTE ON FUNCTION last_4_week_buckets() TO authenticated;
GRANT EXECUTE ON FUNCTION monthly_calendar(date, date) TO authenticated;