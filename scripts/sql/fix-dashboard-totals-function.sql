-- Fix dashboard_totals function to return correct column names
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
    COALESCE(SUM(CASE 
      WHEN duration_min IS NOT NULL THEN duration_min 
      ELSE duration 
    END), 0)::integer as total_min,
    COALESCE(SUM(CASE 
      WHEN start_time >= date_trunc('week', CURRENT_DATE) 
      THEN CASE 
        WHEN duration_min IS NOT NULL THEN duration_min 
        ELSE duration 
      END
      ELSE 0 
    END), 0)::integer as current_week_min,
    COALESCE(SUM(CASE 
      WHEN start_time >= date_trunc('month', CURRENT_DATE) 
      THEN CASE 
        WHEN duration_min IS NOT NULL THEN duration_min 
        ELSE duration 
      END
      ELSE 0 
    END), 0)::integer as current_month_min
  FROM study_sessions
  WHERE user_id = auth.uid()
    AND (duration IS NOT NULL OR duration_min IS NOT NULL);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION dashboard_totals() TO authenticated;