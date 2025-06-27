# タイマー機能の終了時間記録問題の修正

## 問題の詳細
タイマーの終了ボタンを押した時、勉強時間が0分として記録される問題があった。

## 原因
- タイマー内のelapsedTime（経過秒数）からdurationを計算していた
- 一時停止やタブ切り替えなどで、elapsedTimeが実際の経過時間と異なる可能性があった
- データベースに保存されているstart_timeを使わずに、ローカルの経過時間から計算していた

## 修正内容
**修正ファイル**: `/hooks/useStudyTimer.ts`

### 変更前
```typescript
const duration = elapsedTime > 0 ? Math.max(1, secondsToMinutes(elapsedTime)) : 0
```

### 変更後
```typescript
// start_timeから正確なdurationを計算
let duration: number
if (currentSession.start_time) {
  const startTime = new Date(currentSession.start_time)
  duration = calculateStudyMinutes(startTime, endTime)
  // 最低1分を保証
  duration = Math.max(1, duration)
} else {
  // フォールバック：elapsedTimeから計算
  duration = elapsedTime > 0 ? Math.max(1, secondsToMinutes(elapsedTime)) : 0
}
```

## 改善点
1. データベースに保存されているstart_timeを使用して正確な勉強時間を計算
2. 開始時刻と終了時刻の差分から確実にdurationを算出
3. 一時停止やタブ切り替えの影響を受けない
4. 最低1分の勉強時間を保証

## デバッグ情報
コンソールに以下の情報が出力されます（本番環境では削除予定）：
- sessionId: セッションID
- calculatedDuration: 計算された勉強時間（分）
- sessionStartTime: DBから取得した開始時刻
- endTime: 終了ボタンを押した時刻