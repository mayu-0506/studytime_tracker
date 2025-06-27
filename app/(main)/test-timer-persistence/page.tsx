"use client"

import { useTimer } from "@/contexts/TimerContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function TestTimerPersistencePage() {
  const { state, formattedTime, currentSession } = useTimer()

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/study">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            タイマーページに戻る
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>タイマー永続化テスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">現在のタイマー状態</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p><span className="font-medium">状態:</span> {state === "idle" ? "待機中" : state === "running" ? "実行中" : "一時停止中"}</p>
              <p><span className="font-medium">経過時間:</span> {formattedTime}</p>
              <p><span className="font-medium">科目:</span> {currentSession?.subject?.name || "未設定"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">テスト手順</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>タイマーページで勉強を開始してください</li>
              <li>このページに戻ってきて、タイマーが継続して動作していることを確認してください</li>
              <li>他のページ（ダッシュボードなど）に移動しても、タイマーが継続することを確認してください</li>
              <li>ヘッダーにタイマーインジケーターが表示されることを確認してください</li>
              <li>右下に浮動タイマーウィジェットが表示されることを確認してください（タイマーページ以外）</li>
            </ol>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">
              このページは、タイマーがページ遷移後も動作し続けることを確認するためのテストページです。
              タイマーはグローバルコンテキストで管理されているため、どのページに移動しても継続して動作します。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}