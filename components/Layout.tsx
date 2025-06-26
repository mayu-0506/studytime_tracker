"use client"

import Link from "next/link"
import { useUser } from "@/contexts/AuthContext"
import { Settings, Timer, BarChart3 } from "lucide-react"
import ProfileAvatar from "@/components/ProfileAvatar"

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useUser()

  return (
    <>
      <header className="border-b">
        <div className="mx-auto max-w-screen-lg px-2 py-5 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            Study Time Tracker
          </Link>
          
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition"
                >
                  <BarChart3 className="w-4 h-4" />
                  ダッシュボード
                </Link>
                <Link
                  href="/study"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition"
                >
                  <Timer className="w-4 h-4" />
                  タイマー
                </Link>
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition"
                >
                  <Settings className="w-4 h-4" />
                  設定
                </Link>
                <ProfileAvatar />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  今すぐ始める
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      
      {children}
    </>
  )
}