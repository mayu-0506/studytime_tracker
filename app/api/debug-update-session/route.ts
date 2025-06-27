import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { sessionId, end_time, duration } = await request.json()
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // 1. 現在のセッション情報を取得
    const { data: currentSession, error: fetchError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single()
    
    if (fetchError) {
      return NextResponse.json({ 
        error: "Failed to fetch session",
        details: fetchError 
      }, { status: 400 })
    }
    
    // 2. 更新データを準備
    const updateData = {
      end_time: end_time,
      duration_min: duration,
      duration: duration
    }
    
    console.log('DEBUG: Update data:', updateData)
    
    // 3. 更新を実行
    const { data: updateResult, error: updateError } = await supabase
      .from("study_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json({ 
        error: "Update failed",
        details: updateError,
        updateData 
      }, { status: 400 })
    }
    
    // 4. 更新後のデータを再取得
    const { data: updatedSession, error: verifyError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()
    
    return NextResponse.json({ 
      success: true,
      before: currentSession,
      updateData,
      updateResult,
      after: updatedSession,
      verifyError
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: "Internal error",
      details: error 
    }, { status: 500 })
  }
}