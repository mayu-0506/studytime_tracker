"use server"

import { createClient } from "@/utils/supabase/server"
import { Database } from "@/src/lib/database.types"

export interface DashboardTotals {
  total_min: number
  last7_min: number
  last4w_min: number
}

// データベースから返される実際の型
export type SubjectBreakdown = Database['public']['Functions']['subject_breakdown']['Returns'][0]
export type DayBucket = Database['public']['Functions']['last_7_day_buckets']['Returns'][0]
export type WeekBucket = Database['public']['Functions']['last_4_week_buckets']['Returns'][0]

export interface CalendarDay {
  day: string
  total_min: number
}

export async function getDashboardTotals(): Promise<{ data: DashboardTotals | null; error: string | null }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('dashboard_totals')
    
    if (error) {
      console.error('Error fetching dashboard totals:', error)
      return { data: null, error: error.message }
    }
    
    // データが配列で返ってくる場合は最初の要素を取得
    const totals = Array.isArray(data) ? data[0] : data
    
    return { data: totals || { total_min: 0, last7_min: 0, last4w_min: 0 }, error: null }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'データの取得に失敗しました' }
  }
}

export async function getSubjectBreakdown(): Promise<SubjectBreakdown[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('subject_breakdown')
  
  if (error) throw error
  return data // [{ subject_id, name, total_min }]
}

export async function getLast7DayBuckets(): Promise<DayBucket[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('last_7_day_buckets')
  
  if (error) throw error
  return data // [{ d, total_min }]
}

export async function getLast4WeekBuckets(): Promise<WeekBucket[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('last_4_week_buckets')
  
  if (error) throw error
  return data // [{ week_start, total_min }]
}

export async function getMonthlyCalendar(firstDay: Date, lastDay: Date): Promise<{ data: CalendarDay[]; error: string | null }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('monthly_calendar', {
      _first: firstDay.toISOString().split('T')[0],
      _last: lastDay.toISOString().split('T')[0]
    })
    
    if (error) {
      console.error('Error fetching monthly calendar:', error)
      return { data: [], error: error.message }
    }
    
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: [], error: 'データの取得に失敗しました' }
  }
}