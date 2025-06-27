import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // 1. 現在進行中のセッション
    const { data: activeSessions, error: activeError } = await supabase
      .from("study_sessions")
      .select(`
        id,
        user_id,
        subject_id,
        preset_subject,
        custom_subject_id,
        start_time,
        end_time,
        duration,
        duration_min,
        created_at,
        source,
        custom_subjects (
          id,
          name,
          color
        )
      `)
      .eq("user_id", user.id)
      .is("end_time", null)
      .order("created_at", { ascending: false })

    // 2. 最近のセッション（完了含む）
    const { data: recentSessions, error: recentError } = await supabase
      .from("study_sessions")
      .select(`
        id,
        user_id,
        subject_id,
        preset_subject,
        custom_subject_id,
        start_time,
        end_time,
        duration,
        duration_min,
        created_at,
        source,
        custom_subjects (
          id,
          name,
          color
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    // 3. ユーザーの科目一覧
    const { data: subjects, error: subjectsError } = await supabase
      .from("custom_subjects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // 4. 旧subjectsテーブルのプリセット科目
    const { data: presetSubjects, error: presetError } = await supabase
      .from("subjects")
      .select("*")
      .is("user_id", null)
      .order("name")

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      activeSessions: {
        count: activeSessions?.length || 0,
        data: activeSessions,
        error: activeError
      },
      recentSessions: {
        count: recentSessions?.length || 0,
        data: recentSessions,
        error: recentError
      },
      subjects: {
        custom: subjects,
        preset: presetSubjects,
        errors: {
          custom: subjectsError,
          preset: presetError
        }
      }
    })

  } catch (error) {
    console.error("Debug session info error:", error)
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 })
  }
}