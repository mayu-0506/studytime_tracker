import { Loader2 } from "lucide-react"

// App Router ローディングコンポーネント
const Loading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600 text-sm">読み込み中...</p>
      </div>
    </div>
  )
}

export default Loading