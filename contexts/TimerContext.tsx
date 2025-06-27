"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { useStudyTimer } from "@/hooks/useStudyTimer"
import { Subject } from "@/lib/supabase/subjects"

interface TimerContextType {
  state: "idle" | "running" | "paused"
  currentSession: any
  elapsedTime: number
  formattedTime: string
  memo: string
  setMemo: (memo: string) => void
  start: (subject: Subject) => void
  pause: () => void
  stop: () => void
  canStart: boolean
  canPause: boolean
  canStop: boolean
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: ReactNode }) {
  const timer = useStudyTimer()

  return (
    <TimerContext.Provider value={timer}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (context === undefined) {
    throw new Error("useTimer must be used within a TimerProvider")
  }
  return context
}