"use server"

import { createClient } from "@/utils/supabase/server"
import { SubjectType } from "@/types"
import { revalidatePath } from "next/cache"

// 科目一覧取得（プリセット + ユーザーのカスタム科目）
export async function getSubjects(): Promise<{ success: boolean; data?: SubjectType[]; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    // プリセット科目（user_id IS NULL）とユーザーのカスタム科目を取得
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order("user_id", { ascending: true, nullsFirst: true }) // プリセットを先に表示
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error fetching subjects:", error)
      return { success: false, error: "科目の取得に失敗しました" }
    }
    
    // is_custom フラグを追加（user_id が存在すればカスタム科目）
    const subjectsWithCustomFlag = data?.map(subject => ({
      ...subject,
      is_custom: !!subject.user_id
    })) || []
    
    return { success: true, data: subjectsWithCustomFlag }
  } catch (error) {
    console.error("Unexpected error in getSubjects:", error)
    return { success: false, error: "予期しないエラーが発生しました" }
  }
}

// プリセット科目のみ取得
export async function getPresetSubjects(): Promise<SubjectType[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .is("user_id", null)
    .order("name")
  
  if (error) {
    console.error("Error fetching preset subjects:", error)
    return []
  }
  
  return data || []
}

// 科目作成
export async function createSubject(
  name: string, 
  color: string,
  colorHex?: string // 後方互換性のため残す（使用しない）
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    const { error } = await supabase
      .from("subjects")
      .insert({ 
        name: name.trim(), 
        color: colorHex || color, // colorHexが渡された場合はそれを使用
        user_id: user.id 
      })
    
    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "この科目名は既に登録されています" }
      }
      console.error("Error creating subject:", error)
      return { success: false, error: "科目の作成に失敗しました" }
    }
    
    revalidatePath("/subjects")
    revalidatePath("/main")
    return { success: true }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}

// 科目削除
export async function deleteSubject(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id) // 安全性のため、user_idも確認
    
    if (error) {
      console.error("Error deleting subject:", error)
      return { success: false, error: "科目の削除に失敗しました" }
    }
    
    revalidatePath("/subjects")
    revalidatePath("/main")
    return { success: true }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}