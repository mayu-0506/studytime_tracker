"use client"

import { useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarDay } from "@/actions/dashboard-stats"
import { cn } from "@/lib/utils"
import { formatMinutesToHoursMinutes } from "@/utils/time-format"

interface StudyCalendarHeatmapProps {
  data: CalendarDay[]
  month: Date
  onDateClick?: (date: Date) => void
}

// 学習時間に応じた色の強度を返す（12時間基準）
function getIntensityStyle(minutes: number): { backgroundColor: string; color: string; borderColor: string } {
  if (minutes === 0) return { backgroundColor: '#ffffff', color: '#374151', borderColor: '#e5e7eb' }
  
  // 12時間（720分）を最大値とする
  const maxMinutes = 720
  const intensity = Math.min(minutes / maxMinutes, 1) // 0-1の範囲に制限
  
  // 0-8の段階で色の濃さを決定
  const colorLevel = Math.ceil(intensity * 8)
  
  if (colorLevel === 0) return { backgroundColor: '#ffffff', color: '#374151', borderColor: '#e5e7eb' }      // white
  if (colorLevel === 1) return { backgroundColor: '#eff6ff', color: '#1f2937', borderColor: '#dbeafe' }      // blue-50
  if (colorLevel === 2) return { backgroundColor: '#dbeafe', color: '#1f2937', borderColor: '#bfdbfe' }      // blue-100
  if (colorLevel === 3) return { backgroundColor: '#bfdbfe', color: '#1f2937', borderColor: '#93c5fd' }      // blue-200
  if (colorLevel === 4) return { backgroundColor: '#93c5fd', color: '#1f2937', borderColor: '#60a5fa' }      // blue-300
  if (colorLevel === 5) return { backgroundColor: '#60a5fa', color: '#ffffff', borderColor: '#3b82f6' }      // blue-400
  if (colorLevel === 6) return { backgroundColor: '#3b82f6', color: '#ffffff', borderColor: '#2563eb' }      // blue-500
  if (colorLevel === 7) return { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#1d4ed8' }      // blue-600
  if (colorLevel === 8) return { backgroundColor: '#1d4ed8', color: '#ffffff', borderColor: '#1e40af' }      // blue-700
  return { backgroundColor: '#1e40af', color: '#ffffff', borderColor: '#1e3a8a' }                            // blue-800 (12時間以上)
}

export default function StudyCalendarHeatmap({ data, month, onDateClick }: StudyCalendarHeatmapProps) {
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
    <div className="space-y-3">
      <h3 className="text-base font-semibold mb-3">
        {format(month, 'yyyy年M月', { locale: ja })}
      </h3>
      
      <div className="space-y-1">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-0.5 text-sm text-gray-600 text-center font-medium">
          {weekDays.map((day) => (
            <div key={day} className="py-1" style={{ width: '60px' }}>
              {day}
            </div>
          ))}
        </div>
        
        {/* カレンダー本体 */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarData.map((item) => {
            const style = item.day ? getIntensityStyle(item.minutes) : {}
            return (
              <div
                key={item.index}
                className={cn(
                  "rounded-md flex flex-col items-center justify-center relative group cursor-pointer transition-all",
                  item.day && onDateClick ? "hover:ring-2 hover:ring-blue-400 hover:scale-105" : "",
                  !item.day ? "bg-transparent" : ""
                )}
                style={item.day ? {
                  ...style,
                  border: `1px solid ${style.borderColor}`,
                  width: '60px',
                  height: '60px'
                } : {}}
                onClick={() => item.day && onDateClick && onDateClick(item.day)}
              >
              {item.day && (
                <>
                  <span className="font-bold text-[16px] leading-tight mb-1">
                    {format(item.day, 'd')}
                  </span>
                  <span className="text-[11px] leading-tight font-medium" style={{ opacity: 0.85 }}>
                    {item.minutes === 0 
                      ? '-'
                      : formatMinutesToHoursMinutes(item.minutes)
                    }
                  </span>
                  
                  {/* ツールチップ */}
                  {item.minutes > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {format(item.day, 'M月d日', { locale: ja })}: {formatMinutesToHoursMinutes(item.minutes)}
                    </div>
                  )}
                </>
              )}
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}