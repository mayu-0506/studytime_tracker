"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EmailVerifiedPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Force a refresh to update navigation state
    router.refresh()
  }, [router])

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg
          className="w-10 h-10 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">本人登録が完了いたしました</h1>
        <p className="text-gray-600">メールアドレスの確認が完了し、アカウントが有効化されました。</p>
      </div>
      
      <div className="pt-4 space-y-3">
        <p className="text-sm text-gray-500">
          ログインした状態でトップページへお進みください。
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition"
        >
          トップページへ
        </Link>
      </div>
    </div>
  )
}