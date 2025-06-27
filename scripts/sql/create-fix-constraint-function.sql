-- RPC関数を作成して、アプリケーションから制約を修正できるようにする
CREATE OR REPLACE FUNCTION fix_subject_id_constraint()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- NOT NULL制約を削除
    ALTER TABLE study_sessions 
    ALTER COLUMN subject_id DROP NOT NULL;
    
    -- 結果を返す
    result := json_build_object(
        'success', true,
        'message', 'subject_idのNOT NULL制約を削除しました'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- エラーが発生した場合
        result := json_build_object(
            'success', false,
            'message', SQLERRM
        );
        RETURN result;
END;
$$;