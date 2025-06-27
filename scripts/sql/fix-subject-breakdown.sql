-- Fix subject_breakdown function to only show current user's subjects
-- This fixes the issue where other users' subjects were appearing in the pie chart

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
  WHERE s.user_id = auth.uid()  -- Fixed: Removed "OR s.user_id IS NULL" condition
  GROUP BY s.id, s.name, s.color
  HAVING COALESCE(SUM(ss.duration), 0) > 0
  ORDER BY total_min DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION subject_breakdown() TO authenticated;