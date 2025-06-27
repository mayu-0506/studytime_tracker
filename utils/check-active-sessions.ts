import { createClient } from "@/utils/supabase/client"

/**
 * ユーザーのアクティブなセッションを確認
 * 複数のアクティブセッションがある場合は警告
 */
export async function checkActiveSessions(userId: string): Promise<{
  hasMultiple: boolean
  sessions: any[]
}> {
  const supabase = createClient()
  
  const { data: activeSessions, error } = await supabase
    .from("study_sessions")
    .select("id, start_time, subject_id, preset_subject, custom_subject_id")
    .eq("user_id", userId)
    .is("end_time", null)
    .order("start_time", { ascending: false })
  
  if (error) {
    console.error("Failed to check active sessions:", error)
    return { hasMultiple: false, sessions: [] }
  }
  
  const sessions = activeSessions || []
  
  if (sessions.length > 1) {
    console.warn(`⚠️ Multiple active sessions detected: ${sessions.length} sessions`, sessions)
  }
  
  return {
    hasMultiple: sessions.length > 1,
    sessions
  }
}

/**
 * 古いアクティブセッションを自動的に終了させる
 */
export async function cleanupOldActiveSessions(userId: string, currentSessionId?: string) {
  const supabase = createClient()
  
  // 24時間以上前に開始されたアクティブセッションを取得
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
  
  const { data: oldSessions, error } = await supabase
    .from("study_sessions")
    .select("id, start_time")
    .eq("user_id", userId)
    .is("end_time", null)
    .lt("start_time", twentyFourHoursAgo.toISOString())
  
  if (error || !oldSessions?.length) {
    return
  }
  
  // 古いセッションを終了させる
  for (const session of oldSessions) {
    if (session.id === currentSessionId) continue
    
    const endTime = new Date(session.start_time)
    endTime.setHours(endTime.getHours() + 24) // 24時間後に自動終了
    
    await supabase
      .from("study_sessions")
      .update({
        end_time: endTime.toISOString(),
        duration: 1440, // 24時間 = 1440分
        duration_min: 1440
      })
      .eq("id", session.id)
      .eq("user_id", userId)
    
    console.log(`🧹 Auto-closed old session: ${session.id}`)
  }
}