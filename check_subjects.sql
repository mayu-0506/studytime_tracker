-- Check if preset subjects exist in the old subjects table
SELECT id, name, color, user_id 
FROM subjects 
WHERE user_id IS NULL
ORDER BY name;

-- Check if there are any study_sessions with subject_id issues
SELECT 
    COUNT(*) as total_sessions,
    COUNT(subject_id) as sessions_with_subject_id,
    COUNT(*) - COUNT(subject_id) as sessions_without_subject_id
FROM study_sessions;

-- Check recent study_sessions
SELECT 
    id,
    user_id,
    subject_id,
    preset_subject,
    custom_subject_id,
    start_time,
    created_at
FROM study_sessions
ORDER BY created_at DESC
LIMIT 10;
