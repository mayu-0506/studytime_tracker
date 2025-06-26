import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <svg
          className="w-10 h-10 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">認証エラー</h1>
        <p className="text-gray-600">メールアドレスの確認中にエラーが発生しました。</p>
      </div>
      
      <div className="pt-4 space-y-3">
        <p className="text-sm text-gray-500">
          もう一度お試しいただくか、新規登録をお願いします。
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            新規登録
          </Link>
        </div>
      </div>
    </div>
  )
}