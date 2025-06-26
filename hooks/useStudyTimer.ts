"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { StudySessionType, SubjectType } from "@/types"
import { createSession, updateSession } from "@/actions/study-sessions"
import toast from "react-hot-toast"
import { emitStudyEvent, StudyEvents } from "@/utils/events"

/**
 * タイマーの状態
 */
type TimerState = "idle" | "running" | "paused"

/**
 * 学習タイマーフック
 * - タブが非アクティブでも正確な時間を計測
 * - セッションの作成・更新・一時停止を管理
 * - localStorageに未保存セッションを退避
 */
export function useStudyTimer() {
  const [state, setState] = useState<TimerState>("idle")
  const [currentSession, setCurrentSession] = useState<StudySessionType | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0) // 秒単位
  
  const startTimeRef = useRef<Date | null>(null)
  const pausedTimeRef = useRef(0)
  const intervalRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<Date | null>(null)
  
  // 未保存セッションの復元
  useEffect(() => {
    const savedSession = localStorage.getItem("unsaved_study_session")
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession)
        setCurrentSession(parsed.session)
        setElapsedTime(parsed.elapsedTime || 0)
        setState(parsed.state || "paused")
        // Subject is now managed by parent component
        
        if (parsed.startTime) {
          startTimeRef.current = new Date(parsed.startTime)
        }
        if (parsed.pausedTime) {
          pausedTimeRef.current = parsed.pausedTime
        }
        
        toast.success("前回の学習セッションを復元しました")
      } catch (error) {
        console.error("Failed to restore session:", error)
        localStorage.removeItem("unsaved_study_session")
      }
    }
  }, [])
  
  // セッション状態の保存
  const saveToLocalStorage = useCallback(() => {
    if (currentSession || state !== "idle") {
      const data = {
        session: currentSession,
        elapsedTime,
        state,
        // Subject is now managed by parent component
        startTime: startTimeRef.current?.toISOString(),
        pausedTime: pausedTimeRef.current
      }
      localStorage.setItem("unsaved_study_session", JSON.stringify(data))
    } else {
      localStorage.removeItem("unsaved_study_session")
    }
  }, [currentSession, elapsedTime, state])
  
  // 経過時間の更新
  const updateElapsedTime = useCallback(() => {
    if (state === "running" && startTimeRef.current) {
      const now = new Date()
      const totalElapsed = Math.floor(
        (now.getTime() - startTimeRef.current.getTime()) / 1000
      ) - pausedTimeRef.current
      
      setElapsedTime(totalElapsed)
      
      // 5分ごとに自動保存
      if (totalElapsed % 300 === 0 && totalElapsed > 0) {
        if (currentSession) {
          updateSession(currentSession.id, {
            duration: Math.floor(totalElapsed / 60)
          }).then(result => {
            if (result.success) {
              lastUpdateRef.current = now
              console.log("Auto-saved at", totalElapsed, "seconds")
            }
          })
        }
      }
    }
  }, [state, currentSession])
  
  // タイマーの開始
  const start = useCallback(async (subject: SubjectType) => {
    if (!subject) {
      toast.error("科目を選択してください")
      return
    }
    
    if (state === "idle") {
      // 新しいセッションを開始
      const startTime = new Date()
      const result = await createSession(subject.id, startTime)
      
      if (result.error) {
        toast.error(result.error)
        return
      }
      
      if (result.data) {
        setCurrentSession(result.data)
        startTimeRef.current = startTime
        pausedTimeRef.current = 0
        setElapsedTime(0)
        setState("running")
        toast.success("学習を開始しました")
      }
    } else if (state === "paused") {
      // 一時停止から再開
      pausedTimeRef.current += Math.floor(
        (new Date().getTime() - (lastUpdateRef.current?.getTime() || 0)) / 1000
      )
      setState("running")
      toast.success("学習を再開しました")
    }
  }, [state])
  
  // タイマーの一時停止
  const pause = useCallback(() => {
    if (state === "running") {
      setState("paused")
      lastUpdateRef.current = new Date()
      toast.success("学習を一時停止しました")
    }
  }, [state])
  
  // タイマーの停止
  const stop = useCallback(async () => {
    if (state !== "idle" && currentSession) {
      const endTime = new Date()
      const duration = Math.floor(elapsedTime / 60) // 分単位
      
      const result = await updateSession(currentSession.id, {
        end_time: endTime,
        duration
      })
      
      if (result.success) {
        toast.success(`学習を終了しました（${duration}分）`)
        
        // リセット
        setState("idle")
        setCurrentSession(null)
        setElapsedTime(0)
        startTimeRef.current = null
        pausedTimeRef.current = 0
        lastUpdateRef.current = null
        localStorage.removeItem("unsaved_study_session")
        
        // Emit event to refresh dashboard data
        emitStudyEvent(StudyEvents.SESSION_STOPPED, { 
          sessionId: currentSession.id, 
          duration 
        })
        
        // SWRのキャッシュをミューテート
        import("swr").then(({ mutate }) => {
          mutate('/rpc/dashboard_totals')
          mutate('/rpc/subject_breakdown')
          mutate('/rpc/last_7day_buckets')
          mutate('/rpc/last_4week_buckets')
        })
      } else {
        toast.error(result.error || "エラーが発生しました")
      }
    }
  }, [state, currentSession, elapsedTime])
  
  
  // タイマーの更新
  useEffect(() => {
    if (state === "running") {
      intervalRef.current = window.setInterval(updateElapsedTime, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [state, updateElapsedTime])
  
  // ページ離脱時の処理
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToLocalStorage()
    }
    
    window.addEventListener("beforeunload", handleBeforeUnload)
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [saveToLocalStorage])
  
  // Visibility API でタブの表示/非表示を検知
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state === "running") {
        // タブがアクティブになったら時間を再計算
        updateElapsedTime()
      }
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [state, updateElapsedTime])
  
  // 時間のフォーマット
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0")
    ].join(":")
  }, [])
  
  return {
    state,
    currentSession,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    start,
    pause,
    stop,
    canStart: state === "idle" || state === "paused",
    canPause: state === "running",
    canStop: state !== "idle"
  }
}