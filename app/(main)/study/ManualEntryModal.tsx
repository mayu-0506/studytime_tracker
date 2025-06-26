"use client"

import { useState, useTransition, useEffect } from "react"
import { SubjectType } from "@/types"
import { createManualSession } from "@/actions/study-sessions"
import { getSubjects } from "@/actions/subjects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ManualEntryModal({ isOpen, onClose, onSuccess }: ManualEntryModalProps) {
  const [subjects, setSubjects] = useState<SubjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [memo, setMemo] = useState("")
  const [isPending, startTransition] = useTransition()
  
  // 科目をフェッチ
  useEffect(() => {
    if (isOpen) {
      loadSubjects()
    }
  }, [isOpen])
  
  const loadSubjects = async () => {
    setLoading(true)
    try {
      const result = await getSubjects()
      if (result.success && result.data) {
        setSubjects(result.data)
      } else {
        console.error('Subjects fetch error:', result.error)
        // エラーは表示せず、科目が空のまま処理を続ける
      }
    } catch (error) {
      console.error('Subjects fetch exception:', error)
      // エラーは表示せず、科目が空のまま処理を続ける
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async () => {
    // バリデーション
    if (!selectedSubjectId) {
      toast.error("科目を選択してください")
      return
    }
    if (!date || !startTime || !endTime) {
      toast.error("日付と時間を入力してください")
      return
    }
    
    // 日時の作成
    const startDateTime = new Date(`${date}T${startTime}`)
    const endDateTime = new Date(`${date}T${endTime}`)
    
    // 時間の妥当性チェック
    if (startDateTime >= endDateTime) {
      toast.error("終了時刻は開始時刻より後にしてください")
      return
    }
    
    // 未来の日時チェック
    if (startDateTime > new Date()) {
      toast.error("未来の学習記録は追加できません")
      return
    }
    
    startTransition(async () => {
      const result = await createManualSession({
        subjectId: selectedSubjectId,
        startTime: startDateTime,
        endTime: endDateTime,
        memo: memo.trim()
      })
      
      if (result.success) {
        const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
        toast.success(`学習記録を追加しました（${duration}分）`)
        
        // フォームをリセット
        setSelectedSubjectId("")
        setDate(format(new Date(), "yyyy-MM-dd"))
        setStartTime("")
        setEndTime("")
        setMemo("")
        onClose()
        
        // 成功時のコールバック
        onSuccess?.()
      } else {
        toast.error(result.error || "エラーが発生しました")
      }
    })
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>学習記録を手動で追加</DialogTitle>
          <DialogDescription>
            過去の学習記録を手動で追加できます
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 科目選択 */}
          <div className="space-y-2">
            <Label htmlFor="subject">科目</Label>
            <Select
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
              disabled={isPending}
            >
              <SelectTrigger id="subject">
                <SelectValue placeholder="科目を選択" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-gray-600">読み込み中...</span>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-600">
                    科目がありません
                  </div>
                ) : (
                  subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color || '#gray' }}
                        />
                        {subject.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* 日付 */}
          <div className="space-y-2">
            <Label htmlFor="date">日付</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
              disabled={isPending}
            />
          </div>
          
          {/* 時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">開始時刻</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">終了時刻</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          
          {/* メモ */}
          <div className="space-y-2">
            <Label htmlFor="memo">メモ（任意）</Label>
            <Textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="学習内容や感想を記録できます（Markdown対応）"
              rows={4}
              disabled={isPending}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}