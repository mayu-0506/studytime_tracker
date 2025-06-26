"use client"

import useSWR from "swr"
import { createClient } from "@/utils/supabase/client"
import { 
  DashboardTotals, 
  SubjectBreakdown, 
  DayBucket, 
  WeekBucket,
  CalendarDay 
} from "@/actions/dashboard-stats"

// SWR fetcher that always throws on error
const fetcher = async (key: string, ...args: any[]) => {
  const supabase = createClient()
  
  // Parse the key to determine which RPC to call
  // Key format: /rpc/[rpc_name] or /rpc/[rpc_name]/[param1]/[param2]
  const match = key.match(/^\/rpc\/([^\/]+)/)
  if (!match) {
    throw new Error(`Invalid RPC key format: ${key}`)
  }
  
  const rpcName = match[1]
  let result
  
  switch (rpcName) {
    case 'dashboard_totals':
      result = await supabase.rpc('dashboard_totals')
      break
    case 'subject_breakdown':
      result = await supabase.rpc('subject_breakdown')
      break
    case 'last_7day_buckets':
      result = await supabase.rpc('last_7_day_buckets')
      break
    case 'last_4week_buckets':
      result = await supabase.rpc('last_4_week_buckets')
      break
    case 'monthly_calendar':
      // Extract date parameters from the key
      const dateMatch = key.match(/monthly_calendar\/([^\/]+)\/([^\/]+)$/)
      if (dateMatch) {
        const [_, first, last] = dateMatch
        result = await supabase.rpc('monthly_calendar', { _first: first, _last: last })
      } else {
        throw new Error('Invalid monthly_calendar parameters')
      }
      break
    default:
      throw new Error(`Unknown RPC: ${rpcName}`)
  }
  
  if (result.error) {
    throw result.error
  }
  
  return result.data
}

export function useDashboardTotals() {
  const { data, error, mutate } = useSWR<DashboardTotals[]>(
    '/rpc/dashboard_totals',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )
  
  // RPC returns array, get first element
  const totals = data?.[0] || { total_min: 0, last7_min: 0, last4w_min: 0 }
  
  return {
    data: totals,
    error,
    isLoading: !error && !data,
    mutate
  }
}

export function useSubjectBreakdown() {
  const { data, error, mutate } = useSWR<SubjectBreakdown[]>(
    '/rpc/subject_breakdown',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )
  
  return {
    data: data || [],
    error,
    isLoading: !error && !data,
    mutate
  }
}

export function useLast7DayBuckets() {
  const { data, error, mutate } = useSWR<DayBucket[]>(
    '/rpc/last_7day_buckets',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )
  
  return {
    data: data || [],
    error,
    isLoading: !error && !data,
    mutate
  }
}

export function useLast4WeekBuckets() {
  const { data, error, mutate } = useSWR<WeekBucket[]>(
    '/rpc/last_4week_buckets',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )
  
  return {
    data: data || [],
    error,
    isLoading: !error && !data,
    mutate
  }
}

export function useMonthlyCalendar(firstDay: string, lastDay: string) {
  const { data, error, mutate } = useSWR<CalendarDay[]>(
    firstDay && lastDay ? `/rpc/monthly_calendar/${firstDay}/${lastDay}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )
  
  return {
    data: data || [],
    error,
    isLoading: !error && !data,
    mutate
  }
}