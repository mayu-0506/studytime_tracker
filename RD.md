# 勉強時間トラッカー - 要件定義書

## 1. プロジェクト概要

### 1.1 プロジェクト名
Study Time Tracker（勉強時間トラッカー）

### 1.2 目的
高校生・大学受験生が科目別に勉強時間を記録・可視化し、学習習慣の改善と効率的な時間管理を支援するWebアプリケーション

### 1.3 ターゲットユーザー
- 主要ターゲット：高校生（特に大学受験生）
- サブターゲット：資格試験受験者、自己学習者

### 1.4 開発期間
約7-9日間（AOエージェントプロジェクトの1/10規模）

### 1.5 技術スタック
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend: Supabase（Auth, Database, Realtime）
- Hosting: Vercel
- その他: Chart.js（グラフ表示）、React Hook Form（フォーム管理）

## 2. 機能要件

### Phase 1: 基本機能（3-4日）

#### 2.1 ユーザー認証機能
**優先度：高**

- **サインアップ**
  - メールアドレス + パスワード認証
  - 確認メール送信
  - プロフィール初期設定（名前、学年、志望校）
  
- **サインイン/サインアウト**
  - メール + パスワードでログイン
  - セッション管理
  - パスワードリセット機能

- **プロフィール管理**
  - 基本情報編集（名前、学年、志望校）
  - アバター画像アップロード（オプション）

#### 2.2 勉強セッション管理
**優先度：高**

- **タイマー機能**
  - 開始/一時停止/終了ボタン
  - リアルタイムカウントアップ表示
  - バックグラウンドでも継続（ブラウザタブ切り替え対応）
  
- **科目選択**
  - プリセット科目から選択（数学、英語、国語、理科、社会、その他）
  - カスタム科目追加機能
  - 科目別色分け

- **セッション記録**
  - 開始・終了時刻自動記録
  - 勉強時間自動計算
  - メモ機能（学習内容、感想など）
  - 手動追加機能（過去の勉強時間入力）

### Phase 2: 可視化機能（2-3日）

#### 2.3 ダッシュボード
**優先度：中**

- **統計表示**
  - 今日の勉強時間（リアルタイム更新）
  - 今週の勉強時間
  - 今月の勉強時間
  - 総勉強時間

- **グラフ表示**
  - 科目別円グラフ（時間配分）
  - 日別棒グラフ（過去7日間）
  - 週別推移グラフ（過去4週間）

- **カレンダービュー**
  - 月間カレンダー表示
  - 日付ごとの勉強時間表示（ヒートマップ）
  - 日付クリックで詳細表示

### Phase 3: 発展機能（2-3日）

#### 2.4 目標設定・達成管理
**優先度：中**

- **目標設定**
  - 1日の目標勉強時間設定
  - 科目別目標時間設定
  - 週間/月間目標設定

- **達成状況**
  - 目標達成率表示（プログレスバー）
  - 達成バッジ機能
  - ストリーク表示（連続達成日数）

- **通知・リマインダー**
  - 目標達成時の通知
  - 勉強開始リマインダー（ブラウザ通知）

#### 2.5 データエクスポート
**優先度：低**

- CSV形式でのデータダウンロード
- 月次レポート生成（PDF）

## 3. 非機能要件

### 3.1 パフォーマンス
- ページ読み込み：3秒以内
- API応答時間：1秒以内
- リアルタイム更新：1秒以内の遅延

### 3.2 セキュリティ
- Row Level Security（RLS）によるデータ保護
- ユーザー間のデータ分離
- HTTPS通信
- 入力値検証とサニタイゼーション

### 3.3 ユーザビリティ
- レスポンシブデザイン（PC/タブレット/スマホ対応）
- 直感的なUI/UX
- ダークモード対応（オプション）
- キーボードショートカット（スペースキーでタイマー開始/停止）

### 3.4 可用性
- Vercelの自動スケーリング
- エラー時の適切なフィードバック
- オフライン時の一時データ保存

## 4. API設計
### 4.1 主要エンドポイント

**認証API**
- サインアップ（メール・パスワード）
- サインイン（メール・パスワード）
- サインアウト

**プロフィールAPI**
- プロフィール取得
- プロフィール更新

**勉強セッションAPI**
- セッション作成
- セッション一覧取得（ユーザー別、日付降順）
- セッション更新（終了時刻・勉強時間）

**リアルタイムAPI**
- セッション追加の購読

**集計API**
- 日次サマリー取得
- 週次サマリー取得

## 5. 画面設計

### 5.1 画面一覧

1. **ランディングページ** (`/`)
   - サービス説明
   - ログイン/サインアップボタン

2. **認証画面** (`/auth`)
   - ログインフォーム
   - サインアップフォーム
   - パスワードリセット

3. **ダッシュボード** (`/dashboard`)
   - 本日の勉強時間
   - タイマーウィジェット
   - 最近のセッション
   - 統計グラフ

4. **タイマー画面** (`/timer`)
   - 大きなタイマー表示
   - 科目選択
   - 開始/停止ボタン
   - セッション履歴

5. **統計画面** (`/stats`)
   - 詳細な統計情報
   - グラフ各種
   - カレンダービュー

6. **目標設定画面** (`/goals`)
   - 目標一覧
   - 新規目標作成
   - 達成状況

7. **プロフィール画面** (`/profile`)
   - ユーザー情報編集
   - 科目管理
   - データエクスポート


## 6. 開発マイルストーン

### Phase 1 (3-4日)
- [ ] Supabaseプロジェクトセットアップ
- [ ] 認証機能実装
- [ ] 基本的なタイマー機能
- [ ] セッションCRUD操作
- [ ] 基本的なUIレイアウト

### Phase 2 (2-3日)
- [ ] ダッシュボード実装
- [ ] グラフ表示機能
- [ ] カレンダービュー
- [ ] データ集計処理

### Phase 3 (2-3日)
- [ ] 目標設定機能
- [ ] 通知機能
- [ ] レスポンシブ対応
- [ ] パフォーマンス最適化
- [ ] テスト・バグ修正

## 7. 今後の拡張可能性も考えて実装

- ソーシャル機能（友達と勉強時間共有）
- 学習内容の詳細記録（ノート機能）



## 9. リスクと対策

| リスク | 影響度 | 対策 |
|-------|--------|------|
| Supabase無料枠超過 | 中 | 使用量モニタリング、効率的なクエリ設計 |
| リアルタイム同期の遅延 | 高 | ローカルステート管理、楽観的UI更新 |
| データ消失 | 高 | 定期バックアップ、ローカルストレージ活用 |
| 学習曲線の高さ | 中 | 段階的実装、ドキュメント参照 |
