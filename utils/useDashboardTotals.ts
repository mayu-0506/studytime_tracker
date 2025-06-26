"use client"

import useSWR from "swr"
import { createClient } from "@/utils/supabase/client"
import { DashboardTotals } from "@/actions/dashboard-stats"

// SWR fetcher that always throws on error
const fetcher = async (key: string) => {
  const supabase = createClient()
  const result = await supabase.rpc('dashboard_totals')
  
  if (result.error) {
    throw result.error
  }
  
  // RPC returns array, get first element
  return result.data?.[0] || { total_min: 0, last7_min: 0, last4w_min: 0 }
}

export function useDashboardTotals(fallbackData?: DashboardTotals) {
  const { data, error, mutate } = useSWR<DashboardTotals>(
    '/rpc/dashboard_totals',
    fetcher,
    {
      fallbackData,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  )
  
  return {
    data: data || fallbackData || { total_min: 0, last7_min: 0, last4w_min: 0 },
    error,
    mutate,
    isLoading: !error && !data && !fallbackData
  }
}