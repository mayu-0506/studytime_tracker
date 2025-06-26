"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createSubject } from "@/actions/subjects"
import toast from "react-hot-toast"
import { Loader2, ArrowLeft } from "lucide-react"
import Layout from "@/components/Layout"

// 色のプリセット
const PRESET_COLORS = [
  "#38bdf8", // 青
  "#f87171", // 赤
  "#fbbf24", // 黄
  "#34d399", // 緑
  "#a78bfa", // 紫
  "#fb7185", // ピンク
  "#60a5fa", // 水色
  "#fde047", // 黄緑
]

export default function NewSubjectPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [color, setColor] = useState("#38bdf8")
  const [isPending, startTransition] = useTransition()
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error("科目名を入力してください")
      return
    }
    
    startTransition(async () => {
      const result = await createSubject(name.trim(), color)
      
      if (result.success) {
        toast.success("科目を追加しました")
        router.push("/main")
      } else {
        toast.error(result.error || "エラーが発生しました")
      }
    })
  }
  
  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/main"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          ダッシュボードに戻る
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">新しい科目を追加</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">科目名</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 数学、英語、物理"
              disabled={isPending}
              className="mt-1"
              maxLength={50}
            />
            <p className="text-sm text-gray-500 mt-1">
              最大50文字まで入力できます
            </p>
          </div>
          
          <div>
            <Label>色を選択</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    color === presetColor 
                      ? "border-gray-800 scale-110" 
                      : "border-gray-300 hover:border-gray-500"
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                  disabled={isPending}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              科目を識別しやすくするために色を選択してください
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/main")}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              追加
            </Button>
          </div>
        </form>
      </div>
    </div>
    </Layout>
  )
}