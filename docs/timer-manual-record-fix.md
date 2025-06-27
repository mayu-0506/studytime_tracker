# タイマー終了機能修正 - 手動記録と同じ仕組みで実装

## 修正内容

### 1. 手動記録と同じduration計算方法に統一
- 手動記録：`Math.round((endTime - startTime) / (1000 * 60))` （分単位）
- タイマー：同じ計算式を使用するよう修正
- DBのstart_timeを基準に計算（ローカルの経過時間ではなく）

### 2. 一時停止の影響を排除
- 複雑な一時停止時間の計算を削除
- シンプルに開始時刻と終了時刻の差分で計算
- 最低1分を保証

### 3. デバッグログの追加（開発環境のみ）
- タイマー開始時：作成されたセッションの確認
- タイマー終了時：currentSessionの内容確認
- 更新処理：エラー詳細と更新結果の確認

## テスト手順

### 1. ブラウザのコンソールを開く
```
Chrome/Edge: F12 → Console タブ
Safari: 開発メニュー → Webインスペクタ → コンソール
```

### 2. タイマーのテスト
1. http://localhost:3000/study にアクセス
2. 科目を選択
3. タイマーを開始
4. コンソールに「Timer started - session created:」ログが表示されることを確認
5. 30秒〜1分待つ
6. 終了ボタンを押す
7. コンソールに以下のログが表示されることを確認：
   - `Stop timer - currentSession:`
   - `updateSession result:`

### 3. 確認ポイント
- `start_time`が正しく記録されているか
- `duration`が正しく計算されているか（最低1分）
- `end_time`が記録されているか
- エラーが発生していないか

### 4. データベースでの確認
```sql
-- Supabase SQL Editorで実行
SELECT 
  id,
  subject_id,
  start_time,
  end_time,
  duration,
  created_at
FROM study_sessions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

### 5. デバッグAPIでの確認
```bash
# ブラウザで以下にアクセス
http://localhost:3000/api/debug-timer

# アクティブセッションの確認とテスト更新
```

## トラブルシューティング

### もしdurationが保存されない場合

1. **RLSポリシーの確認**
   ```sql
   -- scripts/sql/check-timer-issue.sql を実行
   ```

2. **手動でテスト更新**
   ```bash
   # /api/test-session にアクセスして更新テストを実行
   ```

3. **ネットワークタブで確認**
   - DevTools → Network タブ
   - 終了ボタンクリック時のリクエストを確認
   - エラーレスポンスがないか確認

## 修正されたファイル
- `/hooks/useStudyTimer.ts` - 手動記録と同じduration計算に修正
- `/actions/study-sessions.ts` - デバッグログ追加（開発環境のみ）
- `/utils/time-format.ts` - formatTime関数を追加

## 今後の改善案
- 一時停止時間を考慮した正確な学習時間の記録
- リアルタイムでのデータベース同期
- オフライン対応の強化