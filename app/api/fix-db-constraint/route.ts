import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()
    
    // 管理者権限で実行する必要があるため、このエンドポイントは開発環境でのみ使用
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: "開発環境でのみ使用可能です" }, { status: 403 })
    }
    
    // NOT NULL制約を削除するSQLを実行
    const { data, error } = await supabase.rpc('fix_subject_id_constraint', {})
    
    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}