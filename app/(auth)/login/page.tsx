"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // ログイン前のCookieサイズ監視
    const preLoginCookieSize = document.cookie.length
    console.log(`Pre-login cookie size: ${preLoginCookieSize} bytes`)

    try {
      // 問題のあるユーザーかチェック
      const problemUsers = ['s13102502969@toyo.jp', 'kyogoate@gmail.com']
      if (problemUsers.includes(email.toLowerCase())) {
        console.log('⚠️ Problem user detected, clearing cookies first...')
        // Cookieをクリア
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        // ログイン後のCookieサイズ監視
        setTimeout(async () => {
          const postLoginCookieSize = document.cookie.length
          console.log(`Post-login cookie size: ${postLoginCookieSize} bytes`)
          
          if (postLoginCookieSize > 4096) {
            console.warn('⚠️ Large cookies detected after login. HTTP 431 risk!')
          }
          
          if (postLoginCookieSize > 8192) {
            console.error('🚨 Cookies too large! Likely HTTP 431 error')
            
            // 自動的にCookieクリーンアップを試みる
            try {
              const cleanupResponse = await fetch('/api/clear-cookies', { 
                method: 'POST',
                credentials: 'include'
              })
              
              if (cleanupResponse.ok) {
                console.log('✅ Cookies cleaned up automatically')
                // 再度ログインを試みる
                setTimeout(() => {
                  router.refresh()
                  router.push("/")
                }, 500)
                return
              }
            } catch (cleanupError) {
              console.error('Cookie cleanup failed:', cleanupError)
            }
            
            setError("セッションサイズが大きすぎます。Cookieをクリアして再度ログインしてください。")
            // Cookieエラーページにリダイレクト
            setTimeout(() => {
              router.push('/cookie-error')
            }, 2000)
            return
          }
          
          router.refresh()
          router.push("/")
        }, 100)
      }
    } catch (loginError) {
      console.error('Login error:', loginError)
      setError("ログインエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">ログイン</h2>
        <p className="mt-2 text-gray-600">アカウントにログイン</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "処理中..." : "ログイン"}
        </button>
      </form>

      <div className="text-center text-sm">
        <span className="text-gray-600">アカウントをお持ちでない方は</span>
        <Link href="/signup" className="ml-1 text-blue-500 hover:text-blue-600">
          サインアップ
        </Link>
      </div>
    </div>
  )
}