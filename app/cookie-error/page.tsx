"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Layout from "@/components/Layout"

export default function CookieErrorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cookieInfo, setCookieInfo] = useState({
    currentSize: 0,
    errorSize: searchParams.get('size') || null,
    fromPath: searchParams.get('from') || null
  })

  useEffect(() => {
    // 現在のCookieサイズを取得
    const currentSize = document.cookie.length
    setCookieInfo(prev => ({ ...prev, currentSize }))
    console.log(`Current cookie size: ${currentSize} bytes`)
  }, [])

  const clearAllCookies = () => {
    // 全てのCookieを削除
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=')
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${location.hostname}`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${location.hostname}`
    })

    // LocalStorageとSessionStorageもクリア
    localStorage.clear()
    sessionStorage.clear()

    alert('全てのデータをクリアしました。ページをリロードします。')
    window.location.href = cookieInfo.fromPath || '/'
  }

  const clearSupabaseCookies = async () => {
    try {
      // APIエンドポイントを呼び出してサーバー側でもCookieをクリア
      const response = await fetch('/api/clear-cookies', { 
        method: 'POST',
        credentials: 'include' 
      })
      
      if (!response.ok) {
        throw new Error('Failed to clear cookies')
      }
      
      // クライアント側でもクリア
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=')
        if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      })
      
      alert('認証データをクリアしました。元のページに戻ります。')
      window.location.href = cookieInfo.fromPath || '/login'
    } catch (error) {
      console.error('Error clearing cookies:', error)
      alert('エラーが発生しました。手動でCookieをクリアしてください。')
    }
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-red-600 mb-2">
            HTTP 431エラー
          </h1>
          <p className="text-lg text-gray-800 font-medium mb-2">
            Request Header Fields Too Large
          </p>
          <p className="text-gray-600">
            Cookieサイズが制限を超えているため、リクエストを処理できません。
          </p>
        </div>

        {/* Cookie情報 */}
        <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-red-800 mb-3">📊 Cookie情報：</h2>
          <dl className="space-y-2 text-sm">
            {cookieInfo.errorSize && (
              <div className="flex justify-between">
                <dt className="text-gray-700">エラー時のサイズ:</dt>
                <dd className="font-mono font-bold text-red-600">
                  {parseInt(cookieInfo.errorSize).toLocaleString()} bytes
                  ({(parseInt(cookieInfo.errorSize) / 1024).toFixed(1)} KB)
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-700">現在のサイズ:</dt>
              <dd className="font-mono">
                {cookieInfo.currentSize.toLocaleString()} bytes
                ({(cookieInfo.currentSize / 1024).toFixed(1)} KB)
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-700">最大許容サイズ:</dt>
              <dd className="font-mono text-green-600">4,096 bytes (4.0 KB)</dd>
            </div>
          </dl>
          
          {/* プログレスバー */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((cookieInfo.currentSize / 4096) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1 text-right">
              {((cookieInfo.currentSize / 4096) * 100).toFixed(0)}% 使用中
            </p>
          </div>
        </div>

        {/* 原因説明 */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-yellow-800 mb-2">⚠️ 考えられる原因：</h2>
          <ul className="list-disc list-inside text-yellow-700 space-y-1 text-sm">
            <li>プロフィール画像がBase64形式で保存されている</li>
            <li>複数の認証セッションが蓄積している</li>
            <li>大量のユーザーメタデータが保存されている</li>
            <li>ブラウザの拡張機能が大きなCookieを作成している</li>
          </ul>
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          <button
            onClick={clearSupabaseCookies}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            認証データのみクリア（推奨）
          </button>

          <button
            onClick={clearAllCookies}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            全てのデータをクリア（最終手段）
          </button>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              ホームに戻る
            </Link>
          </div>
        </div>

        {/* 手動クリア方法 */}
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            手動でCookieをクリアする方法 →
          </summary>
          <div className="mt-3 p-4 bg-gray-100 rounded-lg">
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
              <li>DevTools を開く（F12 または 右クリック → 検証）</li>
              <li>Application（アプリケーション）タブを選択</li>
              <li>左側メニューの Storage → Cookies を展開</li>
              <li>サイトのURLを右クリック → Clear を選択</li>
              <li>ページをリロード（F5 または Cmd/Ctrl + R）</li>
            </ol>
          </div>
        </details>
      </div>
    </div>
    </Layout>
  )
}