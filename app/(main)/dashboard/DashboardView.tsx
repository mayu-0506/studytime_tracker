'use client'

import { useState } from 'react'
import { useDashboardTotals } from '@/utils/useDashboardTotals'
import { AlertDestructive } from '@/components/ui/alert-destructive'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SubjectPieChart from '@/components/charts/SubjectPieChart'
import DashboardBarChart from '@/components/charts/DashboardBarChart'
import StudyCalendarHeatmap from '@/components/charts/StudyCalendarHeatmap'
import { Clock, TrendingUp, Calendar, BarChart3, PieChart, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { DashboardInitialData } from '@/types/dashboard'

export default function DashboardView({
  initialData
}: {
  initialData: DashboardInitialData
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  /* ❶ 初期データのみ使用（クライアントSWRは一時的に無効化） */
  const totals = initialData.totals
  const subjectBreakdown = initialData.subjectBreakdown
  const dayBuckets = initialData.dayBuckets
  const weekBuckets = initialData.weekBuckets
  const calendarData: any[] = []  // 一時的に空配列
  
  /* ❷ エラーチェック */
  const error = initialData.error
  
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
  
  // データ準備
  const displayTotals = totals || { total_min: 0, last7_min: 0, last4w_min: 0 }
  const displaySubjectBreakdown = subjectBreakdown || []
  const displayDayBuckets = dayBuckets || []
  const displayWeekBuckets = weekBuckets || []
  const displayCalendarData = calendarData || []
  
  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}時間${mins}分`
  }
  
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1))
  }
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
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
              {formatHours(displayTotals.total_min)}
            </div>
            <p className="text-xs text-muted-foreground">
              全期間の累計
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">直近7日間</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHours(displayTotals.last7_min)}
            </div>
            <p className="text-xs text-muted-foreground">
              過去1週間の学習時間
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">直近4週間</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHours(displayTotals.last4w_min)}
            </div>
            <p className="text-xs text-muted-foreground">
              過去4週間の学習時間
            </p>
          </CardContent>
        </Card>
      </div>

      {/* グラフセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 科目別円グラフ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              科目別学習時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectPieChart data={displaySubjectBreakdown} />
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
          <StudyCalendarHeatmap 
            data={displayCalendarData} 
            month={currentMonth}
          />
        </CardContent>
      </Card>
    </div>
  )
}