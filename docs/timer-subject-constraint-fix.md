# Timer Subject Constraint Error Fix

## 問題の概要
タイマーでプリセット科目を選択して開始しようとすると、「科目が存在しません（旧テーブル）。Supabaseでプリセット科目を追加してください。」というエラーが発生する。

## 原因
1. `study_sessions` テーブルの `subject_id` カラムに NOT NULL 制約がある
2. 新DB構造では `preset_subject` カラムを使用するが、旧 `subject_id` への外部キー制約が残っている
3. プリセット科目が旧 `subjects` テーブルに存在しない場合、外部キー制約違反が発生

## 解決方法

### 1. Supabaseで以下のSQLを実行

```sql
-- subject_id を nullable にする
ALTER TABLE study_sessions 
ALTER COLUMN subject_id DROP NOT NULL;

-- 確認
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'study_sessions' 
AND column_name = 'subject_id';
```

### 2. プリセット科目を旧subjectsテーブルに追加（オプション）

もし旧システムとの完全な互換性が必要な場合：

```sql
-- プリセット科目を挿入
INSERT INTO subjects (id, name, color, user_id) VALUES
(gen_random_uuid(), '数学', '#4ECDC4', NULL),
(gen_random_uuid(), '英語', '#45B7D1', NULL),
(gen_random_uuid(), '国語', '#FF6B6B', NULL),
(gen_random_uuid(), '理科', '#96CEB4', NULL),
(gen_random_uuid(), '社会', '#F4A460', NULL),
(gen_random_uuid(), 'その他', '#95A5A6', NULL)
ON CONFLICT DO NOTHING;

-- 確認
SELECT id, name, color, user_id 
FROM subjects 
WHERE user_id IS NULL
ORDER BY name;
```

### 3. アプリケーションコードの修正

`actions/study-sessions.ts` の修正は既に完了：
- プリセット科目の場合、`subject_id` が見つからなければ null を設定
- 新DB構造（`preset_subject` カラム）を優先的に使用

## 実装済みの変更

1. **createSession関数の修正**
   - 旧subjectsテーブルにプリセット科目が存在しない場合でも動作するように修正
   - `subject_id` を null に設定可能に

2. **エラーメッセージの改善**
   - より具体的なエラーメッセージで問題を特定しやすく

## テスト手順

1. Supabaseで上記のSQLを実行
2. アプリケーションを再起動
3. タイマーでプリセット科目（例：数学）を選択
4. スタートボタンをクリック
5. エラーが発生しないことを確認

## 今後の推奨事項

1. 完全に新DB構造に移行する
2. 旧 `subject_id` カラムへの依存を段階的に削除
3. データ移行スクリプトを実行して既存データを新構造に移行