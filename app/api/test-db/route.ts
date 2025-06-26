import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  console.log('Test DB Route: 開始')
  
  const supabase = createRouteHandlerClient({ cookies })
  
  const results = {
    timestamp: new Date().toISOString(),
    profilesTable: { success: false, error: null as string | null, data: null as any },
    authStatus: { user: null as any, error: null as string | null },
    tablesList: { tables: [] as string[], error: null as string | null }
  }
  
  try {
    // 認証状態の確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    results.authStatus.user = user
    results.authStatus.error = authError?.message || null
    console.log('認証状態:', { user: user?.id, error: authError?.message })
    
    // profilesテーブルの存在確認
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    results.profilesTable.success = !profilesError
    results.profilesTable.error = profilesError?.message || null
    results.profilesTable.data = profilesData
    console.log('profilesテーブル確認:', { success: !profilesError, error: profilesError?.message })
    
    // テーブル一覧の取得（デバッグ用）
    const { data: tablesData, error: tablesError } = await supabase
      .from('study_sessions')
      .select('id')
      .limit(1)
    
    if (!tablesError) {
      results.tablesList.tables.push('study_sessions')
    }
    console.log('study_sessionsテーブル確認:', { success: !tablesError, error: tablesError?.message })
    
    return NextResponse.json({
      success: results.profilesTable.success,
      results
    })
  } catch (e: any) {
    console.error('Test DB Route エラー:', e)
    return NextResponse.json({ 
      success: false,
      error: e.message || '予期しないエラーが発生しました',
      results
    }, { status: 500 })
  }
}