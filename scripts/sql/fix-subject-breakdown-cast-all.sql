-- subject_breakdown関数の型エラーを完全に修正

-- 1. 既存の関数を削除
DROP FUNCTION IF EXISTS subject_breakdown() CASCADE;

-- 2. 全ての型を明示的にキャストして関数を作成
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
  -- プリセット科目の集計（preset_subjectもtext型にキャスト）
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

-- 4. preset_subject型を確認
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'study_sessions' 
  AND column_name = 'preset_subject';

-- 5. テスト実行
SELECT * FROM subject_breakdown();