"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/AuthContext"
import { getOrCreateProfile } from "@/actions/profile"
import { ProfileType } from "@/types"
import Layout from "@/components/Layout"
import ProfileNew from "@/components/settings/ProfileNew"

export default function ProfileEditPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useUser()
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
        <ProfileNew profile={profile} />
      </div>
    </Layout>
  )
}