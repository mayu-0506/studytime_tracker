"use server"

import { createClient } from "@/utils/supabase/server"
import { Database } from "@/src/lib/database.types"

export interface DashboardTotals {
  total_min: number
  current_week_min: number
  current_month_min: number
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
    const rawTotals = Array.isArray(data) ? data[0] : data
    
    // RPC関数の列名を期待される形式にマッピング
    let totals: DashboardTotals
    
    if (rawTotals) {
      // 新しい列名が存在する場合はそれを使用
      if ('current_week_min' in rawTotals && 'current_month_min' in rawTotals) {
        totals = {
          total_min: rawTotals.total_min || 0,
          current_week_min: rawTotals.current_week_min || 0,
          current_month_min: rawTotals.current_month_min || 0
        }
      } 
      // 古い列名しか存在しない場合（DBが更新されていない）
      else if ('last7_min' in rawTotals && 'last4w_min' in rawTotals) {
        totals = {
          total_min: rawTotals.total_min || 0,
          current_week_min: rawTotals.last7_min || 0,  // 暫定的に過去7日間を表示
          current_month_min: rawTotals.last4w_min || 0  // 暫定的に過去28日間を表示
        }
      }
      // その他の場合
      else {
        totals = { total_min: 0, current_week_min: 0, current_month_min: 0 }
      }
    } else {
      totals = { total_min: 0, current_week_min: 0, current_month_min: 0 }
    }
    
    return { data: totals, error: null }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'データの取得に失敗しました' }
  }
}

export async function getSubjectBreakdown(period: 'all' | 'last_7_days' | 'last_4_weeks' = 'all'): Promise<SubjectBreakdown[]> {
  const supabase = await createClient()
  
  // subject_breakdown_with_period関数を使用
  const { data, error } = await supabase.rpc('subject_breakdown_with_period', {
    period_type: period
  })
  
  if (error) {
    console.error('subject_breakdown_with_period RPC error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw error
  }
  
  return data || [] // [{ subject_id, name, total_min }]
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
    
    // データを正しい形式に変換
    const formattedData = (data || []).map(item => ({
      day: typeof item.day === 'string' ? item.day : new Date(item.day).toISOString().split('T')[0],
      total_min: item.total_min || 0
    }))
    
    return { data: formattedData, error: null }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: [], error: 'データの取得に失敗しました' }
  }
}

export interface DaySessionDetail {
  id: string
  subject_name: string
  subject_color: string | null
  start_time: string
  end_time: string | null
  duration: number
  memo: string | null
}

export async function getDaySessionDetails(date: string): Promise<{ data: DaySessionDetail[]; error: string | null }> {
  try {
    const supabase = await createClient()
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    
    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        id,
        start_time,
        end_time,
        duration,
        duration_min,
        memo,
        preset_subject,
        custom_subject_id,
        custom_subjects (
          name,
          color_hex
        )
      `)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching day session details:', error)
      return { data: [], error: error.message }
    }
    
    const formattedData = (data || []).map(session => {
      let subject_name = '不明な科目'
      let subject_color = null
      
      if (session.preset_subject) {
        subject_name = session.preset_subject
        // プリセット科目の色
        const presetColors = {
          '数学': '#4ECDC4',
          '英語': '#45B7D1',
          '国語': '#FA8072',
          '理科': '#95E1A3',
          '社会': '#F4E04D',
          'その他': '#95A5A6'
        }
        subject_color = presetColors[session.preset_subject as keyof typeof presetColors]
      } else if (session.custom_subjects) {
        subject_name = session.custom_subjects.name
        subject_color = session.custom_subjects.color_hex
      }
      
      return {
        id: session.id,
        subject_name,
        subject_color,
        start_time: session.start_time,
        end_time: session.end_time,
        duration: session.duration_min || session.duration || 0,
        memo: session.memo
      }
    })
    
    return { data: formattedData, error: null }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: [], error: 'データの取得に失敗しました' }
  }
}