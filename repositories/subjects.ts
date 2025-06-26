"use server"

import { createClient } from "@/utils/supabase/server"
import { SubjectType } from "@/types"
import { revalidatePath } from "next/cache"

// デフォルト科目のリスト
const DEFAULT_SUBJECTS = [
  { name: "英語", color: "#3B82F6" },   // Blue
  { name: "国語", color: "#EF4444" },   // Red
  { name: "数学", color: "#10B981" },   // Green
  { name: "理科", color: "#F59E0B" },   // Amber
  { name: "社会", color: "#8B5CF6" },   // Purple
]

/**
 * デフォルト科目を挿入（存在しない場合のみ）
 */
export async function ensureDefaultSubjects(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // 既存のプリセット科目を確認
    const { data: existingSubjects, error: fetchError } = await supabase
      .from("subjects")
      .select("name")
      .is("user_id", null)
      .is("is_custom", false)
    
    if (fetchError) {
      console.error("Error fetching preset subjects:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    const existingNames = new Set((existingSubjects || []).map(s => s.name))
    const subjectsToInsert = DEFAULT_SUBJECTS.filter(s => !existingNames.has(s.name))
    
    if (subjectsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("subjects")
        .insert(
          subjectsToInsert.map(s => ({
            name: s.name,
            color: s.color,
            user_id: null,
            is_custom: false
          }))
        )
      
      if (insertError) {
        console.error("Error inserting default subjects:", insertError)
        return { success: false, error: insertError.message }
      }
    }
    
    return { success: true }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}

/**
 * 科目一覧を取得（プリセット + 自分のカスタムのみ）
 */
export async function getSubjects(): Promise<{ data: SubjectType[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // デフォルト科目を確保
    await ensureDefaultSubjects()
    
    // プリセット科目 + 自分のカスタム科目を取得
    let query = supabase
      .from("subjects")
      .select("*")
      .order("is_custom", { ascending: true })
      .order("name", { ascending: true })
    
    if (user) {
      query = query.or(`user_id.is.null,user_id.eq.${user.id}`)
    } else {
      query = query.is("user_id", null)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error("Error fetching subjects:", error)
      return { data: [], error: error.message }
    }
    
    return { data: data || [] }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { data: [], error: "エラーが発生しました" }
  }
}

/**
 * カスタム科目を削除
 */
export async function deleteSubject(subjectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    // 削除前に科目情報を確認（自分の科目かチェック）
    const { data: subject, error: fetchError } = await supabase
      .from("subjects")
      .select("user_id, is_custom")
      .eq("id", subjectId)
      .single()
    
    if (fetchError || !subject) {
      return { success: false, error: "科目が見つかりません" }
    }
    
    // 自分のカスタム科目のみ削除可能
    if (subject.user_id !== user.id || !subject.is_custom) {
      return { success: false, error: "この科目は削除できません" }
    }
    
    // 関連する学習セッションがあるかチェック
    const { count, error: countError } = await supabase
      .from("study_sessions")
      .select("*", { count: "exact", head: true })
      .eq("subject_id", subjectId)
      .eq("user_id", user.id)
    
    if (countError) {
      console.error("Error checking sessions:", countError)
      return { success: false, error: "削除前のチェックでエラーが発生しました" }
    }
    
    if (count && count > 0) {
      return { success: false, error: "この科目には学習記録があるため削除できません" }
    }
    
    // 科目を削除
    const { error: deleteError } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subjectId)
      .eq("user_id", user.id)
    
    if (deleteError) {
      console.error("Error deleting subject:", deleteError)
      return { success: false, error: deleteError.message }
    }
    
    revalidatePath("/study")
    revalidatePath("/subjects")
    
    return { success: true }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}