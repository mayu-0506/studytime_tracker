# スキーマキャッシュエラーの解決方法

## エラーの詳細
```
Could not find a relationship between 'study_sessions' and 'custom_subjects' in the schema cache
```

このエラーは、Supabaseがテーブル間のリレーションシップを認識できていないことを示しています。

## 即座の解決方法

### 1. アプリケーション側の修正（実装済み）
関連テーブルのJOINを避け、別々にクエリを実行するように修正しました：
- `actions/study-sessions.ts`: selectから関連テーブル参照を削除
- `lib/supabase/study-sessions.ts`: カスタム科目を別途取得

### 2. Supabaseでの修正手順

1. **Supabaseダッシュボードにログイン**

2. **SQL Editorで以下を実行**
   ```sql
   -- /scripts/sql/fix-schema-cache.sql の内容を実行
   ```

3. **スキーマキャッシュのリフレッシュ**
   - 方法A: Database → Tables → 右上の「Reload」ボタンをクリック
   - 方法B: Settings → General → 「Restart project」をクリック
   - 方法C: 5-10分待つ（自動的にリフレッシュされる）

### 3. Webpackキャッシュエラーの解決

ターミナルで以下を実行：
```bash
# 開発サーバーを停止（Ctrl+C）

# .nextフォルダを削除
rm -rf .next

# node_modulesのキャッシュをクリア
rm -rf node_modules/.cache

# 開発サーバーを再起動
npm run dev
```

## 根本的な解決

### 外部キー制約の確認
Supabaseで以下のSQLを実行して、外部キー制約が正しく設定されているか確認：
```sql
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'study_sessions'
AND kcu.column_name = 'custom_subject_id';
```

### テーブル関連の再設定
```sql
-- 外部キー制約を再作成
ALTER TABLE study_sessions
DROP CONSTRAINT IF EXISTS study_sessions_custom_subject_id_fkey;

ALTER TABLE study_sessions
ADD CONSTRAINT study_sessions_custom_subject_id_fkey
FOREIGN KEY (custom_subject_id) 
REFERENCES custom_subjects(id) 
ON DELETE SET NULL;
```

## 動作確認

1. **タイマー機能のテスト**
   - 科目を選択してタイマーを開始
   - コンソールにエラーが出ないことを確認
   - 正常に「学習を開始しました」と表示される

2. **データの確認**
   ```sql
   -- 最新のセッションを確認
   SELECT * FROM study_sessions 
   WHERE user_id = auth.uid() 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

## トラブルシューティング

### それでもエラーが続く場合

1. **Supabaseプロジェクトの再起動**
   - Settings → General → Restart project

2. **新しいクライアントの作成**
   - ブラウザのシークレットモードで試す
   - 別のブラウザで試す

3. **データベースの整合性確認**
   ```sql
   -- custom_subjectsテーブルの存在確認
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name = 'custom_subjects'
   );
   ```

## 予防策

1. **外部キー制約は明示的に設定**
   - Supabase UIではなくSQLで設定する

2. **スキーマ変更後は必ずリフレッシュ**
   - プロジェクトを再起動するか、手動でリロード

3. **関連テーブルの参照は慎重に**
   - 必要に応じて別々のクエリに分ける