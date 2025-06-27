'use client'

import { useState, useEffect } from 'react'
import { useDashboardTotals } from '@/utils/useDashboardTotals'
import { AlertDestructive } from '@/components/ui/alert-destructive'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SubjectPieChart from '@/components/charts/SubjectPieChart'
import DashboardBarChart from '@/components/charts/DashboardBarChart'
import StudyCalendarHeatmap from '@/components/charts/StudyCalendarHeatmap'
import DayDetailModal from '@/components/modals/DayDetailModal'
import { Clock, TrendingUp, Calendar, BarChart3, PieChart, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { DashboardInitialData } from '@/types/dashboard'
import { getMonthlyCalendar, getSubjectBreakdown, CalendarDay } from '@/actions/dashboard-stats'
import { formatMinutesToHoursMinutes } from '@/utils/time-format'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function DashboardView({
  initialData
}: {
  initialData: DashboardInitialData
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [subjectPeriod, setSubjectPeriod] = useState<'all' | 'last_7_days' | 'last_4_weeks'>('all')
  const [subjectBreakdownData, setSubjectBreakdownData] = useState(initialData.subjectBreakdown)
  const [subjectLoading, setSubjectLoading] = useState(false)
  
  /* ❶ 初期データのみ使用（クライアントSWRは一時的に無効化） */
  const totals = initialData.totals
  const subjectBreakdown = subjectBreakdownData
  const dayBuckets = initialData.dayBuckets
  const weekBuckets = initialData.weekBuckets
  
  /* ❷ エラーチェック */
  const error = initialData.error
  
  // 現在の月のカレンダーデータを取得
  useEffect(() => {
    const fetchCalendarData = async () => {
      setCalendarLoading(true)
      const firstDay = startOfMonth(currentMonth)
      const lastDay = endOfMonth(currentMonth)
      const result = await getMonthlyCalendar(firstDay, lastDay)
      if (!result.error) {
        setCalendarData(result.data)
      }
      setCalendarLoading(false)
    }
    fetchCalendarData()
  }, [currentMonth])
  
  // 科目別データを期間に応じて再取得
  useEffect(() => {
    const fetchSubjectData = async () => {
      setSubjectLoading(true)
      try {
        const data = await getSubjectBreakdown(subjectPeriod)
        setSubjectBreakdownData(data)
      } catch (error) {
        console.error('Failed to fetch subject breakdown:', error)
      } finally {
        setSubjectLoading(false)
      }
    }
    fetchSubjectData()
  }, [subjectPeriod])
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8">学習ダッシュボード</h1>
        <AlertDestructive description={error} />
      </div>
    )
  }
  
  if (!totals) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8">学習ダッシュボード</h1>
        <p className="text-center py-10">読み込み中…</p>
      </div>
    )
  }
  
  // データ準備（フォールバック処理を含む）
  const displayTotals = totals ? {
    total_min: totals.total_min || 0,
    current_week_min: totals.current_week_min !== undefined ? totals.current_week_min : 0,
    current_month_min: totals.current_month_min !== undefined ? totals.current_month_min : 0
  } : { total_min: 0, current_week_min: 0, current_month_min: 0 }
  
  const displaySubjectBreakdown = subjectBreakdown || []
  const displayDayBuckets = dayBuckets || []
  const displayWeekBuckets = weekBuckets || []
  
  
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1))
  }
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
  }
  
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setIsDetailModalOpen(true)
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">学習ダッシュボード</h1>
      
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総学習時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinutesToHoursMinutes(displayTotals.total_min)}
            </div>
            <p className="text-xs text-muted-foreground">
              全期間の累計
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今週の勉強時間</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinutesToHoursMinutes(displayTotals.current_week_min)}
            </div>
            <p className="text-xs text-muted-foreground">
              月曜日からの累計
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の勉強時間</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinutesToHoursMinutes(displayTotals.current_month_min)}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'M月', { locale: ja })}の累計
            </p>
          </CardContent>
        </Card>
      </div>

      {/* グラフセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 科目別円グラフ */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                科目別学習時間
              </CardTitle>
              <Select value={subjectPeriod} onValueChange={(value: 'all' | 'last_7_days' | 'last_4_weeks') => setSubjectPeriod(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全期間</SelectItem>
                  <SelectItem value="last_4_weeks">直近4週間</SelectItem>
                  <SelectItem value="last_7_days">直近7日間</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {subjectLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">読み込み中...</p>
              </div>
            ) : (
              <SubjectPieChart data={displaySubjectBreakdown} />
            )}
          </CardContent>
        </Card>

        {/* 日別棒グラフ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              直近7日間の学習時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardBarChart 
              data={displayDayBuckets.map(item => ({
                date: item.d,
                total_min: item.total_min
              }))}
              title=""
              dateFormat="MM/dd"
              color="rgba(59, 130, 246, 0.8)"
            />
          </CardContent>
        </Card>
      </div>

      {/* 週別棒グラフ */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            週別学習時間（直近4週間）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardBarChart 
            data={displayWeekBuckets.map(item => ({
              date: item.week_start,
              total_min: item.total_min
            }))}
            title=""
            dateFormat="MM/dd"
            color="rgba(16, 185, 129, 0.8)"
          />
        </CardContent>
      </Card>

      {/* カレンダーヒートマップ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              月間学習カレンダー
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {format(currentMonth, 'yyyy年M月', { locale: ja })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {calendarLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <StudyCalendarHeatmap 
              data={calendarData} 
              month={currentMonth}
              onDateClick={handleDateClick}
            />
          )}
        </CardContent>
      </Card>
      
      {/* 日付詳細モーダル */}
      <DayDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        date={selectedDate}
      />
    </div>
  )
}