"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function TimerDebugPage() {
  const [loading, setLoading] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [dbInfo, setDbInfo] = useState<any>(null)

  const checkLocalStorage = () => {
    const savedSession = localStorage.getItem("unsaved_study_session")
    const timerState = localStorage.getItem("timer_state")
    
    setSessionInfo({
      savedSession: savedSession ? JSON.parse(savedSession) : null,
      timerState: timerState ? JSON.parse(timerState) : null,
      allKeys: Object.keys(localStorage).filter(key => 
        key.includes("timer") || key.includes("session") || key.includes("study")
      )
    })
  }

  const clearLocalStorage = () => {
    const keys = Object.keys(localStorage).filter(key => 
      key.includes("timer") || key.includes("session") || key.includes("study")
    )
    
    keys.forEach(key => localStorage.removeItem(key))
    toast.success("LocalStorageをクリアしました")
    checkLocalStorage()
  }

  const checkDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug-session-info")
      const data = await response.json()

      if (response.ok) {
        setDbInfo(data)
        toast.success("データベース情報を取得しました")
      } else {
        toast.error(data.error || "エラーが発生しました")
      }
    } catch (error) {
      toast.error("エラーが発生しました")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const forceStopTimer = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/force-stop-timer", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        // LocalStorageもクリア
        clearLocalStorage()
        // データベース情報を再取得
        checkDatabase()
      } else {
        toast.error(data.error || "エラーが発生しました")
      }
    } catch (error) {
      toast.error("エラーが発生しました")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">タイマーデバッグツール</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>アクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={checkLocalStorage}
              className="w-full"
            >
              LocalStorage状態を確認
            </Button>
            
            <Button 
              onClick={checkDatabase}
              className="w-full"
              disabled={loading}
            >
              {loading ? "処理中..." : "データベース状態を確認"}
            </Button>
            
            <Button 
              onClick={clearLocalStorage}
              variant="outline"
              className="w-full"
            >
              LocalStorageをクリア
            </Button>
            
            <Button 
              onClick={forceStopTimer}
              variant="destructive"
              className="w-full"
              disabled={loading}
            >
              {loading ? "処理中..." : "タイマーを強制終了"}
            </Button>
          </CardContent>
        </Card>

        {sessionInfo && (
          <Card>
            <CardHeader>
              <CardTitle>LocalStorage情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">保存されたセッション:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(sessionInfo.savedSession, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">タイマー状態:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(sessionInfo.timerState, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">関連するキー:</h3>
                  <ul className="list-disc list-inside">
                    {sessionInfo.allKeys.map((key: string) => (
                      <li key={key}>{key}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {dbInfo && (
          <Card>
            <CardHeader>
              <CardTitle>データベース情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">ユーザー情報:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(dbInfo.user, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">進行中のセッション ({dbInfo.activeSessions.count}件):</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
                    {JSON.stringify(dbInfo.activeSessions.data, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">最近のセッション ({dbInfo.recentSessions.count}件):</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
                    {JSON.stringify(dbInfo.recentSessions.data, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">科目一覧:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
                    {JSON.stringify(dbInfo.subjects, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}