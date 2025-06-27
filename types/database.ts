export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ENUM型の定義
export type PresetSubject = '数学' | '英語' | '国語' | '理科' | '社会' | 'その他'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string | null
          introduce: string | null
          avatar_url: string | null
          grade: string | null
          target_school: string | null
          current_school: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email?: string | null
          introduce?: string | null
          avatar_url?: string | null
          grade?: string | null
          target_school?: string | null
          current_school?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          introduce?: string | null
          avatar_url?: string | null
          grade?: string | null
          target_school?: string | null
          current_school?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      custom_subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          color_hex: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color_hex: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color_hex?: string
          created_at?: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          preset_subject: PresetSubject | null
          custom_subject_id: string | null
          start_time: string
          end_time: string | null
          duration_min: number | null
          memo: string | null
          source: 'timer' | 'manual'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preset_subject?: PresetSubject | null
          custom_subject_id?: string | null
          start_time: string
          end_time?: string | null
          duration_min?: number | null
          memo?: string | null
          source: 'timer' | 'manual'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preset_subject?: PresetSubject | null
          custom_subject_id?: string | null
          start_time?: string
          end_time?: string | null
          duration_min?: number | null
          memo?: string | null
          source?: 'timer' | 'manual'
          created_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          type: 'daily' | 'weekly' | 'monthly'
          target_minutes: number
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'daily' | 'weekly' | 'monthly'
          target_minutes: number
          start_date: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'daily' | 'weekly' | 'monthly'
          target_minutes?: number
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          user_id: string
          type: string
          name: string
          description: string
          achieved_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          name: string
          description: string
          achieved_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          name?: string
          description?: string
          achieved_at?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          is_read?: boolean
          created_at?: string
        }
      }
      // 互換性のための旧subjects テーブル（将来的に削除予定）
      subjects: {
        Row: {
          id: string
          user_id: string | null
          name: string
          color: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          color?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          color?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      preset_subject: PresetSubject
    }
  }
}

// 型エクスポート
export type StudySession = Database['public']['Tables']['study_sessions']['Row']
export type CustomSubject = Database['public']['Tables']['custom_subjects']['Row']

// プリセット科目の定義（ハードコード）
export const PRESET_SUBJECTS: Record<PresetSubject, { color: string }> = {
  '数学': { color: '#4ECDC4' },
  '英語': { color: '#45B7D1' },
  '国語': { color: '#FF6B6B' },
  '理科': { color: '#96CEB4' },
  '社会': { color: '#F4A460' },
  'その他': { color: '#95A5A6' }
}