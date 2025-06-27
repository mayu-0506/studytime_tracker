import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 各RPC関数を個別にテスト
    const results = {
      dashboard_totals: null as any,
      subject_breakdown: null as any,
      last_7_day_buckets: null as any,
      last_4_week_buckets: null as any,
      errors: [] as string[]
    }
    
    // 1. dashboard_totals
    try {
      const { data, error } = await supabase.rpc('dashboard_totals')
      if (error) {
        results.errors.push(`dashboard_totals error: ${error.message}`)
      } else {
        results.dashboard_totals = data
      }
    } catch (e) {
      results.errors.push(`dashboard_totals exception: ${e}`)
    }
    
    // 2. subject_breakdown
    try {
      const { data, error } = await supabase.rpc('subject_breakdown')
      if (error) {
        results.errors.push(`subject_breakdown error: ${error.message}`)
      } else {
        results.subject_breakdown = data
      }
    } catch (e) {
      results.errors.push(`subject_breakdown exception: ${e}`)
    }
    
    // 3. last_7_day_buckets
    try {
      const { data, error } = await supabase.rpc('last_7_day_buckets')
      if (error) {
        results.errors.push(`last_7_day_buckets error: ${error.message}`)
      } else {
        results.last_7_day_buckets = data
      }
    } catch (e) {
      results.errors.push(`last_7_day_buckets exception: ${e}`)
    }
    
    // 4. last_4_week_buckets
    try {
      const { data, error } = await supabase.rpc('last_4_week_buckets')
      if (error) {
        results.errors.push(`last_4_week_buckets error: ${error.message}`)
      } else {
        results.last_4_week_buckets = data
      }
    } catch (e) {
      results.errors.push(`last_4_week_buckets exception: ${e}`)
    }
    
    // subject_breakdownの詳細チェック
    if (results.subject_breakdown && Array.isArray(results.subject_breakdown) && results.subject_breakdown.length > 0) {
      const firstItem = results.subject_breakdown[0]
      results.errors.push(`subject_breakdown first item keys: ${Object.keys(firstItem).join(', ')}`)
    }
    
    return NextResponse.json(results, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug API error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}