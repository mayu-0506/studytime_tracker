import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import DashboardView from './DashboardView'
import { 
  getDashboardTotals, 
  getSubjectBreakdown, 
  getLast7DayBuckets, 
  getLast4WeekBuckets 
} from '@/actions/dashboard-stats'
import { DashboardInitialData } from '@/types/dashboard'
import { Database } from '@/src/lib/database.types'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component内でのcookie設定エラーは無視
          }
        },
      },
    }
  )

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // 初期データ取得（RPCを使用）
  const initialData: DashboardInitialData = {
    totals: null,
    subjectBreakdown: [],
    dayBuckets: [],
    weekBuckets: [],
    error: null
  }

  try {
    // RPC関数を使ってデータを取得
    const [totalsResult, subjectBreakdown, dayBuckets, weekBuckets] = await Promise.all([
      getDashboardTotals(),
      getSubjectBreakdown(),
      getLast7DayBuckets(),
      getLast4WeekBuckets()
    ])

    if (totalsResult.error) throw new Error(totalsResult.error)

    initialData.totals = totalsResult.data
    initialData.subjectBreakdown = subjectBreakdown
    initialData.dayBuckets = dayBuckets
    initialData.weekBuckets = weekBuckets

  } catch (e) {
    console.error('Dashboard RPC error:', e)
    initialData.error = e instanceof Error ? e.message : 'データの取得中にエラーが発生しました'
  }

  return <DashboardView initialData={initialData} />
}