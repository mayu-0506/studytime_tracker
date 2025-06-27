"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { updateSession } from "@/actions/study-sessions"
import { createClient } from "@/utils/supabase/client"

export default function DebugTimerPage() {
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const runDebugTests = async () => {
    setIsLoading(true)
    const testResults = []
    
    try {
      const supabase = createClient()
      
      // 1. 最新のセッションを取得
      const { data: sessions, error: fetchError } = await supabase
        .from("study_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)
      
      testResults.push({
        test: "Fetch recent sessions",
        success: !fetchError,
        data: sessions,
        error: fetchError
      })
      
      if (sessions && sessions.length > 0) {
        const testSession = sessions[0]
        
        // 2. updateSession関数でテスト更新
        const endTime = new Date()
        const duration = 5 // 5分
        
        const updateResult = await updateSession(testSession.id, {
          end_time: endTime,
          duration: duration
        })
        
        testResults.push({
          test: "updateSession function",
          success: updateResult.success,
          data: { sessionId: testSession.id, endTime, duration },
          error: updateResult.error
        })
        
        // 3. 更新後のデータを確認
        const { data: updated, error: verifyError } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("id", testSession.id)
          .single()
        
        testResults.push({
          test: "Verify update",
          success: !verifyError,
          data: updated,
          error: verifyError
        })
        
        // 4. 直接Supabase updateを実行
        const directUpdateData = {
          end_time: new Date().toISOString(),
          duration_min: 10,
          duration: 10
        }
        
        const { data: directUpdate, error: directError } = await supabase
          .from("study_sessions")
          .update(directUpdateData)
          .eq("id", testSession.id)
          .select()
          .single()
        
        testResults.push({
          test: "Direct Supabase update",
          success: !directError,
          data: { updateData: directUpdateData, result: directUpdate },
          error: directError
        })
        
        // 5. Debug APIエンドポイントをテスト
        const debugResponse = await fetch("/api/debug-update-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: testSession.id,
            end_time: new Date().toISOString(),
            duration: 15
          })
        })
        
        const debugData = await debugResponse.json()
        
        testResults.push({
          test: "Debug API endpoint",
          success: debugResponse.ok,
          data: debugData,
          error: !debugResponse.ok ? debugData.error : null
        })
      }
      
      // 6. テーブルスキーマを確認
      const { data: schemaInfo, error: schemaError } = await supabase
        .rpc('get_table_schema', { table_name: 'study_sessions' })
        .select()
      
      testResults.push({
        test: "Table schema check",
        success: !schemaError,
        data: schemaInfo,
        error: schemaError
      })
      
    } catch (error) {
      testResults.push({
        test: "General error",
        success: false,
        data: null,
        error: error
      })
    }
    
    setResults(testResults)
    setIsLoading(false)
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Timer Update Debug</h1>
      
      <Button 
        onClick={runDebugTests} 
        disabled={isLoading}
        className="mb-6"
      >
        {isLoading ? "Running tests..." : "Run Debug Tests"}
      </Button>
      
      <div className="space-y-4">
        {results.map((result, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className={result.success ? "text-green-600" : "text-red-600"}>
                {result.test} - {result.success ? "SUCCESS" : "FAILED"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.error && (
                <div className="mb-4 p-3 bg-red-50 rounded">
                  <p className="font-semibold">Error:</p>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(result.error, null, 2)}
                  </pre>
                </div>
              )}
              {result.data && (
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-semibold">Data:</p>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h2 className="font-bold mb-2">調査用SQL</h2>
        <p className="text-sm mb-2">Supabase SQL Editorで実行してください：</p>
        <pre className="text-xs bg-white p-3 rounded overflow-auto">
{`-- 最近のセッションを確認
SELECT id, start_time, end_time, duration, duration_min, updated_at
FROM study_sessions
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;`}
        </pre>
      </div>
    </div>
  )
}