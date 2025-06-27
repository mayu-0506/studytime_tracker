"use client"

import { useTimer } from "@/contexts/TimerContext"
import { Clock, Pause, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function PersistentTimerDisplay() {
  const pathname = usePathname()
  const { state, formattedTime, currentSession, pause, start, stop, canPause, canStop } = useTimer()

  // Don't show on the study page itself
  if (pathname === "/study" || state === "idle") {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 z-50 min-w-[280px]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className={cn(
            "w-5 h-5",
            state === "running" && "text-blue-600 animate-pulse",
            state === "paused" && "text-yellow-600"
          )} />
          <div>
            <div className={cn(
              "font-mono font-bold text-lg",
              state === "running" && "text-blue-600",
              state === "paused" && "text-yellow-600"
            )}>
              {formattedTime}
            </div>
            {currentSession?.subject && (
              <div className="text-xs text-gray-600">
                {currentSession.subject.name}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {state === "running" && canPause && (
            <Button
              onClick={pause}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          
          {state === "paused" && (
            <Button
              onClick={() => {
                // Resume without needing to pass the subject since it's already in the session
                if (currentSession) {
                  // Create a minimal subject object for the start function
                  const subject = {
                    id: currentSession.subject_id || currentSession.subject?.id || '',
                    name: currentSession.subject?.name || '',
                    color: currentSession.subject?.color || '#3B82F6',
                    user_id: currentSession.user_id || '',
                    created_at: currentSession.subject?.created_at || new Date().toISOString(),
                    isPreset: currentSession.subject_id?.startsWith('preset_') || false
                  }
                  start(subject)
                }
              }}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          
          {canStop && (
            <Button
              onClick={stop}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
          
          <Link href="/study">
            <Button size="sm" variant="outline">
              タイマーページへ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}