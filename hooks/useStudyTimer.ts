"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Subject } from "@/lib/supabase/subjects"
import { recordCompleteSession } from "@/actions/study-sessions"
import toast from "react-hot-toast"
import { emitStudyEvent, StudyEvents } from "@/utils/events"
import { formatMinutesToHoursMinutes, formatTime } from "@/utils/time-format"

/**
 * タイマーの状態
 */
type TimerState = "idle" | "running" | "paused"

/**
 * ローカルに保存するタイマーデータ
 */
interface LocalTimerData {
  subjectId: string
  subjectName: string
  subjectColor: string
  startTime: string
  elapsedTime: number
  pausedTime: number
  state: TimerState
  memo?: string
  version: number // データ構造のバージョン管理
}

/**
 * 学習タイマーフック
 * - タブが非アクティブでも正確な時間を計測
 * - 終了時に一括でセッションを記録
 * - localStorageに未保存セッションを退避
 */
export function useStudyTimer() {
  const [state, setState] = useState<TimerState>("idle")
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0) // 秒単位
  const [memo, setMemo] = useState("")
  
  const startTimeRef = useRef<Date | null>(null)
  const pausedTimeRef = useRef(0)
  const intervalRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<Date | null>(null)
  
  // ローカルストレージのキー
  const STORAGE_KEY = "timer_session_v2"
  const PENDING_SESSIONS_KEY = "pending_timer_sessions"
  
  // 未保存セッションの復元
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const parsed: LocalTimerData = JSON.parse(savedData)
        
        // バージョンチェック（将来の互換性のため）
        if (parsed.version !== 2) {
          console.warn("Incompatible timer data version, clearing...")
          localStorage.removeItem(STORAGE_KEY)
          return
        }
        
        // データの妥当性チェック
        const elapsedTime = parsed.elapsedTime || 0
        const pausedTime = parsed.pausedTime || 0
        
        // 負の値やおかしな値の場合はリセット
        if (elapsedTime < 0 || pausedTime < 0 || pausedTime > elapsedTime) {
          console.warn("Invalid timer data detected, resetting...")
          localStorage.removeItem(STORAGE_KEY)
          return
        }
        
        // タイマー状態を復元
        setCurrentSubject({
          id: parsed.subjectId,
          name: parsed.subjectName,
          color: parsed.subjectColor,
          isPreset: parsed.subjectId.startsWith('preset_')
        })
        setElapsedTime(elapsedTime)
        setState(parsed.state || "paused")
        setMemo(parsed.memo || "")
        
        if (parsed.startTime) {
          startTimeRef.current = new Date(parsed.startTime)
        }
        pausedTimeRef.current = pausedTime
        
        toast.success("前回の学習セッションを復元しました")
      } catch (error) {
        console.error("Failed to restore session:", error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    
    // 保留中のセッションを送信
    retryPendingSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // セッション状態の保存
  const saveToLocalStorage = useCallback(() => {
    if (currentSubject && state !== "idle") {
      const data: LocalTimerData = {
        subjectId: currentSubject.id,
        subjectName: currentSubject.name,
        subjectColor: currentSubject.color,
        startTime: startTimeRef.current?.toISOString() || new Date().toISOString(),
        elapsedTime,
        pausedTime: pausedTimeRef.current,
        state,
        memo,
        version: 2
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [currentSubject, elapsedTime, state, memo])
  
  // 保留中のセッションを再送信
  const retryPendingSessions = useCallback(async () => {
    const pendingData = localStorage.getItem(PENDING_SESSIONS_KEY)
    if (!pendingData) return
    
    try {
      const pendingSessions = JSON.parse(pendingData)
      const failedSessions = []
      
      for (const session of pendingSessions) {
        const result = await recordCompleteSession({
          subjectId: session.subjectId,
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime),
          note: session.note
        })
        
        if (!result.success) {
          failedSessions.push(session)
        } else {
          toast.success(`保留中の学習記録を保存しました（${session.subjectName}）`)
        }
      }
      
      // 失敗したセッションだけを保持
      if (failedSessions.length > 0) {
        localStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(failedSessions))
      } else {
        localStorage.removeItem(PENDING_SESSIONS_KEY)
      }
    } catch (error) {
      console.error("Failed to retry pending sessions:", error)
    }
  }, [])
  
  // 経過時間の更新
  const updateElapsedTime = useCallback(() => {
    if (state === "running" && startTimeRef.current) {
      const now = new Date()
      const rawElapsed = Math.floor(
        (now.getTime() - startTimeRef.current.getTime()) / 1000
      )
      const totalElapsed = Math.max(0, rawElapsed - pausedTimeRef.current)
      
      // 異常な値の検出
      if (totalElapsed < 0 || totalElapsed > 86400) { // 24時間以上は異常とみなす
        console.error("Invalid elapsed time detected:", {
          rawElapsed,
          pausedTime: pausedTimeRef.current,
          totalElapsed
        })
        // リセット
        pausedTimeRef.current = 0
        setElapsedTime(0)
        return
      }
      
      setElapsedTime(totalElapsed)
    }
  }, [state])
  
  // タイマーの開始
  const start = useCallback(async (subject: Subject) => {
    if (!subject) {
      toast.error("科目を選択してください")
      return
    }
    
    if (state === "idle") {
      // 新しいセッションを開始
      const startTime = new Date()
      
      setCurrentSubject(subject)
      startTimeRef.current = startTime
      pausedTimeRef.current = 0
      setElapsedTime(0)
      setMemo("")
      setState("running")
      
      // ローカルストレージに保存
      saveToLocalStorage()
      
      toast.success("学習を開始しました")
      
      // 開発環境でのみログ出力
      if (process.env.NODE_ENV === 'development') {
        console.log('Timer started locally:', {
          subject_id: subject.id,
          subject_name: subject.name,
          start_time: startTime.toISOString()
        })
      }
    } else if (state === "paused") {
      // 一時停止から再開
      pausedTimeRef.current += Math.floor(
        (new Date().getTime() - (lastUpdateRef.current?.getTime() || 0)) / 1000
      )
      setState("running")
      toast.success("学習を再開しました")
    }
  }, [state, saveToLocalStorage])
  
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
    if (state !== "idle" && currentSubject && startTimeRef.current) {
      const endTime = new Date()
      const startTime = startTimeRef.current
      
      // 手動記録と同じ方法でdurationを計算（分単位）
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
      const duration = Math.max(1, durationMinutes)
      
      console.log('📤 Recording complete session:', {
        subjectId: currentSubject.id,
        subjectName: currentSubject.name,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration
      })
      
      // セッションを記録
      const result = await recordCompleteSession({
        subjectId: currentSubject.id,
        startTime: startTime,
        endTime: endTime,
        note: memo
      })
      
      if (result.success) {
        toast.success(`学習を終了しました（${formatMinutesToHoursMinutes(duration)}）`)
        
        // リセット
        setState("idle")
        setCurrentSubject(null)
        setElapsedTime(0)
        setMemo("")
        startTimeRef.current = null
        pausedTimeRef.current = 0
        lastUpdateRef.current = null
        localStorage.removeItem(STORAGE_KEY)
        
        // Emit event to refresh dashboard data
        emitStudyEvent(StudyEvents.SESSION_STOPPED, { 
          duration 
        })
        
        // SWRのキャッシュをミューテート（クライアントサイド）
        import("swr").then(({ mutate }) => {
          mutate('/rpc/dashboard_totals')
          mutate('/rpc/subject_breakdown')
          mutate('/rpc/last_7day_buckets')
          mutate('/rpc/last_4week_buckets')
        })
      } else {
        // エラーの場合、セッションデータを保留として保存
        console.error("Failed to record session:", result.error)
        
        // オフラインまたはエラーの場合は保留として保存
        const pendingData = localStorage.getItem(PENDING_SESSIONS_KEY)
        const pendingSessions = pendingData ? JSON.parse(pendingData) : []
        
        pendingSessions.push({
          subjectId: currentSubject.id,
          subjectName: currentSubject.name,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          note: memo,
          timestamp: new Date().toISOString()
        })
        
        localStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(pendingSessions))
        
        toast.error(result.error || "エラーが発生しました。学習記録は保留されました。")
        
        // UIはリセット
        setState("idle")
        setCurrentSubject(null)
        setElapsedTime(0)
        setMemo("")
        startTimeRef.current = null
        pausedTimeRef.current = 0
        lastUpdateRef.current = null
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [state, currentSubject, memo])
  
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
  
  // オンライン復帰時に保留中のセッションを送信
  useEffect(() => {
    const handleOnline = () => {
      retryPendingSessions()
    }
    
    window.addEventListener("online", handleOnline)
    
    return () => {
      window.removeEventListener("online", handleOnline)
    }
  }, [retryPendingSessions])
  
  // メモが変更されたときにローカルストレージに保存
  useEffect(() => {
    if (state !== "idle") {
      saveToLocalStorage()
    }
  }, [memo, saveToLocalStorage, state])
  
  return {
    state,
    currentSession: currentSubject ? {
      subject: currentSubject
    } : null,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    memo,
    setMemo,
    start,
    pause,
    stop,
    canStart: state === "idle" || state === "paused",
    canPause: state === "running",
    canStop: state !== "idle"
  }
}