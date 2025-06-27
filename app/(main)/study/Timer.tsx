"use client"

import { Play, Pause, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface TimerProps {
  state: "idle" | "running" | "paused"
  formattedTime: string
  currentSession?: {
    subject?: {
      name: string
      color: string
    }
  } | null
  memo: string
  onMemoChange: (memo: string) => void
  onStart: () => void
  onPause: () => void
  onStop: () => void
  canStart: boolean
  canPause: boolean
  canStop: boolean
}

export default function Timer({
  state,
  formattedTime,
  currentSession,
  memo,
  onMemoChange,
  onStart,
  onPause,
  onStop,
  canStart,
  canPause,
  canStop
}: TimerProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center">
        {/* 現在の科目表示 */}
        {currentSession?.subject && (
          <div className="mb-4">
            <span 
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${currentSession.subject.color}20`,
                color: currentSession.subject.color
              }}
            >
              {currentSession.subject.name}
            </span>
          </div>
        )}
        
        {/* タイマー表示 */}
        <div className={cn(
          "text-6xl font-mono font-bold mb-8 transition-colors",
          state === "running" && "text-blue-600",
          state === "paused" && "text-yellow-600",
          state === "idle" && "text-gray-800"
        )}>
          {formattedTime}
        </div>
        
        {/* 状態表示 */}
        <div className="mb-6">
          {state === "idle" && (
            <p className="text-gray-500">学習を開始するには科目を選んでスタートボタンを押してください</p>
          )}
          {state === "running" && (
            <p className="text-blue-600 font-medium">学習中...</p>
          )}
          {state === "paused" && (
            <p className="text-yellow-600 font-medium">一時停止中</p>
          )}
        </div>
        
        {/* メモ入力欄（タイマー実行中のみ表示） */}
        {state !== "idle" && (
          <div className="mb-6 text-left max-w-md mx-auto">
            <Label htmlFor="memo" className="text-sm font-medium text-gray-700 mb-2 block">
              学習メモ（学習内容・感想など）
            </Label>
            <Textarea
              id="memo"
              value={memo}
              onChange={(e) => onMemoChange(e.target.value)}
              placeholder="今日学習した内容や感想を記録しましょう..."
              className="min-h-[100px]"
            />
          </div>
        )}
        
        {/* コントロールボタン */}
        <div className="flex justify-center gap-3">
          {canStart && (
            <Button
              onClick={onStart}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="mr-2 h-5 w-5" />
              {state === "paused" ? "再開" : "スタート"}
            </Button>
          )}
          
          {canPause && (
            <Button
              onClick={onPause}
              size="lg"
              variant="outline"
              className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
            >
              <Pause className="mr-2 h-5 w-5" />
              一時停止
            </Button>
          )}
          
          {canStop && (
            <Button
              onClick={onStop}
              size="lg"
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <Square className="mr-2 h-5 w-5" />
              終了
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}