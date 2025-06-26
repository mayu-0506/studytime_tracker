"use client"

import { useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarDay } from "@/actions/dashboard-stats"
import { cn } from "@/lib/utils"

interface StudyCalendarHeatmapProps {
  data: CalendarDay[]
  month: Date
}

// 学習時間に応じた色の強度を返す
function getIntensityColor(minutes: number): string {
  if (minutes === 0) return "bg-gray-100"
  if (minutes < 30) return "bg-blue-200"
  if (minutes < 60) return "bg-blue-300"
  if (minutes < 120) return "bg-blue-400"
  if (minutes < 180) return "bg-blue-500"
  return "bg-blue-600"
}

export default function StudyCalendarHeatmap({ data, month }: StudyCalendarHeatmapProps) {
  const calendarData = useMemo(() => {
    const firstDay = startOfMonth(month)
    const lastDay = endOfMonth(month)
    const days = eachDayOfInterval({ start: firstDay, end: lastDay })
    
    // 月の最初の日の曜日に合わせて空のセルを追加
    const firstDayOfWeek = getDay(firstDay)
    const emptyDays = Array(firstDayOfWeek).fill(null)
    
    // データをマップに変換して高速アクセス
    const dataMap = new Map(
      data.map(item => [item.day, item.total_min])
    )
    
    return [...emptyDays, ...days].map((day, index) => {
      if (!day) return { day: null, minutes: 0, index }
      
      const dateStr = format(day, 'yyyy-MM-dd')
      const minutes = dataMap.get(dateStr) || 0
      
      return {
        day,
        minutes,
        index,
        dateStr,
      }
    })
  }, [data, month])

  const weekDays = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {format(month, 'yyyy年M月', { locale: ja })}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>少</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <div className="w-4 h-4 bg-blue-200 rounded"></div>
            <div className="w-4 h-4 bg-blue-300 rounded"></div>
            <div className="w-4 h-4 bg-blue-400 rounded"></div>
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
          </div>
          <span>多</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-600 text-center">
          {weekDays.map((day) => (
            <div key={day} className="p-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* カレンダー本体 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((item) => (
            <div
              key={item.index}
              className={cn(
                "aspect-square rounded p-1 text-xs flex flex-col items-center justify-center relative group cursor-pointer transition-all",
                item.day ? getIntensityColor(item.minutes) : ""
              )}
            >
              {item.day && (
                <>
                  <span className="font-medium">
                    {format(item.day, 'd')}
                  </span>
                  {item.minutes > 0 && (
                    <span className="text-[10px] opacity-75">
                      {item.minutes < 60 
                        ? `${item.minutes}分`
                        : `${(item.minutes / 60).toFixed(1)}h`
                      }
                    </span>
                  )}
                  
                  {/* ツールチップ */}
                  {item.minutes > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {format(item.day, 'M月d日', { locale: ja })}: {Math.floor(item.minutes / 60)}時間{item.minutes % 60}分
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}