export interface ProfileType {
    id: string
    name: string
    email?: string | null
    introduce: string | null
    avatar_url: string | null
    grade?: string | null
    target_school?: string | null
    current_school?: string | null
    created_at?: string
    updated_at?: string
  }

// Supabaseのsubjectsテーブルと一致する型定義
// database.types.tsから直接インポートすることを推奨
export interface SubjectType {
    id: string
    user_id: string | null  // nullの場合はプリセット科目
    name: string
    color: string | null  // カラーコード（#FFFFFFフォーマット）
    created_at: string | null
  }

// 学習セッションの型定義
export interface StudySessionType {
    id: string
    user_id: string
    subject_id: string
    start_time: string
    end_time?: string | null
    duration?: number | null  // 分単位
    memo?: string | null  // Markdown形式のメモ
    created_at: string
    updated_at?: string
    // リレーション
    subject?: SubjectType
  }