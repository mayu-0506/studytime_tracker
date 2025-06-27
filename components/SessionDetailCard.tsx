"use client"

import { formatMinutesToHoursMinutes, formatISOToJapanTime } from "@/utils/time-format"
import { DaySessionDetail } from "@/actions/dashboard-stats"
import { Card } from "@/components/ui/card"
import { Clock, FileText, Calendar } from "lucide-react"

interface SessionDetailCardProps {
  session: DaySessionDetail
}

export default function SessionDetailCard({ session }: SessionDetailCardProps) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* ヘッダー：科目名と学習時間 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {session.subject_color && (
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: session.subject_color }}
              />
            )}
            <h3 className="font-semibold text-lg">{session.subject_name}</h3>
          </div>
          <div className="text-xl font-bold" style={{ color: session.subject_color || '#3B82F6' }}>
            {formatMinutesToHoursMinutes(session.duration)}
          </div>
        </div>

        {/* 時間情報 */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>
              {formatISOToJapanTime(session.start_time)}
              {session.end_time && (
                <> - {formatISOToJapanTime(session.end_time)}</>
              )}
            </span>
          </div>
        </div>

        {/* メモ */}
        {session.memo && (
          <div className="border-t pt-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-1">学習メモ</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                  {session.memo}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* プログレスバー */}
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              backgroundColor: session.subject_color || '#3B82F6',
              width: `${Math.min((session.duration / 240) * 100, 100)}%`,
              opacity: 0.6
            }}
          />
        </div>
      </div>
    </Card>
  )
}