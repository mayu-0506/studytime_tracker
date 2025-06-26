"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import toast from "react-hot-toast"
import { Loader2 } from "lucide-react"
import FormError from "@/components/auth/FormError"

const PasswordSchema = z.object({
  password: z.string().min(6, {
    message: "パスワードは6文字以上で入力してください",
  }),
  confirmPassword: z.string().min(6, {
    message: "パスワードは6文字以上で入力してください",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
})

const PasswordPage = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const form = useForm<z.infer<typeof PasswordSchema>>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof PasswordSchema>) => {
    setLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      })

      if (error) {
        setError(error.message)
        return
      }

      toast.success("パスワードを変更しました")
      form.reset()
    } catch (err) {
      setError("エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">パスワード変更</h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>新しいパスワード</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="新しいパスワード"
                    {...field}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>新しいパスワード（確認）</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="新しいパスワード（確認）"
                    {...field}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormError message={error} />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            パスワードを変更
          </Button>
        </form>
      </Form>
    </div>
  )
}

export default PasswordPage