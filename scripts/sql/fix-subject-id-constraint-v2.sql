-- Fix for subject_id constraint issue in study_sessions table
-- This script makes subject_id nullable to allow new DB structure to work

-- 1. First check current constraint status
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'study_sessions' 
AND column_name = 'subject_id';

-- 2. Make subject_id nullable if it isn't already
ALTER TABLE study_sessions 
ALTER COLUMN subject_id DROP NOT NULL;

-- 3. Verify the change
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'study_sessions' 
AND column_name = 'subject_id';

-- 4. Check if there are any check constraints that might be causing issues
SELECT 
    conname,
    pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'study_sessions'::regclass 
AND contype = 'c';

-- 5. Check foreign key constraints
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='study_sessions'
    AND kcu.column_name = 'subject_id';

-- 6. Add a check constraint to ensure at least one subject type is set
-- First drop if exists
ALTER TABLE study_sessions 
DROP CONSTRAINT IF EXISTS check_subject_reference;

-- Then add the constraint
ALTER TABLE study_sessions 
ADD CONSTRAINT check_subject_reference 
CHECK (
    (preset_subject IS NOT NULL AND custom_subject_id IS NULL AND subject_id IS NULL) OR
    (preset_subject IS NULL AND custom_subject_id IS NOT NULL) OR
    (preset_subject IS NULL AND custom_subject_id IS NULL AND subject_id IS NOT NULL)
);

-- 7. Test the new structure
-- This should succeed with preset subject
INSERT INTO study_sessions (user_id, start_time, preset_subject, source)
VALUES (
    auth.uid(), 
    NOW(), 
    '数学'::preset_subject,
    'timer'
)
RETURNING id, preset_subject, custom_subject_id, subject_id;

-- Clean up test data
DELETE FROM study_sessions 
WHERE id IN (
    SELECT id 
    FROM study_sessions 
    WHERE source = 'timer' 
    AND duration_min IS NULL 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 8. Summary of changes
SELECT 
    'study_sessions table is now ready for the new DB structure' as status,
    'subject_id is now nullable' as change1,
    'Check constraint ensures at least one subject type is set' as change2;