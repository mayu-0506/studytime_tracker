"use client"

import { useEffect } from "react"
import { clearCorruptedTimerData } from "@/utils/clear-corrupted-timer-data"

export default function TimerDataCleaner() {
  useEffect(() => {
    const wasCleared = clearCorruptedTimerData()
    if (wasCleared) {
      console.log("Corrupted timer data was cleared")
    }
  }, [])
  
  return null
}