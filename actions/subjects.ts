"use server"

import { createClient } from "@/utils/supabase/server"
import { SubjectType, CustomSubjectType } from "@/types"
import { PresetSubject, PRESET_SUBJECTS } from "@/types/database"
import { revalidatePath } from "next/cache"

// 新しいDB構造に対応した科目型
export type SubjectItem = {
  id: string
  name: string
  color: string
  isPreset: boolean
  presetKey?: PresetSubject
}

// すべての科目を取得（プリセット + カスタム）
export async function getAllSubjects(): Promise<{ success: boolean; data?: SubjectItem[]; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    // カスタム科目を取得
    const { data: customSubjects, error } = await supabase
      .from("custom_subjects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error fetching custom subjects:", error)
      return { success: false, error: "科目の取得に失敗しました" }
    }
    
    // プリセット科目とカスタム科目を統合
    const allSubjects: SubjectItem[] = [
      // プリセット科目
      ...Object.entries(PRESET_SUBJECTS).map(([key, value]) => ({
        id: `preset_${key}`,
        name: key,
        color: value.color,
        isPreset: true,
        presetKey: key as PresetSubject
      })),
      // カスタム科目
      ...(customSubjects || []).map(subject => ({
        id: subject.id,
        name: subject.name,
        color: subject.color_hex || '#95A5A6',
        isPreset: false
      }))
    ]
    
    return { success: true, data: allSubjects }
  } catch (error) {
    console.error("Unexpected error in getAllSubjects:", error)
    return { success: false, error: "予期しないエラーが発生しました" }
  }
}

// 旧API（互換性のため残す）
export async function getSubjects(): Promise<{ success: boolean; data?: SubjectType[]; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    // 旧subjects テーブルから取得（互換性のため）
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order("user_id", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error fetching subjects:", error)
      return { success: false, error: "科目の取得に失敗しました" }
    }
    
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

// カスタム科目作成
export async function createCustomSubject(
  name: string, 
  color: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('=== カスタム科目追加デバッグ開始 ===')
    console.log('追加しようとしているデータ:', { name, color })
    
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    console.log('現在のユーザー:', user ? { id: user.id, email: user.email } : 'null')
    
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    // custom_subjectsのカラム名を確認
    const insertData = { 
      name: name.trim(), 
      color_hex: color, // color_hexカラムを使用
      user_id: user.id 
    }
    console.log('挿入データ:', insertData)
    
    const { data, error } = await supabase
      .from("custom_subjects")
      .insert(insertData)
      .select()
    
    if (error) {
      console.error('Supabase詳細エラー:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      if (error.code === "23505") {
        return { success: false, error: "この科目名は既に登録されています" }
      }
      return { success: false, error: `科目の作成に失敗しました: ${error.message}` }
    }
    
    console.log('作成成功:', data)
    
    revalidatePath("/subjects")
    revalidatePath("/main")
    revalidatePath("/study")
    return { success: true }
  } catch (err) {
    console.error("予期しないエラー:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}

// 旧API（互換性のため残す）
export async function createSubject(
  name: string, 
  color: string,
  colorHex?: string
): Promise<{ success: boolean; error?: string }> {
  // 新しいAPIを呼び出す
  return createCustomSubject(name, colorHex || color)
}

// カスタム科目削除
export async function deleteCustomSubject(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    const { error } = await supabase
      .from("custom_subjects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id) // 安全性のため、user_idも確認
    
    if (error) {
      console.error("Error deleting custom subject:", error)
      return { success: false, error: "科目の削除に失敗しました" }
    }
    
    revalidatePath("/subjects")
    revalidatePath("/main")
    revalidatePath("/study")
    return { success: true }
  } catch (err) {
    console.error("Unexpected error:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}

// 旧API（互換性のため残す）
export async function deleteSubject(id: string): Promise<{ success: boolean; error?: string }> {
  // プリセット科目かどうかを判定
  if (Object.keys(PRESET_SUBJECTS).includes(id)) {
    return { success: false, error: "プリセット科目は削除できません" }
  }
  // カスタム科目として削除
  return deleteCustomSubject(id)
}