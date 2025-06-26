'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function VerifyPage() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <h1 className="text-2xl font-bold">メール確認が完了しました！</h1>
      <p className="text-muted-foreground">
        まずはプロフィールを設定してください。
      </p>
      <Button onClick={() => router.push('/onboarding')}>
        プロフィールを入力する
      </Button>
    </div>
  )
}