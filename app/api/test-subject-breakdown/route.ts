import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // subject_breakdown関数を実行
    const { data, error } = await supabase.rpc('subject_breakdown')
    
    if (error) {
      return NextResponse.json({ 
        error: 'RPC error',
        details: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      }, { status: 500 })
    }
    
    // データ構造を確認
    const response = {
      success: true,
      rowCount: data?.length || 0,
      data: data,
      firstRow: data && data.length > 0 ? data[0] : null,
      keys: data && data.length > 0 ? Object.keys(data[0]) : []
    }
    
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}