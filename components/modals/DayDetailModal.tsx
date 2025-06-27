"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getDaySessionDetails, DaySessionDetail } from "@/actions/dashboard-stats"
import { formatMinutesToHoursMinutes, formatISOToJapanTime } from "@/utils/time-format"
import SessionDetailCard from "@/components/SessionDetailCard"

interface DayDetailModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
}

export default function DayDetailModal({ isOpen, onClose, date }: DayDetailModalProps) {
  const [sessions, setSessions] = useState<DaySessionDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && date) {
      fetchDayDetails()
    }
  }, [isOpen, date])

  const fetchDayDetails = async () => {
    if (!date) return
    
    setLoading(true)
    setError(null)
    
    const dateStr = format(date, 'yyyy-MM-dd')
    const result = await getDaySessionDetails(dateStr)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSessions(result.data)
    }
    
    setLoading(false)
  }

  if (!date) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {format(date, 'yyyy年M月d日', { locale: ja })}の学習記録
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">この日の学習記録はありません</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <div className="space-y-3">
                {sessions.map((session) => (
                  <SessionDetailCard key={session.id} session={session} />
                ))}
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">合計学習時間</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatMinutesToHoursMinutes(
                        sessions.reduce((sum, session) => sum + session.duration, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}