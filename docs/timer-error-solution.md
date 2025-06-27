# Study Time Tracker - タイマーエラー解決ガイド

## 問題の概要
タイマー機能でセッション保存時に「セッションの保存に失敗しました」というエラーが発生する。

## 診断手順

### 1. ブラウザでの診断（開発環境）

1. **アプリを起動**
   ```bash
   npm run dev
   ```

2. **勉強タイマーページを開く**
   - http://localhost:3000/study
   - ブラウザのデベロッパーツール（F12）を開く

3. **診断ボタンを使用**
   - 「診断実行」: 基本的なSupabase接続確認
   - 「タイマー診断」: タイマー機能の詳細診断
   - 「API診断」: APIエンドポイント経由の診断

4. **コンソールログを確認**
   ```
   === タイマーセッション診断開始 ===
   認証ユーザー: {id: "...", email: "..."}
   
   --- ENUM型テスト ---
   ❌ 数学 挿入エラー: {
     message: "invalid input value for enum preset_subject: \"数学\""
   }
   ```

### 2. 考えられる原因と対処法

#### A. ENUM型が存在しない
**症状**: `invalid input value for enum preset_subject`

**対処法**: Supabaseのクエリエディタで以下を実行
```sql
-- ENUM型の作成
CREATE TYPE preset_subject AS ENUM ('数学', '英語', '国語', '理科', '社会', 'その他');

-- カラムの追加
ALTER TABLE study_sessions 
  ADD COLUMN IF NOT EXISTS preset_subject preset_subject,
  ADD COLUMN IF NOT EXISTS custom_subject_id UUID,
  ADD COLUMN IF NOT EXISTS duration_min INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT;
```

#### B. RLSポリシーの問題
**症状**: `new row violates row-level security policy`

**対処法**: 
```sql
-- RLSを有効化
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Users can create own sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### C. カラムが存在しない
**症状**: `column "preset_subject" of relation "study_sessions" does not exist`

**対処法**: 
```sql
-- 完全なマイグレーションを実行
-- /scripts/sql/migrate-to-new-db-structure.sql の内容を実行
```

### 3. 緊急回避策

ENUM型の作成ができない場合の代替案：

```sql
-- preset_subjectカラムをTEXT型に変更
ALTER TABLE study_sessions DROP COLUMN IF EXISTS preset_subject;
ALTER TABLE study_sessions ADD COLUMN preset_subject TEXT;
ALTER TABLE study_sessions 
  ADD CONSTRAINT preset_subject_check 
  CHECK (preset_subject IN ('数学', '英語', '国語', '理科', '社会', 'その他') OR preset_subject IS NULL);
```

### 4. 完全な修正手順

1. **Supabaseダッシュボードにログイン**

2. **SQL Editorで以下を実行**（順番に）
   ```sql
   -- 1. /scripts/sql/fix-timer-issue.sql を実行
   -- 2. /scripts/sql/dashboard-rpc-functions-v2.sql を実行
   ```

3. **アプリケーションを再起動**
   ```bash
   # Ctrl+C で停止後
   npm run dev
   ```

4. **動作確認**
   - 科目を選択
   - タイマーを開始
   - コンソールにエラーが出ないことを確認

### 5. デバッグ情報の収集

問題が解決しない場合、以下の情報を収集：

1. **API診断結果**
   - 「API診断」ボタンをクリック
   - コンソールに出力される結果をコピー

2. **エラーログ**
   - タイマー開始時のコンソールエラー
   - ネットワークタブでのエラーレスポンス

3. **データベース状態**
   ```sql
   -- Supabaseで実行
   SELECT column_name, data_type 
   FROM information_schema.columns
   WHERE table_name = 'study_sessions'
   AND column_name IN ('preset_subject', 'custom_subject_id', 'source');
   ```

### 6. よくある質問

**Q: タイマーは動くが保存されない**
A: RLSポリシーが原因の可能性が高い。上記のRLS設定を確認。

**Q: 「無効なプリセット科目です」エラー**
A: ENUM型の値が正しくない。ENUM型を再作成するか、TEXT型に変更。

**Q: カスタム科目が保存できない**
A: custom_subjectsテーブルとRLSポリシーを確認。

### 7. サポート

解決しない場合は、以下の情報と共に報告：
- ブラウザのコンソールログ
- API診断の結果
- 使用しているSupabaseプロジェクトのリージョン