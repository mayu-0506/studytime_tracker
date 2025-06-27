# タイマー機能の勉強時間計算修正

## 修正内容

### 1. 時間計算ロジックの修正
**修正ファイル**: `/hooks/useStudyTimer.ts`

- **問題**: `Math.floor(elapsedTime / 60)` で1分未満が0分になる
- **修正**: elapsedTimeが0より大きい場合は最低1分を保証
```typescript
const duration = elapsedTime > 0 ? Math.max(1, secondsToMinutes(elapsedTime)) : 0
```

### 2. 時間フォーマット関数の追加
**修正ファイル**: `/utils/time-format.ts`

新しい関数を追加：
- `calculateStudyMinutes()`: 開始・終了時間から分単位を計算（秒切り捨て）
- `secondsToMinutes()`: 秒から分に変換（秒切り捨て）
- `formatStudyTime()`: 開始・終了時間から表示用文字列を生成

### 3. 各画面での表示統一
**修正ファイル**:
- `/hooks/useStudyTimer.ts`: toast表示をformatMinutesToHoursMinutes()に統一
- `/app/(main)/study/ManualEntryModal.tsx`: 手動入力時の時間計算を修正
- `/app/(main)/dashboard/DashboardView.tsx`: formatHours()を削除しformatMinutesToHoursMinutes()に統一

## 表示フォーマット
- 1時間未満: "X分"
- 1時間以上: "X時間Y分"
- 例: 65分 → "1時間5分"、45分 → "45分"

## 動作仕様
- 1秒以上の学習は1分として記録
- 全ての画面で統一された時間表示
- 秒は全て切り捨て