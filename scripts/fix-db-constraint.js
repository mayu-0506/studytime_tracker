// データベース制約を修正するスクリプト
// 使用方法: node scripts/fix-db-constraint.js

console.log('⚠️  このスクリプトはSupabaseのSQL Editorで以下のSQLを実行してください:');
console.log('');
console.log('ALTER TABLE study_sessions');
console.log('ALTER COLUMN subject_id DROP NOT NULL;');
console.log('');
console.log('実行後、タイマーが正常に動作するようになります。');