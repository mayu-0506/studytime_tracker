import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // 特定のメールアドレスをチェック
    if (user.email !== "kyogobiz@gmail.com") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // 進行中のセッションを全て取得
    const { data: sessions, error: fetchError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .is("end_time", null)

    if (fetchError) {
      console.error("Failed to fetch sessions:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    console.log("Found sessions to force stop:", sessions)

    // 全ての進行中セッションを終了
    if (sessions && sessions.length > 0) {
      const endTime = new Date().toISOString()
      
      for (const session of sessions) {
        const startTime = new Date(session.start_time)
        const duration = Math.max(1, Math.round((new Date().getTime() - startTime.getTime()) / (1000 * 60)))
        
        const { error: updateError } = await supabase
          .from("study_sessions")
          .update({
            end_time: endTime,
            duration_min: duration,
            duration: duration,
            memo: "強制終了されました"
          })
          .eq("id", session.id)
          .eq("user_id", user.id)

        if (updateError) {
          console.error(`Failed to update session ${session.id}:`, updateError)
        } else {
          console.log(`Successfully force stopped session ${session.id}`)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${sessions?.length || 0}個のセッションを強制終了しました`,
      sessions: sessions
    })

  } catch (error) {
    console.error("Force stop error:", error)
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 })
  }
}