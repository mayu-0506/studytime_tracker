import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ 
    message: 'Cookies cleared successfully',
    timestamp: new Date().toISOString() 
  })

  // 全てのCookieを取得して削除
  request.cookies.getAll().forEach(cookie => {
    // Supabase関連のCookieのみ削除
    if (
      cookie.name.includes('supabase') || 
      cookie.name.includes('auth') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('_Host-') ||
      cookie.name.includes('__Secure-')
    ) {
      console.log(`Deleting cookie: ${cookie.name}`)
      
      // 様々なパスとドメインで削除を試みる
      response.cookies.delete({
        name: cookie.name,
        path: '/',
      })
      
      response.cookies.set({
        name: cookie.name,
        value: '',
        maxAge: 0,
        path: '/',
      })
    }
  })

  // レスポンスヘッダーでも削除を指示
  response.headers.set('Clear-Site-Data', '"cookies", "storage"')

  return response
}

export async function GET(request: NextRequest) {
  // GETリクエストでCookie情報を返す（デバッグ用）
  const cookies = request.cookies.getAll()
  const cookieInfo = cookies.map(cookie => ({
    name: cookie.name,
    size: cookie.value.length,
    isSupabase: cookie.name.includes('supabase') || cookie.name.includes('sb-'),
    preview: cookie.value.substring(0, 50) + (cookie.value.length > 50 ? '...' : '')
  }))

  const totalSize = cookies.reduce((sum, cookie) => 
    sum + cookie.name.length + cookie.value.length, 0
  )

  return NextResponse.json({
    totalCookies: cookies.length,
    totalSize: totalSize,
    totalSizeKB: (totalSize / 1024).toFixed(2),
    cookies: cookieInfo,
    warning: totalSize > 4096 ? 'Cookie size exceeds 4KB!' : null,
    critical: totalSize > 8192 ? 'HTTP 431 ERROR LIKELY!' : null
  })
}