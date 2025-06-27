import { PresetSubject } from './database'

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

// 旧SubjectType（互換性のため残す）
export interface SubjectType {
    id: string
    user_id: string | null  // nullの場合はプリセット科目
    name: string
    color: string | null  // カラーコード（#FFFFFFフォーマット）
    created_at: string | null
  }

// カスタム科目の型定義
export interface CustomSubjectType {
    id: string
    user_id: string
    name: string
    color: string | null
    created_at: string
    updated_at: string
  }

// 学習セッションの型定義（新DB構造対応）
export interface StudySessionType {
    id: string
    user_id: string
    // 旧構造（互換性のため）
    subject_id?: string
    // 新構造
    preset_subject?: PresetSubject | null
    custom_subject_id?: string | null
    start_time: string
    end_time?: string | null
    duration?: number | null  // 旧構造（互換性のため）
    duration_min?: number | null  // 新構造：分単位
    memo?: string | null  // Markdown形式のメモ
    source?: 'timer' | 'manual'  // 新構造：記録元
    created_at: string
    updated_at?: string
    // リレーション
    subject?: SubjectType  // 旧構造（互換性のため）
    custom_subject?: CustomSubjectType  // 新構造
  }

// 目標の型定義
export interface GoalType {
    id: string
    user_id: string
    type: 'daily' | 'weekly' | 'monthly'
    target_minutes: number
    start_date: string
    end_date?: string | null
    created_at: string
    updated_at: string
  }

// バッジの型定義
export interface BadgeType {
    id: string
    user_id: string
    type: string
    name: string
    description: string
    achieved_at: string
    created_at: string
  }

// 通知の型定義
export interface NotificationType {
    id: string
    user_id: string
    type: string
    title: string
    message: string
    is_read: boolean
    created_at: string
  }