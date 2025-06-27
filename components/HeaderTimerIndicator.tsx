"use client"

import { useTimer } from "@/contexts/TimerContext"
import { Clock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function HeaderTimerIndicator() {
  const { state, formattedTime, currentSession } = useTimer()

  if (state === "idle") {
    return null
  }

  return (
    <Link
      href="/study"
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
        state === "running" && "bg-blue-100 text-blue-700 hover:bg-blue-200",
        state === "paused" && "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
      )}
    >
      <Clock className={cn(
        "w-4 h-4",
        state === "running" && "animate-pulse"
      )} />
      <span className="font-mono">{formattedTime}</span>
      {currentSession?.subject && (
        <span className="text-xs opacity-75">
          • {currentSession.subject.name}
        </span>
      )}
    </Link>
  )
}