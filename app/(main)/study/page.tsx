'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useTimer } from '@/contexts/TimerContext'
import Timer from './Timer'
import SubjectSelect from './SubjectSelect'
import ManualEntryModal from './ManualEntryModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, BookOpen, Target } from 'lucide-react'
import { Subject } from '@/lib/supabase/subjects'
import { getTodaySessionsWithSubjects, getSubjectSummaryForPeriod, SessionWithSubject, SubjectSummary } from '@/lib/supabase/study-sessions'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { debugSupabase } from '@/utils/supabase/debug'
import { debugTimerSession } from '@/utils/supabase/timer-debug'
import { diagnoseWithGemini } from '@/utils/supabase/gemini-diagnosis'

export default function StudyPage() {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [todaySessions, setTodaySessions] = useState<SessionWithSubject[]>([])
  const [todayTotal, setTodayTotal] = useState(0)
  const [subjectSummary, setSubjectSummary] = useState<SubjectSummary[]>([])
  const [loading, setLoading] = useState(true)

  const {
    state,
    currentSession,
    formattedTime,
    memo,
    setMemo,
    start,
    pause,
    stop,
    canStart,
    canPause,
    canStop
  } = useTimer()

  useEffect(() => {
    // デバッグ情報を出力
    debugSupabase()
    checkAuthAndLoadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthAndLoadData = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    await loadTodayData()
  }

  const loadTodayData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const [sessions, summary] = await Promise.all([
        getTodaySessionsWithSubjects(user.id),
        getSubjectSummaryForPeriod(user.id, today, tomorrow)
      ])

      setTodaySessions(sessions)
      const total = sessions.reduce((acc, session) => acc + (session.duration_min || session.duration || 0), 0)
      setTodayTotal(total)

      setSubjectSummary(summary)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleManualEntrySuccess = () => {
    setIsManualEntryOpen(false)
    loadTodayData()
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}時間${mins}分`
  }

  // Remove unused variable

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">勉強タイマー</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsManualEntryOpen(true)} variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            手動で記録を追加
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <>
              <Button 
                onClick={() => debugSupabase()} 
                variant="outline"
                className="bg-yellow-50 border-yellow-500 text-yellow-700"
              >
                診断実行
              </Button>
              <Button 
                onClick={() => debugTimerSession()} 
                variant="outline"
                className="bg-orange-50 border-orange-500 text-orange-700"
              >
                タイマー診断
              </Button>
              <Button 
                onClick={async () => {
                  const res = await fetch('/api/debug-timer')
                  const data = await res.json()
                  console.log('API診断結果:', data)
                }} 
                variant="outline"
                className="bg-purple-50 border-purple-500 text-purple-700"
              >
                API診断
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                タイマー
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SubjectSelect 
                selected={selectedSubject}
                onChange={setSelectedSubject}
                disabled={state === "running" || state === "paused"}
              />
              
              <Timer
                state={state}
                formattedTime={formattedTime}
                currentSession={currentSession}
                memo={memo}
                onMemoChange={setMemo}
                onStart={() => {
                  if (selectedSubject) {
                    start(selectedSubject)
                  } else {
                    toast.error("科目を選択してください")
                  }
                }}
                onPause={pause}
                onStop={() => {
                  stop()
                  loadTodayData()
                }}
                canStart={canStart}
                canPause={canPause}
                canStop={canStop}
              />

              {!currentSession && state === "idle" && (
                <p className="text-sm text-muted-foreground text-center">
                  科目を選択してタイマーを開始してください
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                今日の学習状況
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold">{formatDuration(todayTotal)}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'yyyy年MM月dd日')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                科目別学習時間
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">読み込み中...</p>
              ) : subjectSummary.length > 0 ? (
                <div className="space-y-3">
                  {subjectSummary.map((item) => (
                    <div key={item.subjectId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.subject.color }}
                        />
                        <span className="text-sm font-medium">
                          {item.subject.name}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(item.totalMinutes)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm">
                  今日はまだ学習記録がありません
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近の学習セッション</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">読み込み中...</p>
              ) : todaySessions.length > 0 ? (
                <div className="space-y-2">
                  {todaySessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{session.subject?.name || '未設定'}</span>
                        <span className="text-muted-foreground">
                          {formatDuration(session.duration_min || session.duration || 0)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.start_time), 'HH:mm')} - 
                        {session.end_time ? format(new Date(session.end_time), 'HH:mm') : '進行中'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm">
                  学習セッションがありません
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ManualEntryModal
        isOpen={isManualEntryOpen}
        onClose={() => setIsManualEntryOpen(false)}
        onSuccess={handleManualEntrySuccess}
      />
    </div>
  )
}