"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const useUser = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useUser must be used within AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // 初期状態をセッションから取得
    const initAuth = async () => {
      try {
        // セッションを取得
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('AuthProvider getSession:', session?.user?.email, sessionError)
        
        if (session?.user) {
          setUser(session.user)
        } else {
          // セッションがない場合はgetUserを試行
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          console.log('AuthProvider getUser:', user?.email, userError)
          // ユーザーがnullまたはエラーの場合は明示的にnullを設定
          if (!user || userError) {
            setUser(null)
          } else {
            setUser(user)
          }
        }
      } catch (error) {
        console.error('AuthProvider auth init error:', error)
        setUser(null)
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
      console.log('AuthProvider auth state changed:', event, session?.user?.email)
      setUser(session?.user ?? null)
      // 必ずloadingをfalseに設定
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}