"use server"

import { createClient } from "@/utils/supabase/server"

export type StudyGrain = 'day' | 'week' | 'month'

export interface StudySummaryData {
  bucket_start: string
  total_min: number
}

export async function getStudySummary(
  grain: StudyGrain = 'day',
  from?: Date,
  to?: Date
): Promise<{ data: StudySummaryData[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    
    // Set default date range if not provided
    const defaultFrom = new Date()
    defaultFrom.setMonth(defaultFrom.getMonth() - 1) // Last month
    const defaultTo = new Date()
    
    const { data, error } = await supabase.rpc('get_study_summary', {
      _grain: grain,
      _from: from?.toISOString() || defaultFrom.toISOString(),
      _to: to?.toISOString() || defaultTo.toISOString()
    })
    
    if (error) {
      console.error('Error fetching study summary:', error)
      return { data: null, error: error.message }
    }
    
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { data: null, error: 'データの取得に失敗しました' }
  }
}