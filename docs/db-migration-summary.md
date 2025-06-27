# Study Time Tracker - DB移行サマリー

## 完了した修正内容

### 1. 型定義の更新
- **`types/database.ts`**: 新しいDB構造に対応
  - `PresetSubject` ENUM型（'数学', '英語', '国語', '理科', '社会', 'その他'）
  - `custom_subjects`テーブル型定義
  - `study_sessions`の新しいカラム（`preset_subject`, `custom_subject_id`, `duration_min`, `source`）

- **`types/index.ts`**: 既存の型を更新
  - `StudySessionType`に新しいフィールドを追加
  - `CustomSubjectType`を追加

### 2. 科目管理の実装
- **`lib/supabase/subjects.ts`**: 新規作成
  - プリセット科目とカスタム科目を統合管理
  - `getAllSubjects()`: すべての科目を取得
  - `createCustomSubject()`: カスタム科目作成
  - `deleteCustomSubject()`: カスタム科目削除

### 3. 科目選択UIの修正
- **`app/(main)/study/SubjectSelect.tsx`**: 
  - プリセット科目とカスタム科目を分けて表示
  - 新しい`Subject`型を使用
  - カスタム科目の追加・削除機能

- **`app/(main)/study/ManualEntryModal.tsx`**:
  - 新しい科目取得APIを使用
  - プリセット/カスタム科目を区別して表示

### 4. セッション保存ロジックの修正
- **`actions/study-sessions.ts`**:
  - `createSession()`: プリセット/カスタム科目を判定して適切なフィールドに保存
  - `updateSession()`: `duration_min`フィールドを使用
  - `createManualSession()`: 新しいDB構造に対応

- **`hooks/useStudyTimer.ts`**:
  - 新しい`Subject`型を使用
  - セッション作成時に正しいフィールドに保存

### 5. セッション表示ロジックの修正
- **`lib/supabase/study-sessions.ts`**: 新規作成
  - `getTodaySessionsWithSubjects()`: 今日のセッションを科目情報付きで取得
  - `getSubjectSummaryForPeriod()`: 期間内の科目別集計
  - プリセット/カスタム科目の両方に対応

- **`app/(main)/study/page.tsx`**:
  - 新しいデータ取得関数を使用
  - 表示ロジックを新しい型に対応

### 6. 統計機能の更新
- **`scripts/sql/dashboard-rpc-functions-v2.sql`**: 新規作成
  - `dashboard_totals()`: `duration_min`を使用
  - `subject_breakdown()`: プリセット/カスタム科目の両方を集計（UNION ALL）
  - すべてのRPC関数を新しいDB構造に対応

### 7. データ移行スクリプト
- **`scripts/sql/migrate-to-new-db-structure.sql`**: 新規作成
  - ENUM型の作成
  - `custom_subjects`テーブルの作成とRLSポリシー
  - 既存データの移行ロジック
  - インデックスの追加

## 重要な変更点

### カラム名の変更
- `subject_id` → `preset_subject` または `custom_subject_id`
- `duration` → `duration_min`（分単位で統一）

### 科目IDの形式
- プリセット科目: `"preset_数学"`, `"preset_英語"` など
- カスタム科目: UUID形式のまま

### 新しいカラム
- `source`: 'timer' または 'manual'（記録元を識別）

## 互換性の維持
- 旧`subjects`テーブルは削除せず、互換性のために残す
- 旧`subject_id`、`duration`カラムも残す
- 移行期間中は両方のフィールドに値を保存

## 今後の作業
1. Supabaseでmigration SQLを実行
2. RPC関数を新しいものに更新
3. 本番環境へのデプロイ
4. 移行後のデータ検証
5. 古いカラム・テーブルの削除（十分な期間後）