"use client"

import { useState, useTransition, useEffect } from "react"
import { createSubject } from "@/actions/subjects"
import { createClient } from "@/utils/supabase/client"
import { SubjectType } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

interface SubjectSelectProps {
  selected: SubjectType | null
  onChange: (subject: SubjectType) => void
  disabled?: boolean
}

function SubjectSelect({
  selected,
  onChange,
  disabled = false
}: SubjectSelectProps) {
  const [subjects, setSubjects] = useState<SubjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [selectedColor, setSelectedColor] = useState("#3B82F6")
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)
  
  const supabase = createClient()
  
  // カラープリセット
  const colorPresets = [
    "#3B82F6", // 青
    "#EF4444", // 赤
    "#F59E0B", // 黄
    "#10B981", // 緑
    "#8B5CF6", // 紫
    "#EC4899", // ピンク
    "#06B6D4", // シアン
    "#F97316", // オレンジ
  ]
  
  // 科目をフェッチ（簡素化）
  useEffect(() => {
    loadSubjects()
  }, [])
  
  const loadSubjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: subjects, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name')
      
      if (error) {
        setError("科目の取得に失敗しました")
        console.error('Subjects fetch error:', error)
      } else {
        setSubjects(subjects || [])
        if (!subjects || subjects.length === 0) {
          setError("科目がありません。まず科目を追加してください。")
        }
      }
    } catch (error) {
      console.error('Subjects fetch exception:', error)
      setError("科目の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }
  
  // プリセット科目とカスタム科目を分離（user_idがnullかどうかで判定）
  const presetSubjects = subjects.filter(s => !s.user_id || s.user_id === 'null')
  const customSubjects = subjects.filter(s => s.user_id && s.user_id !== 'null')
  
  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      toast.error("科目名を入力してください")
      return
    }
    
    startTransition(async () => {
      const result = await createSubject(
        newSubjectName.trim(),
        selectedColor,
        selectedColor
      )
      
      if (result.success) {
        toast.success("科目を追加しました")
        setIsAddDialogOpen(false)
        setNewSubjectName("")
        setSelectedColor("#3B82F6")
        // 科目一覧を再取得
        await loadSubjects()
      } else {
        toast.error(result.error || "エラーが発生しました")
      }
    })
  }
  
  const handleDeleteSubject = async (subject: SubjectType) => {
    // window.confirmで簡易確認
    if (!window.confirm(`「${subject.name}」を削除しますか？\n\nこの操作は取り消せません。`)) {
      return
    }
    
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subject.id)
      
      if (error) {
        toast.error(error.message || "削除に失敗しました")
      } else {
        toast.success("科目を削除しました")
        // 削除した科目が選択されていた場合は選択を解除
        if (selected?.id === subject.id) {
          const remainingSubjects = subjects.filter(s => s.id !== subject.id)
          if (remainingSubjects.length > 0) {
            onChange(remainingSubjects[0])
          }
        }
        await loadSubjects()
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error("削除に失敗しました")
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold mb-4">科目を選択</h2>
      
      {/* ローディング状態 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">科目を読み込み中...</span>
        </div>
      )}
      
      {/* エラー状態 */}
      {error && !loading && subjects.length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
          <Button
            onClick={loadSubjects}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            再読み込み
          </Button>
        </div>
      )}
      
      {/* 科目選択 */}
      {!loading && subjects.length > 0 && (
        <div className="space-y-4">
          <Select
            value={selected?.id ?? ""}
            onValueChange={(value) => {
              const subject = subjects.find(s => s.id === value)
              if (subject) onChange(subject)
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="科目を選択してください">
                {selected && (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: selected.color || "#3B82F6" }}
                    />
                    {selected.name}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* プリセット科目 */}
              {presetSubjects.length > 0 && (
                <SelectGroup>
                  <SelectLabel>プリセット科目</SelectLabel>
                  {presetSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2 w-full">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: subject.color || "#3B82F6" }}
                        />
                        <span className="flex-1">{subject.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              
              {/* カスタム科目 */}
              {customSubjects.length > 0 && (
                <SelectGroup>
                  <SelectLabel>カスタム科目</SelectLabel>
                  {customSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subject.color || "#3B82F6" }}
                          />
                          <span>{subject.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            handleDeleteSubject(subject)
                          }}
                          disabled={isDeleting}
                        >
                          <span className="text-red-500">🗑️</span>
                        </Button>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          
          {/* 選択中の科目表示 */}
          {selected && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: selected.color || "#3B82F6" }}
              />
              <span>{selected.name}を選択中</span>
            </div>
          )}
        </div>
      )}
      
      {/* カスタム科目を追加ボタン */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full mt-4 border-dashed"
            disabled={disabled || loading}
          >
            <Plus className="mr-2 h-4 w-4" />
            カスタム科目を追加
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カスタム科目を追加</DialogTitle>
            <DialogDescription>
              あなた専用の科目を追加できます
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject-name">科目名</Label>
              <Input
                id="subject-name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="例: 世界史、プログラミング"
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label>色を選択</Label>
              <div className="flex gap-2 flex-wrap">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all",
                      selectedColor === color
                        ? "border-gray-800 scale-110"
                        : "border-gray-300 hover:border-gray-500"
                    )}
                    style={{ backgroundColor: color }}
                    disabled={isPending}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-20 h-10"
                  disabled={isPending}
                />
                <span className="text-sm text-gray-500">
                  カスタムカラー: {selectedColor}
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button onClick={handleAddSubject} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubjectSelect