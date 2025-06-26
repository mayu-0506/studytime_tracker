"use server"

import { createClient } from "@/utils/supabase/server"
import { ProfileType } from "@/types"
import { v4 as uuidv4 } from "uuid"
import { decode } from "base64-arraybuffer"

interface UpdateProfileData {
  name?: string
  introduce?: string
  grade?: string
  target_school?: string
  current_school?: string
  avatar_url?: string
}

// プロフィール取得
export const getProfile = async (userId: string): Promise<ProfileType | null> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()
  
  if (error) {
    console.error("Error fetching profile:", error)
    return null
  }
  
  return data
}

// プロフィール作成または取得
export const getOrCreateProfile = async (userId: string): Promise<ProfileType | null> => {
  const supabase = await createClient()
  
  // 既存のプロフィールを取得
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()
  
  // プロフィールが存在しない場合は作成
  if (error && error.code === 'PGRST116') {
    const { data: user } = await supabase.auth.getUser()
    
    // emailフィールドの処理を統一
    const email = user?.user?.email || ''
    const name = email.split('@')[0] || 'User'
    
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        name: name.substring(0, 50), // 名前の長さ制限
        email: email.substring(0, 255), // emailの長さ制限
        introduce: null,
        avatar_url: null,
        grade: null,
        target_school: null,
        current_school: null
      })
      .select()
      .single()
    
    if (insertError) {
      console.error("Error creating profile:", insertError)
      console.error("Attempted data:", { id: userId, name, email })
      return null
    }
    
    profile = newProfile
  } else if (error) {
    console.error("Error fetching profile:", error)
    return null
  }
  
  return profile
}

// プロフィール更新
export const updateProfile = async (
  userId: string,
  data: UpdateProfileData,
  base64Image?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = await createClient()
    const updateData: UpdateProfileData = { ...data }
    
    // 画像のアップロード処理
    if (base64Image) {
      const matches = base64Image.match(/^data:(.+);base64,(.+)$/)
      
      if (!matches || matches.length !== 3) {
        return { success: false, error: "無効な画像データです" }
      }
      
      const contentType = matches[1]
      const base64Data = matches[2]
      const fileExt = contentType.split("/")[1]
      const fileName = `${uuidv4()}.${fileExt}`
      
      // 古い画像を取得
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single()
      
      // 新しい画像をアップロード
      const { error: storageError } = await supabase.storage
        .from("profile")
        .upload(`${userId}/${fileName}`, decode(base64Data), {
          contentType,
          upsert: false
        })
      
      if (storageError) {
        return { success: false, error: storageError.message }
      }
      
      // 古い画像を削除（エラーは無視）
      if (profile?.avatar_url) {
        try {
          const oldFileName = profile.avatar_url.split("/").slice(-1)[0]
          await supabase.storage
            .from("profile")
            .remove([`${userId}/${oldFileName}`])
        } catch (removeError) {
          console.warn("古い画像の削除に失敗しましたが、処理を続行します:", removeError)
        }
      }
      
      // 新しい画像URLを取得
      const { data: urlData } = supabase.storage
        .from("profile")
        .getPublicUrl(`${userId}/${fileName}`)
      
      updateData.avatar_url = urlData.publicUrl
    }
    
    // プロフィール更新
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    // Auth metadataもクリーンアップ（レガシーデータの削除）
    await supabase.auth.updateUser({
      data: {
        display_name: undefined,
        bio: undefined,
        grade: undefined,
        target_school: undefined,
        current_school: undefined,
        profile_image: undefined,
        avatar_url: undefined
      }
    })
    
    return { success: true }
  } catch (err) {
    console.error("Profile update error:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}