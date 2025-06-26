"use server"

import { SignupSchema } from "@/schemas"
import { createClient } from "@/utils/supabase/server"
import { z } from "zod"

// アカウント作成
export const signup = async (values: z.infer<typeof SignupSchema>) => {
  try {
    const supabase = await createClient()

    // アカウント作成
    const { data, error: signupError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/signup/verify`,
      },
    })

    // エラーハンドリングを改善
    if (signupError) {
      console.error("Signup error:", signupError)
      
      // Supabaseの実際のエラーメッセージを使用
      if (signupError.message.includes("User already registered")) {
        return {
          error: "このメールアドレスは既に登録されています。ログインするか、別のメールアドレスをお使いください。"
        }
      } else if (signupError.message.includes("Invalid email")) {
        return {
          error: "有効なメールアドレスを入力してください。"
        }
      } else if (signupError.message.includes("Password should be")) {
        return {
          error: "パスワードは8文字以上で入力してください。"
        }
      }
      
      // その他のエラーは元のメッセージを表示
      return { error: signupError.message }
    }

    // ユーザーが作成されたか確認
    if (!data?.user) {
      return { error: "アカウントの作成に失敗しました。もう一度お試しください。" }
    }

    // identitiesのチェック（メール認証が必要な場合）
    if (data.user.identities && data.user.identities.length === 0) {
      console.log("Email confirmation required or user already exists")
      return {
        error: "このメールアドレスは既に使用されています。メールボックスを確認するか、別のメールアドレスをお使いください。"
      }
    }

    console.log("Account created successfully for:", values.email)

    // プロフィールの作成（トリガーがある場合は不要だが、フォールバックとして実行）
    // gradeがある場合は数値に変換
    const profileData: any = {
      id: data.user.id,
      email: values.email,
      name: values.name || ''
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert(profileData)

    // プロフィールエラーは警告のみ（トリガーで作成される場合もあるため）
    if (profileError) {
      console.warn("Profile creation warning:", profileError.message)
      // UNIQUE制約違反の場合は、既にトリガーで作成されている可能性が高い
      if (!profileError.message.includes('duplicate key') && !profileError.message.includes('unique constraint')) {
        console.error("Unexpected profile error:", profileError)
      }
    }

    return { success: true }
  } catch (err) {
    console.error("Unexpected signup error:", err)
    return { 
      error: "予期しないエラーが発生しました。しばらく待ってからもう一度お試しください。" 
    }
  }
}
