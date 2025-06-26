"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import ProfileNew from "@/components/settings/ProfileNew"
import Loading from "@/app/loading"
import { ProfileType } from "@/types"

const ProfilePageClient = () => {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // ユーザー情報を取得
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        // エラーまたはユーザーが存在しない場合
        // (main)ルートグループのlayoutで既に認証チェック済みなので、
        // ここに到達することは通常ないが、念のためチェック
        if (userError || !userData.user) {
          console.error("User not found in ProfilePageClient:", userError)
          router.push("/")
          return
        }

        // プロフィールを取得または作成
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
          // プロフィールが存在しない場合は作成
          console.log(`Creating new profile for user: ${userData.user.email}`)
          
          // emailフィールドの処理を統一（一部のemailが長すぎる可能性への対処）
          const email = userData.user.email || ''
          const name = email.split('@')[0] || 'User'
          
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: userData.user.id,
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
            console.error("Insert data:", { id: userData.user.id, name, email })
            // プロフィール作成エラー時は詳細を表示
            setProfile(null)
            setLoading(false)
            return
          }

          setProfile(newProfile)
        } else if (profileError) {
          console.error("Error fetching profile:", profileError)
          // プロフィール取得エラー時も詳細を表示
          setProfile(null)
          setLoading(false)
          return
        } else {
          setProfile(profileData)
        }
      } catch (error) {
        console.error("Error loading profile:", error)
        // 予期しないエラー時も画面に留まる
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase])

  if (loading) {
    return <Loading />
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h1>
        <p className="text-gray-600 mb-4">プロフィール情報の取得に失敗しました。</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          再読み込み
        </button>
      </div>
    )
  }

  return <ProfileNew profile={profile} />
}

export default ProfilePageClient