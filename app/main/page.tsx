"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { SubjectType } from "@/types"
import Link from "next/link"
import { Clock, Target, TrendingUp, BookOpen, Plus, Square } from "lucide-react"
import { useUser } from "@/contexts/AuthContext"
import { useStudyEvent, StudyEvents } from "@/utils/events"

// メインページ（ダッシュボード）
const MainPage = () => {
  const { user, loading: authLoading } = useUser()
  const [loading, setLoading] = useState(true)
  const [todayStudyTime, setTodayStudyTime] = useState(0)
  const [subjects, setSubjects] = useState<SubjectType[]>([])
  interface StudySession {
    id: string
    user_id: string
    subject_id: string
    start_time: string
    end_time?: string
    duration?: number
    subjects?: SubjectType
  }
  
  const [activeSession, setActiveSession] = useState<StudySession | null>(null)

  const initData = async () => {
      if (!user || authLoading) return
      
      const supabase = createClient()
      
      // 科目一覧取得
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (subjectsData) {
        setSubjects(subjectsData)
      }
      
      // 今日の勉強時間を取得
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: todayData } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
      
      if (todayData) {
        const total = todayData.reduce((sum, session) => sum + (session.duration || 0), 0)
        setTodayStudyTime(total)
      }
      
      // アクティブなセッションを確認
      const { data: activeData } = await supabase
        .from('study_sessions')
        .select('*, subjects(*)')
        .eq('user_id', user.id)
        .is('end_time', null)
        .single()
      
      if (activeData) {
        setActiveSession(activeData)
      }
      
      setLoading(false)
  }

  useEffect(() => {
    if (!authLoading) {
      initData()
    }
  }, [user, authLoading])

  // Listen for study session events
  useEffect(() => {
    const cleanup = useStudyEvent(StudyEvents.SESSION_STOPPED, () => {
      // Refresh main page data when a session is stopped
      if (!authLoading && user) {
        initData()
      }
    })

    return cleanup || (() => {})
  }, [user, authLoading])

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}時間${mins}分`
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ダッシュボード
          </h1>
          <p className="text-gray-600">
            {user?.email} さん、今日も頑張りましょう！
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-gray-500">今日</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatTime(todayStudyTime)}
            </p>
            <p className="text-sm text-gray-600 mt-1">今日の学習時間</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-green-600" />
              <span className="text-sm text-gray-500">目標</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">5時間</p>
            <p className="text-sm text-gray-600 mt-1">1日の目標時間</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-gray-500">進捗</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round((todayStudyTime / 300) * 100)}%
            </p>
            <p className="text-sm text-gray-600 mt-1">目標達成率</p>
          </div>
        </div>

        {/* アクティブセッション */}
        {activeSession && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  現在学習中: {activeSession.subjects?.name}
                </h3>
                <p className="text-sm text-gray-600">
                  開始時刻: {new Date(activeSession.start_time).toLocaleTimeString('ja-JP')}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  終了
                </button>
              </div>
            </div>
          </div>
        )}

        {/* クイックスタート */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">クイックスタート</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition text-center"
                style={{ borderColor: subject.color || '#3B82F6' }}
              >
                <BookOpen className="w-6 h-6 mx-auto mb-2" style={{ color: subject.color || '#3B82F6' }} />
                <p className="font-medium">{subject.name}</p>
              </button>
            ))}
            <Link
              href="/subjects/new"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-6 h-6 mb-2" />
              <p className="font-medium">科目を追加</p>
            </Link>
          </div>
        </div>

        {/* 最近の学習記録 */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">最近の学習記録</h2>
            <Link
              href="/history"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              すべて見る →
            </Link>
          </div>
          <p className="text-gray-600 text-center py-8">
            まだ学習記録がありません
          </p>
        </div>
      </div>
  )
}

export default MainPage