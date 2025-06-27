# Study Time Tracker - デバッグガイド

## 実装したデバッグ機能

### 1. デバッグコードの追加
以下のファイルにデバッグコードを追加しました：

- **`/actions/subjects.ts`**
  - `createCustomSubject`: 科目追加時の詳細ログ
  - ユーザー認証状態、挿入データ、エラー詳細を出力

- **`/actions/study-sessions.ts`**
  - `createSession`: セッション作成時の詳細ログ
  - 科目タイプ判定、挿入データ、エラー詳細を出力

- **`/utils/supabase/debug.ts`** (新規作成)
  - `debugSupabase`: Supabaseクライアントの包括的診断
  - 認証状態、テーブルアクセス権限、データ取得テスト

### 2. 修正した問題

#### A. 型定義の不整合
- `actions/subjects.ts`: PRESET_SUBJECTSの参照方法を修正
- カスタム科目のcolor_hexフィールドを正しく使用
- idにprefix (`preset_`) を追加

#### B. 科目管理の統合
- `SubjectSelect.tsx`: サーバーアクションを正しく使用
- 削除機能のパラメータ修正
- Subject型の一貫性を確保

#### C. タイマーコンポーネント
- 科目情報を正しくセッションに付加
- colorフィールドのnullチェックを削除

### 3. デバッグ手順

1. **開発環境で診断を実行**
   - 勉強タイマーページに「診断実行」ボタンを追加（開発環境のみ）
   - ブラウザのコンソールを開く
   - 「診断実行」ボタンをクリック

2. **コンソールで確認すべき項目**
   ```
   === Supabase診断開始 ===
   認証ユーザー: {id: "...", email: "..."}
   
   === テーブルアクセステスト ===
   custom_subjects SELECT: ✅ OK
   study_sessions SELECT: ✅ OK
   
   === custom_subjectsテーブル詳細 ===
   custom_subjects件数: X
   
   === study_sessionsテーブル詳細 ===
   カラム確認: {
     preset_subject: true,
     custom_subject_id: true,
     duration_min: true,
     source: true
   }
   ```

3. **科目追加のテスト**
   - 科目選択の「+」ボタンをクリック
   - 新しい科目を追加
   - コンソールに以下が表示される：
   ```
   === カスタム科目追加デバッグ開始 ===
   追加しようとしているデータ: {name: "テスト", color: "#3B82F6"}
   現在のユーザー: {id: "...", email: "..."}
   挿入データ: {name: "テスト", color_hex: "#3B82F6", user_id: "..."}
   作成成功: [{...}]
   ```

4. **タイマーのテスト**
   - 科目を選択してタイマーを開始
   - コンソールに以下が表示される：
   ```
   === セッション作成デバッグ開始 ===
   科目ID: preset_数学 または UUID
   科目タイプ: プリセット または カスタム
   挿入データ: {...}
   セッション作成成功: {...}
   ```

### 4. よくあるエラーと対処法

#### エラー1: "relation \"custom_subjects\" does not exist"
**原因**: custom_subjectsテーブルが存在しない
**対処**: マイグレーションSQLを実行
```sql
-- /scripts/sql/migrate-to-new-db-structure.sql を実行
```

#### エラー2: "new row violates row-level security policy"
**原因**: RLSポリシーが設定されていない
**対処**: RLSポリシーを確認・設定
```sql
-- カスタム科目のRLSポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'custom_subjects';
```

#### エラー3: カラムが見つからない
**原因**: 新しいカラムが追加されていない
**対処**: ALTER TABLEを実行
```sql
ALTER TABLE study_sessions 
  ADD COLUMN IF NOT EXISTS preset_subject preset_subject,
  ADD COLUMN IF NOT EXISTS custom_subject_id UUID,
  ADD COLUMN IF NOT EXISTS duration_min INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT;
```

### 5. 次のステップ

1. **診断結果の確認**
   - すべてのテストが ✅ OK になっているか
   - エラーメッセージの詳細を確認

2. **エラーがある場合**
   - エラーメッセージをコピー
   - 該当するテーブル/カラムの存在を確認
   - RLSポリシーを確認

3. **正常に動作している場合**
   - 実際に科目を追加してみる
   - タイマーを開始・停止してみる
   - データが正しく保存されているか確認