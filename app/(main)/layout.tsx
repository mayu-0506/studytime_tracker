import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Layout from "@/components/Layout"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server Componentで正しくSupabaseクライアントを作成
  const supabase = await createClient()
  
  // サーバーサイドで認証チェック
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // エラーハンドリングを追加
  if (error || !user) {
    // 未ログインの場合はホームページへリダイレクト
    // これにより、(main)グループ内のすべてのページで認証が必要になる
    redirect("/")
  }

  return <Layout>{children}</Layout>
}