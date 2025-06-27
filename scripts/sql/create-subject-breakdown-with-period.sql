-- 期間を指定できるsubject_breakdown関数を作成

-- 1. 既存の関数を削除
DROP FUNCTION IF EXISTS subject_breakdown() CASCADE;
DROP FUNCTION IF EXISTS subject_breakdown_with_period(text) CASCADE;

-- 2. 期間を指定できる新しい関数を作成
CREATE OR REPLACE FUNCTION subject_breakdown_with_period(
  period_type text DEFAULT 'all'  -- 'all', 'last_7_days', 'last_4_weeks'
)
RETURNS TABLE (
  subject_id text,
  name text,
  total_min integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  start_date timestamp with time zone;
BEGIN
  -- 期間の開始日を設定
  CASE period_type
    WHEN 'last_7_days' THEN
      start_date := CURRENT_TIMESTAMP - INTERVAL '7 days';
    WHEN 'last_4_weeks' THEN
      start_date := CURRENT_TIMESTAMP - INTERVAL '28 days';
    ELSE  -- 'all' またはその他
      start_date := '1970-01-01'::timestamp with time zone;
  END CASE;

  RETURN QUERY
  -- プリセット科目の集計
  SELECT
    ('preset_' || ss.preset_subject::text)::text as subject_id,
    ss.preset_subject::text as name,
    COALESCE(SUM(
      CASE 
        WHEN ss.duration_min IS NOT NULL THEN ss.duration_min
        WHEN ss.duration IS NOT NULL THEN ss.duration
        ELSE 0
      END
    ), 0)::integer as total_min
  FROM study_sessions ss
  WHERE ss.user_id = auth.uid()
    AND ss.preset_subject IS NOT NULL
    AND ss.start_time >= start_date
  GROUP BY ss.preset_subject

  UNION ALL

  -- カスタム科目の集計
  SELECT
    cs.id::text as subject_id,
    cs.name::text as name,
    COALESCE(SUM(
      CASE 
        WHEN ss.duration_min IS NOT NULL THEN ss.duration_min
        WHEN ss.duration IS NOT NULL THEN ss.duration
        ELSE 0
      END
    ), 0)::integer as total_min
  FROM custom_subjects cs
  LEFT JOIN study_sessions ss 
    ON cs.id = ss.custom_subject_id 
    AND ss.user_id = auth.uid()
    AND ss.start_time >= start_date
  WHERE cs.user_id = auth.uid()
  GROUP BY cs.id, cs.name
  HAVING COALESCE(SUM(
    CASE 
      WHEN ss.duration_min IS NOT NULL THEN ss.duration_min
      WHEN ss.duration IS NOT NULL THEN ss.duration
      ELSE 0
    END
  ), 0) > 0

  ORDER BY total_min DESC;
END;
$$;

-- 3. 後方互換性のため、引数なしのsubject_breakdown関数も作成
CREATE OR REPLACE FUNCTION subject_breakdown()
RETURNS TABLE (
  subject_id text,
  name text,
  total_min integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM subject_breakdown_with_period('all');
END;
$$;

-- 4. 権限を付与
GRANT EXECUTE ON FUNCTION subject_breakdown_with_period(text) TO authenticated;
GRANT EXECUTE ON FUNCTION subject_breakdown() TO authenticated;

-- 5. テスト実行
SELECT 'All time' as period, * FROM subject_breakdown_with_period('all');
SELECT 'Last 7 days' as period, * FROM subject_breakdown_with_period('last_7_days');
SELECT 'Last 4 weeks' as period, * FROM subject_breakdown_with_period('last_4_weeks');