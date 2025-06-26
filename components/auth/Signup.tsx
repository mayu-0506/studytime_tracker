"use client"

import { useState, useTransition } from "react"
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
import { ChevronRight, Loader2, EyeOffIcon, EyeIcon } from "lucide-react"
import { SignupSchema } from "@/schemas"
import { z } from "zod"
import { signup } from "@/actions/auth"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import FormError from "@/components/auth/FormError"
import Link from "next/link"

// アカウント登録
const Signup = () => {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const [passwordVisibility, setPasswordVisibility] = useState(false)

  // フォームの状態
  const form = useForm<z.infer<typeof SignupSchema>>({
    // 入力値の検証
    resolver: zodResolver(SignupSchema),
    // 初期値
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  // 送信
  const onSubmit = async (values: z.infer<typeof SignupSchema>) => {
    setError("")

    startTransition(async () => {
      try {
        console.log("サインアップ処理開始:", { email: values.email, name: values.name })
        
        const res = await signup({
          ...values,
        })

        console.log("サインアップレスポンス:", res)

        if (res?.error) {
          console.error("サインアップエラー詳細:", {
            error: res.error,
            timestamp: new Date().toISOString(),
            values: { email: values.email, name: values.name }
          })
          setError(res.error)
          return
        }

        console.log("サインアップ成功:", { email: values.email })
        toast.success("アカウントを登録しました！確認メールをご確認ください。")
        router.push("/signup/success")
        router.refresh()
      } catch (error) {
        console.error("予期しないサインアップエラー:", {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          values: { email: values.email, name: values.name }
        })
        setError("アカウント登録中に予期しないエラーが発生しました。しばらく時間をおいてから再度お試しください。")
      }
    })
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-950 shadow-lg rounded-lg p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">アカウント登録</h1>
          <p className="text-muted-foreground">
            勉強時間の記録を始めましょう
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>お名前</FormLabel>
                <FormControl>
                  <Input
                    placeholder="田中太郎"
                    {...field}
                    disabled={isPending}
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>メールアドレス</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="example@example.com"
                    {...field}
                    disabled={isPending}
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>パスワード</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={passwordVisibility ? "text" : "password"}
                      placeholder="8文字以上で入力してください"
                      {...field}
                      disabled={isPending}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setPasswordVisibility(!passwordVisibility)}
                    >
                      {passwordVisibility ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormError message={error} />
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登録中...
                </>
              ) : (
                "アカウントを作成"
              )}
            </Button>
          </div>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">
            または
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          既にアカウントをお持ちですか？{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            ログインはこちら
          </Link>
        </p>
      </div>
    </div>
  </div>
  )
}

export default Signup
