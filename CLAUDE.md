# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**勉強時間トラッカー (Study Time Tracker)** - 高校生・受験生向けの科目別勉強時間記録・可視化 Web アプリ

### 技術スタック
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend/DB**: Supabase (Auth, Database, Realtime)
- **Forms**: React Hook Form
- **Charts**: Chart.js + react-chartjs-2
- **Hosting**: Vercel

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動 (http://localhost:3000)
npm run build    # プロダクションビルド
npm run start    # プロダクションサーバー起動
npm run lint     # ESLint 実行
```

## アーキテクチャ

### ディレクトリ構造
```
src/
├── app/          # Next.js App Router
├── components/   # React コンポーネント
├── hooks/        # カスタムフック
├── lib/          # 外部ライブラリ設定 (Supabase クライアント等)
├── types/        # TypeScript 型定義
└── utils/        # ユーティリティ関数
```

### データベーススキーマ
```typescript
// User: ユーザー情報
interface User {
  id: string
  email: string
  created_at: string
}

// Subject: 科目マスタ
interface Subject {
  id: string
  user_id: string
  name: string
  color?: string
  created_at: string
}

// StudySession: 勉強セッション記録
interface StudySession {
  id: string
  user_id: string
  subject_id: string
  start_time: string
  end_time?: string
  duration?: number
  note?: string
  created_at: string
}
```

## 開発フェーズ

1. **Phase 1** (3-4日): 認証・タイマー・セッション CRUD
2. **Phase 2** (2-3日): ダッシュボード・グラフ・カレンダー可視化
3. **Phase 3** (2-3日): 目標設定・通知・パフォーマンス最適化

## 重要な開発規約

### コード出力形式
必ず以下の形式で出力:
```
// ファイルパス
コードブロック
```

### 開発原則
1. **1回の回答 = 1機能/小さな差分** に限定
2. **型安全性重視** - TypeScript の strict mode を活用
3. **RLS (Row Level Security)** を前提とした Supabase クエリ
4. **最小限のコメント** - コード内に必要最小限のみ
5. **パスエイリアス使用** - `@/` で `src/` を参照

### 環境変数
`.env.local` に以下を設定:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase 設定
- クライアントは `src/lib/supabase.ts` で初期化済み
- SSR 対応のため `@supabase/ssr` を使用
- RLS ポリシーを前提にクエリを実装

## 補足情報
- 要件定義書: `docs/要件定義書.rtf`
- テストフレームワーク: 未設定（必要に応じて追加）
- CI/CD: Vercel の自動デプロイを想定

## デバッグ機能
- 認証デバッグガイド: `docs/AUTH-DEBUG-GUIDE.md`
- DBテストAPI: `/api/test-db` - データベース接続確認用エンドポイント

-----------------
## Gemini CLI 連携ガイド

### 目的
ユーザーが **「Geminiと相談しながら進めて」** （または同義語）と指示した場合、Claude は以降のタスクを **Gemini CLI** と協調しながら進める。
Gemini から得た回答はそのまま提示し、Claude 自身の解説・統合も付け加えることで、両エージェントの知見を融合する。

---

### トリガー
- 正規表現: `/Gemini.*相談しながら/`
- 例:
- 「Geminiと相談しながら進めて」
- 「この件、Geminiと話しつつやりましょう」
- 「gemini」

---

### 基本フロー
1. **PROMPT 生成**
Claude はユーザーの要件を 1 つのテキストにまとめ、環境変数 `$PROMPT` に格納する。

2. **Gemini CLI 呼び出し**
```bash-
gemini <<EOF
$PROMPT
EOF