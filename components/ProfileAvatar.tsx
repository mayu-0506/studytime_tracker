"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/AuthContext"
import { getProfile } from "@/actions/profile"
import { ProfileType } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"

export default function ProfileAvatar() {
  const router = useRouter()
  const { user } = useUser()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const profileData = await getProfile(user.id)
        setProfile(profileData)
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const handleClick = () => {
    router.push("/profile")
  }

  if (!user || loading) {
    return null
  }

  // ユーザー名の最初の文字を取得（フォールバック用）
  const fallbackText = profile?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"

  return (
    <Avatar
      className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
      onClick={handleClick}
    >
      <AvatarImage 
        src={profile?.avatar_url || undefined} 
        alt={profile?.name || "プロフィール画像"}
      />
      <AvatarFallback className="bg-gray-300 text-gray-700">
        {profile?.avatar_url === null ? (
          <User className="h-4 w-4" />
        ) : (
          fallbackText
        )}
      </AvatarFallback>
    </Avatar>
  )
}