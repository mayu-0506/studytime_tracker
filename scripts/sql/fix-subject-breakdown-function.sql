-- subject_breakdown関数を修正
-- 1. duration_minカラムに対応
-- 2. 新しいDB構造（プリセット科目とカスタム科目）に対応

DROP FUNCTION IF EXISTS subject_breakdown();

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
  -- プリセット科目の集計
  SELECT
    'preset_' || ss.preset_subject as subject_id,
    ss.preset_subject as name,
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
  GROUP BY ss.preset_subject

  UNION ALL

  -- カスタム科目の集計
  SELECT
    cs.id as subject_id,
    cs.name,
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

-- 権限を付与
GRANT EXECUTE ON FUNCTION subject_breakdown() TO authenticated;

-- テスト用クエリ
-- SELECT * FROM subject_breakdown();