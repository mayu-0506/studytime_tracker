# タイマー機能デバッグガイド

## 問題
タイマー終了時にdurationが0分として保存される

## デバッグ手順

1. **ブラウザのコンソールを開く**
   - Chrome/Edge: F12キー → Consoleタブ
   - Safari: 開発メニュー → Webインスペクタを表示 → コンソール

2. **タイマーをテスト**
   - 科目を選択してタイマーを開始
   - 1-2分待つ
   - 終了ボタンを押す

3. **コンソールログを確認**
   以下のログが表示されるはずです：

   ```
   Duration calculation details: {
     startTime: "...",
     endTime: "...",
     diffMs: ...,
     diffMinutes: ...,
     finalDuration: ...
   }
   
   Stop timer - Debug info: {
     sessionId: "...",
     elapsedTime: ...,
     calculatedDurationMinutes: ...,
     endTime: "...",
     sessionStartTime: "...",
     refStartTime: "..."
   }
   
   updateSession - Debug info: {
     sessionId: "...",
     updates: {...},
     updateData: {...},
     userId: "..."
   }
   
   Current session before update: {...}
   Updated session after update: {...}
   ```

4. **確認ポイント**
   - `calculatedDurationMinutes`が正しい値か
   - `updateData`に`duration`と`end_time`が含まれているか
   - `Updated session after update`でdurationが更新されているか

## 追加確認事項

Supabaseダッシュボードで直接確認：
1. study_sessionsテーブルを開く
2. 該当するセッションのレコードを確認
3. duration列の値を確認

## ログ結果の共有
上記のコンソールログをコピーして共有してください。