# 月間学習カレンダーのヒートマップとUI改善

## 実装した改善内容

### 1. ヒートマップ機能の実装
- `/components/charts/StudyCalendarHeatmap.tsx`:
  - 月間の最大学習時間を基準とした相対的な色の濃淡表示を実装
  - 8段階のブルーグラデーション（bg-blue-100 〜 bg-blue-800）
  - 学習時間0分は白色（bg-white）で表示
  - 凡例に実際の最大学習時間を表示

### 2. 色計算ロジック
```typescript
const intensity = Math.ceil((minutes / maxMinutes) * 8)
```
- 各日の学習時間を月の最大値で割り、8段階にマッピング
- より視覚的に学習パターンが把握しやすいヒートマップを実現

### 3. 日付詳細表示の科目色分け
- `/components/modals/DayDetailModal.tsx`:
  - 科目名の左に色付きドットを表示
  - 学習時間の数字を科目色で表示
  - 学習時間に応じた長さのカラーバーを追加

- `/actions/dashboard-stats.ts`:
  - `getDaySessionDetails`関数で科目の色情報を取得
  - subjectsテーブルのcolor列を含めるよう修正

### 4. UI改善点
- カレンダーの凡例を9段階のグラデーションで表示
- 各セルの学習時間が相対的に視覚化される
- 詳細モーダルで科目が一目で識別可能
- レスポンシブかつ美しいデザイン

## 主な変更ファイル
- `/components/charts/StudyCalendarHeatmap.tsx`
- `/components/modals/DayDetailModal.tsx`
- `/actions/dashboard-stats.ts`

## 動作確認
- カレンダーのヒートマップが月の最大学習時間を基準に表示
- 日付クリックで科目が色分けされた詳細が表示
- 学習パターンが視覚的に把握しやすい