"use client"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

// ルートレベルエラーバウンダリ（layout.tsx エラー時の最終フォールバック）
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center border-l-4 border-red-500">
            <div className="text-red-500 text-6xl mb-4">🚨</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              アプリケーションエラー
            </h1>
            <p className="text-gray-600 mb-6">
              アプリケーションで重大なエラーが発生しました。ページをリロードしてください。
            </p>
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                アプリを再起動
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                ページをリロード
              </button>
            </div>
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-red-600 font-medium">
                  エラー詳細（開発用）
                </summary>
                <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto border border-red-200">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}