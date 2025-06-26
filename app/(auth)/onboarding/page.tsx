'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [school, setSchool] = useState('')
  const [targetSchool, setTargetSchool] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // ログインチェック
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.replace('/login')
        return
      }
      
      setChecking(false)
    }
    
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('名前を入力してください')
      return
    }
    
    if (!grade) {
      alert('学年を入力してください')
      return
    }
    
    setLoading(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.replace('/login')
        return
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name: name.trim(),
          grade: Number(grade) || null,
          current_school: school.trim() || null,
          target_school: targetSchool.trim() || null,
          bio: bio.trim() || null
        })
        .eq('id', user.id)
      
      if (error) {
        alert(error.message)
        return
      }
      
      router.replace('/')
    } catch (error) {
      alert('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }
  
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">プロフィール設定</h1>
          <p className="mt-2 text-gray-600">
            学習を始める前に、基本情報を入力してください
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              お名前 <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 山田太郎"
              required
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <div>
            <label htmlFor="grade" className="block text-sm font-medium mb-2">
              学年 <span className="text-red-500">*</span>
            </label>
            <Input
              id="grade"
              type="number"
              min={1}
              max={12}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="例: 3"
              required
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <div>
            <label htmlFor="school" className="block text-sm font-medium mb-2">
              現在の学校
            </label>
            <Input
              id="school"
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="例: 〇〇高等学校"
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <div>
            <label htmlFor="targetSchool" className="block text-sm font-medium mb-2">
              志望校
            </label>
            <Input
              id="targetSchool"
              type="text"
              value={targetSchool}
              onChange={(e) => setTargetSchool(e.target.value)}
              placeholder="例: 〇〇大学"
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              自己紹介
            </label>
            <Textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="勉強の目標や意気込みなど"
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <Button
            type="submit"
            disabled={loading || !name.trim() || !grade}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              '保存して始める'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}