"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Settings, Timer } from "lucide-react"

// ナビゲーション
const Navigation = () => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // 初期状態をセッションから取得
    const initAuth = async () => {
      try {
        // セッションを取得
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('Navigation getSession:', session?.user?.email, sessionError)
        
        if (session?.user) {
          setUser(session.user)
        } else {
          // セッションがない場合はgetUserを試行
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          console.log('Navigation getUser:', user?.email, userError)
          // ユーザーがnullまたはエラーの場合は明示的にnullを設定
          if (!user || userError) {
            setUser(null)
          } else {
            setUser(user)
          }
        }
      } catch (error) {
        console.error('Navigation auth init error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // タイムアウトを設定（3秒後に必ずloadingをfalseに）
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 3000)

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Navigation auth state changed:', event, session?.user?.email)
      setUser(session?.user ?? null)
      // 必ずloadingをfalseに設定
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  // ログアウト処理
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push("/")
  }

  return (
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
              <span className="text-sm text-gray-600">{user.email}</span>
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
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                ログアウト
              </button>
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
  )
}

export default Navigation