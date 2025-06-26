"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/AuthContext"
import { getOrCreateProfile } from "@/actions/profile"
import { ProfileType } from "@/types"
import Layout from "@/components/Layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, School, GraduationCap, Target, Pencil, LogOut } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useUser()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || authLoading) return

      try {
        const profileData = await getOrCreateProfile(user.id)
        setProfile(profileData)
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      if (!user) {
        router.push("/login")
      } else {
        fetchProfile()
      }
    }
  }, [user, authLoading, router])

  const handleEdit = () => {
    router.push("/profile/edit")
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/")
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-600">プロフィールが見つかりません</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">プロフィール</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>基本情報</span>
              <Button onClick={handleEdit} variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                プロフィールを編集
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-6">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name || "プロフィール画像"}
                  className="h-24 w-24 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <h2 className="text-2xl font-semibold text-gray-900">{profile.name}</h2>
              {profile.email && (
                <p className="text-gray-600 text-sm mt-1">{profile.email}</p>
              )}
            </div>

            <div className="space-y-4">
              {profile.introduce && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">自己紹介</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{profile.introduce}</p>
                </div>
              )}

              {profile.grade && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">学年</h3>
                    <p className="text-gray-900">{profile.grade}</p>
                  </div>
                </div>
              )}

              {profile.current_school && (
                <div className="flex items-center gap-2">
                  <School className="h-5 w-5 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">現在の学校</h3>
                    <p className="text-gray-900">{profile.current_school}</p>
                  </div>
                </div>
              )}

              {profile.target_school && (
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">志望校</h3>
                    <p className="text-gray-900">{profile.target_school}</p>
                  </div>
                </div>
              )}

              {!profile.introduce && !profile.grade && !profile.current_school && !profile.target_school && (
                <p className="text-gray-500 text-center py-4">
                  プロフィール情報がまだ設定されていません
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleLogout} variant="outline" className="text-red-600 hover:text-red-700">
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>
    </Layout>
  )
}