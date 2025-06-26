"use client"

import { useState, useTransition } from "react"
import { SubjectType } from "@/types"
import { deleteSubject } from "@/actions/subjects"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { BookOpen, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

interface SubjectListProps {
  initialSubjects: SubjectType[]
}

export default function SubjectList({ initialSubjects }: SubjectListProps) {
  const [subjects, setSubjects] = useState(initialSubjects)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const handleDelete = (id: string, name: string) => {
    setDeletingId(id)
    
    startTransition(async () => {
      const result = await deleteSubject(id)
      
      if (result.success) {
        setSubjects(subjects.filter(s => s.id !== id))
        toast.success(`「${name}」を削除しました`)
      } else {
        toast.error(result.error || "削除に失敗しました")
      }
      setDeletingId(null)
    })
  }
  
  if (subjects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">まだ科目が登録されていません</p>
        <Link href="/subjects/new">
          <Button>最初の科目を追加</Button>
        </Link>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="grid gap-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: subject.color || '#gray' }}
                />
                <div>
                  <h3 className="font-medium text-gray-900">{subject.name}</h3>
                  <p className="text-sm text-gray-500">
                    作成日: {subject.created_at ? new Date(subject.created_at).toLocaleDateString('ja-JP') : '不明'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending && deletingId === subject.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>科目を削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{subject.name}」を削除します。この操作は取り消せません。
                        <br />
                        この科目に関連する学習記録も全て削除されます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(subject.id, subject.name)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        削除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          登録済み科目数: {subjects.length}件
        </div>
      </div>
    </div>
  )
}