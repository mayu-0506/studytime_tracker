import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // 1. 最新のセッションを確認
    const { data: sessions, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    // 2. アクティブなセッションを確認
    const { data: activeSession, error: activeError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .is("end_time", null)
      .order("created_at", { ascending: false })
      .limit(1)

    // 3. テスト更新（最新のセッションを使用）
    let updateTest = null
    if (sessions && sessions.length > 0) {
      const testSession = sessions[0]
      const { data: updated, error: updateError } = await supabase
        .from("study_sessions")
        .update({ 
          duration: 99, 
          memo: `Test update at ${new Date().toISOString()}` 
        })
        .eq("id", testSession.id)
        .eq("user_id", user.id)
        .select()
        .single()

      updateTest = {
        targetId: testSession.id,
        updateResult: updated,
        updateError
      }
    }

    return NextResponse.json({
      userId: user.id,
      recentSessions: {
        data: sessions,
        error: sessionsError
      },
      activeSession: {
        data: activeSession,
        error: activeError
      },
      updateTest
    }, { status: 200 })

  } catch (error) {
    console.error("Test session API error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}