# Supabaseサインアップエラー修正手順

## エラー内容
「Database error saving new user」エラーが発生し、Auth側でユーザー作成は成功するが、profilesテーブルへの自動INSERT時に失敗する。

## 原因
profilesテーブルのカラム構造とトリガー関数の不一致。特に以下のカラムが存在：
- `introduce` と `bio` （2つの似た用途のカラム）
- `current_school` と `target_school` （学校関連のカラム）

## 修正手順

### 1. Supabase SQLエディタで以下を実行

#### ステップ1: 診断SQL実行（オプション）
```bash
# scripts/sql/check-rls-policies.sql の内容を実行
# 現在のRLSポリシーとトリガーの状態を確認
```

#### ステップ2: 修正SQL実行（正しいカラム名版）
```bash
# scripts/sql/fix-signup-error-v2.sql の内容を実行
# 以下の修正が適用されます：
# - profilesテーブルのカラム確認
# - トリガー関数を正しいカラム名で修正
# - ON CONFLICT句でレコード重複を防止
# - RLSポリシーの完全な再作成
# - デバッグ用のRAISE NOTICE追加
```

### 2. データベース型の更新

Supabase Dashboardから：
1. Settings → API → Generate Types をクリック
2. TypeScriptタイプをコピー
3. `src/lib/database.types.ts` を更新

または、Supabase CLIを使用：
```bash
supabase gen types typescript --project-id [your-project-id] > src/lib/database.types.ts
```

### 3. 動作確認

1. 新規ユーザーでサインアップを実行
2. Supabase Dashboardで以下を確認：
   - auth.usersテーブルにユーザーが作成されている
   - public.profilesテーブルに対応するレコードが作成されている

### 4. トラブルシューティング

#### エラーが継続する場合：

1. **トリガーが正しく設定されているか確認**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE event_object_table = 'users' 
   AND event_object_schema = 'auth';
   ```

2. **handle_new_user関数のログを確認**
   ```sql
   -- 関数内にRAISE NOTICEを追加してデバッグ
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS trigger
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public, extensions
   AS $$
   BEGIN
     RAISE NOTICE 'handle_new_user triggered for user %', NEW.id;
     
     INSERT INTO public.profiles (id, email, name, grade)
     VALUES (
       NEW.id, 
       NEW.email, 
       COALESCE(NEW.raw_user_meta_data->>'name', ''),
       NULLIF((NEW.raw_user_meta_data->>'grade')::int, 0)
     );
     
     RAISE NOTICE 'Profile created successfully';
     RETURN NEW;
   EXCEPTION WHEN OTHERS THEN
     RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
     RAISE;
   END;
   $$;
   ```

3. **RLSポリシーの一時無効化（デバッグ用）**
   ```sql
   ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
   -- テスト後は必ず有効化すること
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   ```

## 関連ファイル

- `/scripts/sql/fix-signup-error-v2.sql` - 修正SQL（正しいカラム名版）
- `/scripts/sql/fix-signup-error.sql` - 修正SQL（初版）
- `/scripts/sql/check-rls-policies.sql` - 診断SQL
- `/actions/auth.tsx` - サインアップ処理（改善済み）
- `/src/lib/database.types.ts` - データベース型定義（要更新）