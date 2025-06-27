-- 既存の関数を削除してから再作成するバージョン

-- 1. monthly_calendar関数を修正
DROP FUNCTION IF EXISTS monthly_calendar(date, date);

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
    COALESCE(SUM(
      CASE 
        WHEN ss.duration_min IS NOT NULL THEN ss.duration_min
        WHEN ss.duration IS NOT NULL THEN ss.duration
        ELSE 0
      END
    ), 0)::integer as total_min
  FROM date_series ds
  LEFT JOIN study_sessions ss
    ON DATE(ss.start_time) = ds.day
    AND ss.user_id = auth.uid()
  GROUP BY ds.day
  ORDER BY ds.day;
END;
$$;

-- 2. dashboard_totals関数を削除して再作成
DROP FUNCTION IF EXISTS dashboard_totals();

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
    COALESCE(SUM(
      CASE 
        WHEN duration_min IS NOT NULL THEN duration_min
        WHEN duration IS NOT NULL THEN duration
        ELSE 0
      END
    ), 0)::integer as total_min,
    COALESCE(SUM(
      CASE 
        WHEN start_time >= date_trunc('week', CURRENT_DATE) 
        THEN 
          CASE 
            WHEN duration_min IS NOT NULL THEN duration_min
            WHEN duration IS NOT NULL THEN duration
            ELSE 0
          END
        ELSE 0 
      END
    ), 0)::integer as current_week_min,
    COALESCE(SUM(
      CASE 
        WHEN start_time >= date_trunc('month', CURRENT_DATE) 
        THEN 
          CASE 
            WHEN duration_min IS NOT NULL THEN duration_min
            WHEN duration IS NOT NULL THEN duration
            ELSE 0
          END
        ELSE 0 
      END
    ), 0)::integer as current_month_min
  FROM study_sessions
  WHERE user_id = auth.uid();
END;
$$;

-- 3. last_7_day_buckets関数を削除して再作成
DROP FUNCTION IF EXISTS last_7_day_buckets();

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
    COALESCE(SUM(
      CASE 
        WHEN ss.duration_min IS NOT NULL THEN ss.duration_min
        WHEN ss.duration IS NOT NULL THEN ss.duration
        ELSE 0
      END
    ), 0)::integer as total_min
  FROM date_series ds
  LEFT JOIN study_sessions ss
    ON DATE(ss.start_time) = ds.day
    AND ss.user_id = auth.uid()
  GROUP BY ds.day
  ORDER BY ds.day;
END;
$$;

-- 4. last_4_week_buckets関数を削除して再作成
DROP FUNCTION IF EXISTS last_4_week_buckets();

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
    COALESCE(SUM(
      CASE 
        WHEN ss.duration_min IS NOT NULL THEN ss.duration_min
        WHEN ss.duration IS NOT NULL THEN ss.duration
        ELSE 0
      END
    ), 0)::integer as total_min
  FROM week_series ws
  LEFT JOIN study_sessions ss
    ON date_trunc('week', ss.start_time)::date = ws.week_start
    AND ss.user_id = auth.uid()
  GROUP BY ws.week_start
  ORDER BY ws.week_start;
END;
$$;

-- 5. 権限を付与
GRANT EXECUTE ON FUNCTION monthly_calendar(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION last_7_day_buckets() TO authenticated;
GRANT EXECUTE ON FUNCTION last_4_week_buckets() TO authenticated;

-- 6. 動作確認用のテストクエリ
-- 以下のクエリを実行して、関数が正しく動作するか確認できます
-- SELECT * FROM dashboard_totals();
-- SELECT * FROM last_7_day_buckets();
-- SELECT * FROM monthly_calendar('2025-01-01'::date, '2025-01-31'::date);