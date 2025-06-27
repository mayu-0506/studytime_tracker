# subject_idエラーの解決方法

## エラーの詳細
```
必須項目が入力されていません: subject_id
```

このエラーは、`study_sessions`テーブルの`subject_id`カラムがNOT NULL制約を持っているために発生しています。

## 即座の解決方法（実装済み）

アプリケーション側で以下の対策を実装しました：

1. **カスタム科目の場合**: `subject_id`に同じIDを設定
2. **プリセット科目の場合**: 
   - 旧`subjects`テーブルから対応するIDを取得
   - 見つからない場合は一時的なUUIDを生成

## 根本的な解決方法

### 方法1: subject_idカラムをNULL許可に変更（推奨）

Supabaseで以下のSQLを実行：
```sql
-- subject_idカラムをNULL許可に変更
ALTER TABLE study_sessions 
ALTER COLUMN subject_id DROP NOT NULL;
```

### 方法2: プリセット科目データを旧subjectsテーブルに挿入

```sql
-- プリセット科目が存在しない場合は挿入
INSERT INTO subjects (name, color, user_id) VALUES
('数学', '#4ECDC4', NULL),
('英語', '#45B7D1', NULL),
('国語', '#FF6B6B', NULL),
('理科', '#96CEB4', NULL),
('社会', '#F4A460', NULL),
('その他', '#95A5A6', NULL)
ON CONFLICT (name, user_id) DO NOTHING;
```

### 方法3: 長期的な移行計画

1. **移行期間中（現在）**
   - 新旧両方のフィールドにデータを保存
   - subject_idには互換性のための値を設定

2. **移行完了後**
   - subject_idカラムを削除
   - preset_subjectとcustom_subject_idのみを使用

## デバッグ情報

### 現在のテーブル構造を確認
```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'study_sessions'
AND column_name IN ('subject_id', 'preset_subject', 'custom_subject_id')
ORDER BY ordinal_position;
```

### 旧subjectsテーブルの内容を確認
```sql
-- プリセット科目の存在確認
SELECT * FROM subjects 
WHERE user_id IS NULL 
ORDER BY name;
```

## トラブルシューティング

### それでもエラーが出る場合

1. **外部キー制約の確認**
   ```sql
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'study_sessions'::regclass 
   AND conname LIKE '%subject%';
   ```

2. **一時的にsubject_idをスキップ**
   - viewを作成して新しいカラムのみを使用
   - アプリケーションで別のテーブル名を使用

3. **完全な再マイグレーション**
   - 新しいテーブルを作成
   - データを移行
   - 古いテーブルを削除