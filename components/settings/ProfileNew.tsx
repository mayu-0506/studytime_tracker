"use client"

import { useState, useTransition } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { ProfileType } from "@/types"
import toast from "react-hot-toast"
import FormError from "@/components/auth/FormError"
import { updateProfile } from "@/actions/profile"
import { uploadAvatar, resizeImage } from "@/src/utils/uploadAvatar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const ProfileSchemaExtended = z.object({
  name: z.string().min(1, {
    message: "名前を入力してください",
  }),
  grade: z.string().min(1, {
    message: "学年を入力してください",
  }).refine((val) => {
    const num = Number(val)
    return !isNaN(num) && num >= 1 && num <= 12
  }, {
    message: "学年は1〜12の数値で入力してください",
  }),
  current_school: z.string().optional(),
  target_school: z.string().optional(),
  bio: z.string().optional(),
})

interface ProfileProps {
  profile: ProfileType
}

const ProfileNew = ({ profile }: ProfileProps) => {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const form = useForm<z.infer<typeof ProfileSchemaExtended>>({
    resolver: zodResolver(ProfileSchemaExtended),
    defaultValues: {
      name: profile.name || "",
      grade: profile.grade?.toString() || "",
      current_school: profile.current_school || "",
      target_school: profile.target_school || "",
      bio: profile.bio || profile.introduce || "",
    },
  })

  // 送信
  const onSubmit = (values: z.infer<typeof ProfileSchemaExtended>) => {
    setError("")

    startTransition(async () => {
      try {
        const submitData = {
          ...values,
          grade: Number(values.grade) || null,
        }
        const res = await updateProfile(profile.id, submitData)

        if (!res.success) {
          setError(res.error || "エラーが発生しました")
          return
        }

        toast.success("プロフィールを編集しました")
        router.refresh()
        router.push("/profile")
      } catch (error) {
        console.error(error)
        setError("エラーが発生しました")
      }
    })
  }

  // 画像ファイル選択処理
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setUploadingAvatar(true)

    try {
      let uploadFile = file
      
      // 2MB超の場合はリサイズ
      if (file.size > 2 * 1024 * 1024) {
        toast.loading("画像をリサイズしています...")
        uploadFile = await resizeImage(file, 800, 800)
        toast.dismiss()
      }

      // プレビュー表示
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(uploadFile)

      // アップロード
      const result = await uploadAvatar(uploadFile, profile.id)
      
      if (result.error) {
        setError(result.error)
        // エラー時は元の画像に戻す
        setAvatarPreview(profile.avatar_url)
      } else {
        toast.success("プロフィール画像を更新しました")
        // URLにタイムスタンプを追加してキャッシュを回避
        setAvatarPreview(result.url)
      }
    } catch (error) {
      console.error("Avatar upload error:", error)
      setError("画像のアップロードに失敗しました")
      setAvatarPreview(profile.avatar_url)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ドラッグ&ドロップ処理
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const input = document.getElementById('avatar-upload') as HTMLInputElement
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input.files = dataTransfer.files
      
      const event = new Event('change', { bubbles: true })
      input.dispatchEvent(event)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const fallbackText = profile.name?.charAt(0)?.toUpperCase() || "U"

  return (
    <div>
      <div className="text-2xl font-bold text-center mb-5">プロフィール編集</div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="text-center">
            <div 
              className="inline-block relative group"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarPreview || undefined} alt="プロフィール画像" />
                <AvatarFallback className="bg-gray-300 text-gray-700 text-2xl">
                  {fallbackText}
                </AvatarFallback>
              </Avatar>
              
              <label
                htmlFor="avatar-upload"
                className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ${
                  uploadingAvatar ? 'opacity-100' : ''
                }`}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-white" />
                )}
              </label>
              
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploadingAvatar || isPending}
                className="hidden"
              />
            </div>
            
            <p className="text-sm text-gray-500 mt-2">
              クリックまたはドラッグ&ドロップで画像を変更
            </p>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>名前 <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="名前"
                    {...field}
                    disabled={isPending}
                    autoComplete="name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>学年 <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    placeholder="例: 3"
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_school"
            render={({ field }) => (
              <FormItem>
                <FormLabel>現在の学校</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: ○○高等学校"
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_school"
            render={({ field }) => (
              <FormItem>
                <FormLabel>志望校</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: ○○大学"
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>自己紹介</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="勉強の目標や意気込みなど"
                    rows={4}
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && <FormError message={error} />}

          <Button type="submit" className="w-full" disabled={isPending || uploadingAvatar}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            プロフィールを更新
          </Button>
        </form>
      </Form>
    </div>
  )
}

export default ProfileNew