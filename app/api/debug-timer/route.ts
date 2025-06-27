import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

// タイマーの問題をデバッグするためのAPIエンドポイント
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      user: { id: user.id, email: user.email }
    }

    // 1. study_sessionsテーブルの構造を確認
    const { data: testSelect, error: tableError } = await supabase
      .from("study_sessions")
      .select("*")
      .limit(0)
    
    results.tableAccess = tableError ? { error: tableError.message, details: tableError } : "OK"

    // 2. custom_subjectsテーブルへのアクセス
    const { data: customSubjects, error: customError } = await supabase
      .from("custom_subjects")
      .select("*")
      .eq("user_id", user.id)
    
    results.customSubjects = {
      count: customSubjects?.length || 0,
      error: customError?.message || null,
      sample: customSubjects?.[0] || null
    }

    // 3. 最新のstudy_sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3)
    
    results.recentSessions = {
      count: sessions?.length || 0,
      error: sessionsError?.message || null,
      data: sessions?.map(s => ({
        id: s.id,
        preset_subject: s.preset_subject,
        custom_subject_id: s.custom_subject_id,
        start_time: s.start_time,
        source: s.source,
        created_at: s.created_at
      })) || []
    }

    // 4. プリセット科目でのテスト挿入
    const testData = {
      user_id: user.id,
      preset_subject: "数学",
      start_time: new Date().toISOString(),
      source: "timer"
    }
    
    const { data: insertResult, error: insertError } = await supabase
      .from("study_sessions")
      .insert(testData)
      .select()
      .single()
    
    if (insertError) {
      results.testInsert = {
        success: false,
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        testData
      }
    } else {
      results.testInsert = {
        success: true,
        insertedId: insertResult.id
      }
      // テストデータを削除
      await supabase.from("study_sessions").delete().eq("id", insertResult.id)
    }

    // 5. アクティブなセッション
    const { data: activeSession, error: activeError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .is("end_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
    
    results.activeSession = {
      exists: !!activeSession && activeSession.length > 0,
      data: activeSession?.[0] || null,
      error: activeError?.message || null
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    console.error("Debug timer API error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, endTime, duration } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // 1. 現在のセッションを確認
    const { data: currentSession, error: fetchError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ 
        error: "Session not found", 
        details: fetchError 
      }, { status: 404 })
    }

    // 2. 手動記録と同じ形式で更新を試みる
    const updateData = {
      end_time: endTime,
      duration: duration
    }

    const { data: updated, error: updateError } = await supabase
      .from("study_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select()
      .single()

    // 3. 更新後のデータを再取得
    const { data: finalSession, error: finalError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    return NextResponse.json({
      originalSession: currentSession,
      updateData,
      updateResult: updated,
      updateError,
      finalSession,
      finalError,
      debug: {
        userId: user.id,
        sessionId,
        hasEndTime: !!finalSession?.end_time,
        hasDuration: !!finalSession?.duration,
        actualDuration: finalSession?.duration
      }
    }, { status: 200 })

  } catch (error) {
    console.error("Debug timer API error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}