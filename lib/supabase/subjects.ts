import { createClient } from '@/utils/supabase/client'
import { CustomSubject, PresetSubject, PRESET_SUBJECTS } from '@/types/database'

// 統合された科目型
export interface Subject {
  id: string
  name: string
  color: string
  isPreset: boolean
  presetKey?: PresetSubject
}

// プリセット科目の取得
export function getPresetSubjects(): Subject[] {
  return Object.entries(PRESET_SUBJECTS).map(([key, value]) => ({
    id: `preset_${key}`,
    name: key,
    color: value.color,
    isPreset: true,
    presetKey: key as PresetSubject
  }))
}

// カスタム科目の取得
export async function getCustomSubjects(userId: string): Promise<CustomSubject[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('custom_subjects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching custom subjects:', error)
    return []
  }
  
  return data || []
}

// すべての科目を統合して取得
export async function getAllSubjects(userId: string): Promise<Subject[]> {
  // プリセット科目
  const presetSubjects = getPresetSubjects()
  
  // カスタム科目
  const customSubjects = await getCustomSubjects(userId)
  
  // カスタム科目を変換
  const convertedCustomSubjects: Subject[] = customSubjects.map(subject => ({
    id: subject.id,
    name: subject.name,
    color: subject.color_hex,
    isPreset: false
  }))
  
  // プリセット科目を先に、カスタム科目を後に
  return [...presetSubjects, ...convertedCustomSubjects]
}

// 科目IDから科目情報を取得
export async function getSubjectById(subjectId: string, userId: string): Promise<Subject | null> {
  // プリセット科目かチェック
  if (subjectId.startsWith('preset_')) {
    const presetKey = subjectId.replace('preset_', '') as PresetSubject
    if (presetKey in PRESET_SUBJECTS) {
      return {
        id: subjectId,
        name: presetKey,
        color: PRESET_SUBJECTS[presetKey].color,
        isPreset: true,
        presetKey
      }
    }
  }
  
  // カスタム科目として検索
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_subjects')
    .select('*')
    .eq('id', subjectId)
    .eq('user_id', userId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return {
    id: data.id,
    name: data.name,
    color: data.color_hex,
    isPreset: false
  }
}

// カスタム科目の作成
export async function createCustomSubject(
  userId: string,
  name: string,
  colorHex: string
): Promise<{ success: boolean; data?: CustomSubject; error?: string }> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('custom_subjects')
    .insert({
      user_id: userId,
      name,
      color_hex: colorHex
    })
    .select()
    .single()
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

// カスタム科目の削除
export async function deleteCustomSubject(
  subjectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('custom_subjects')
    .delete()
    .eq('id', subjectId)
    .eq('user_id', userId)
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}