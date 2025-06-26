import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Cookieの詳細情報を取得
  const cookies = request.cookies.getAll()
  const cookieDetails = cookies.map(cookie => {
    const hasBase64 = cookie.value.includes('data:image/') || cookie.value.includes('base64')
    
    // Base64画像を検出
    let base64Info = null
    if (hasBase64) {
      const base64Match = cookie.value.match(/data:image\/(\w+);base64,([A-Za-z0-9+/=]+)/)
      if (base64Match) {
        base64Info = {
          format: base64Match[1],
          dataLength: base64Match[2].length
        }
      }
    }
    
    return {
      name: cookie.name,
      size: cookie.value.length,
      sizeKB: (cookie.value.length / 1024).toFixed(2),
      isSupabase: cookie.name.includes('supabase') || cookie.name.includes('sb-'),
      isAuth: cookie.name.includes('auth'),
      hasBase64,
      base64Info,
      preview: cookie.value.substring(0, 100) + (cookie.value.length > 100 ? '...' : '')
    }
  })

  const totalSize = cookies.reduce((sum, cookie) => 
    sum + cookie.name.length + cookie.value.length, 0
  )

  // 大きなCookieを特定
  const largeCookies = cookieDetails
    .filter(c => c.size > 1024)
    .sort((a, b) => b.size - a.size)

  return NextResponse.json({
    totalCookies: cookies.length,
    totalSize: totalSize,
    totalSizeKB: (totalSize / 1024).toFixed(2),
    status: {
      warning: totalSize > 2048,
      error: totalSize > 4096,
      critical: totalSize > 8192
    },
    largeCookies,
    allCookies: cookieDetails,
    recommendation: totalSize > 4096 ? 
      'Cookie size is too large. Please clear cookies or logout to prevent HTTP 431 errors.' : 
      'Cookie size is within acceptable limits.'
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}