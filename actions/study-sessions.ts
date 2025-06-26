"use server"

import { createClient } from "@/utils/supabase/server"
import { StudySessionType, SubjectType } from "@/types"
import { revalidatePath } from "next/cache"

/**
 * 学習セッションを作成
 */
export async function createSession(
  subjectId: string,
  startTime: Date = new Date()
): Promise<{ data: StudySessionType | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: "認証が必要です" }
    }
    
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        start_time: startTime.toISOString(),
      })
      .select(`
        *,
        subject:subjects(*)
      `)
      .single()
    
    if (error) {
      console.error("Error creating session:", error)
      // スキーマキャッシュエラーの場合
      if (error.message?.includes('schema cache') || error.message?.includes('refresh')) {
        return { data: null, error: "セッション保存に失敗しました。再読込みしてください。" }
      }
      return { data: null, error: error.message }
    }
    
    revalidatePath("/study")
    return { data, error: null }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { data: null, error: "エラーが発生しました" }
  }
}

/**
 * 学習セッションを更新（終了時刻と時間を記録）
 */
export async function updateSession(
  sessionId: string,
  updates: {
    end_time?: Date
    duration?: number
    memo?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    const updateData: any = {}
    
    if (updates.end_time) {
      updateData.end_time = updates.end_time.toISOString()
    }
    if (updates.duration !== undefined) {
      updateData.duration = updates.duration
    }
    if (updates.memo !== undefined) {
      updateData.memo = updates.memo
    }
    
    const { error } = await supabase
      .from("study_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error updating session:", error)
      // スキーマキャッシュエラーの場合
      if (error.message?.includes('schema cache') || error.message?.includes('refresh')) {
        return { success: false, error: "セッション保存に失敗しました。再読込みしてください。" }
      }
      return { success: false, error: error.message }
    }
    
    revalidatePath("/study")
    return { success: true }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}

/**
 * 手動で学習セッションを追加
 */
export async function createManualSession(
  data: {
    subjectId: string
    startTime: Date
    endTime: Date
    memo?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    // 時間を分単位で計算
    const duration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60))
    
    const { error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user.id,
        subject_id: data.subjectId,
        start_time: data.startTime.toISOString(),
        end_time: data.endTime.toISOString(),
        duration,
        memo: data.memo || null,
      })
    
    if (error) {
      console.error("Error creating manual session:", error)
      // スキーマキャッシュエラーの場合
      if (error.message?.includes('schema cache') || error.message?.includes('refresh')) {
        return { success: false, error: "セッション保存に失敗しました。再読込みしてください。" }
      }
      return { success: false, error: error.message }
    }
    
    revalidatePath("/study")
    return { success: true }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}

/**
 * アクティブなセッションを取得
 */
export async function getActiveSession(): Promise<StudySessionType | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from("study_sessions")
      .select(`
        *,
        subject:subjects(*)
      `)
      .eq("user_id", user.id)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      if (error.code !== "PGRST116") { // not found
        console.error("Error fetching active session:", error)
      }
      return null
    }
    
    return data
  } catch (err) {
    console.error("Unexpected error:", err)
    return null
  }
}

/**
 * 今日の学習セッションを取得
 */
export async function getTodaySessions(): Promise<StudySessionType[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data, error } = await supabase
      .from("study_sessions")
      .select(`
        *,
        subject:subjects(*)
      `)
      .eq("user_id", user.id)
      .gte("start_time", today.toISOString())
      .order("start_time", { ascending: false })
    
    if (error) {
      console.error("Error fetching today's sessions:", error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error("Unexpected error:", err)
    return []
  }
}

/**
 * 科目別の学習時間サマリーを取得
 */
export async function getSubjectSummary(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{ subject_id: string; total_duration: number; subject?: SubjectType }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    let query = supabase
      .from("study_sessions")
      .select(`
        subject_id,
        duration,
        subject:subjects(*)
      `)
      .eq("user_id", user.id)
      .not("duration", "is", null)
    
    if (startDate) {
      query = query.gte("start_time", startDate.toISOString())
    }
    if (endDate) {
      query = query.lte("start_time", endDate.toISOString())
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error("Error fetching subject summary:", error)
      return []
    }
    
    // 科目ごとに集計
    const summary = new Map<string, { subject: SubjectType | undefined; total: number }>()
    
    data?.forEach(session => {
      const subjectId = session.subject_id
      const subject = session.subject as unknown as SubjectType | undefined
      const duration = session.duration || 0
      
      const current = summary.get(subjectId) || { subject, total: 0 }
      current.total += duration
      summary.set(subjectId, current)
    })
    
    return Array.from(summary.entries()).map(([id, data]) => ({
      subject_id: id,
      total_duration: data.total,
      subject: data.subject
    }))
  } catch (err) {
    console.error("Unexpected error:", err)
    return []
  }
}

/**
 * セッションを削除
 */
export async function deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    const { error } = await supabase
      .from("study_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error deleting session:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/study")
    return { success: true }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}