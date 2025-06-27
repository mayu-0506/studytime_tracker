-- 既存のsubject_breakdown関数を完全に削除してから新しく作成

-- 1. 既存の関数を全て削除
DROP FUNCTION IF EXISTS subject_breakdown() CASCADE;

-- 2. 新しい関数を作成（新しいDB構造に対応）
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

-- 3. 権限を付与
GRANT EXECUTE ON FUNCTION subject_breakdown() TO authenticated;

-- 4. 関数の存在と返却値を確認
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'subject_breakdown';