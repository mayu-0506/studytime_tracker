import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

// リダイレクトループ検知用のヘッダー
const REDIRECT_COUNT_HEADER = 'x-middleware-redirect-count'
const MAX_REDIRECTS = 5

// Cookie サイズ制限をより厳格に
const COOKIE_WARNING_SIZE = 2048  // 2KB警告
const COOKIE_ERROR_SIZE = 3072    // 3KBエラー
const COOKIE_CRITICAL_SIZE = 4096 // 4KB致命的 - 即削除

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  console.log(`[Middleware] Processing path: ${pathname}`)
  
  // 静的ファイルやAPI以外のパスのみ処理
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // 緊急Cookie削除エンドポイント
  if (pathname === '/api/clear-cookies') {
    const response = NextResponse.json({ message: 'Cookies cleared' })
    
    // 全てのSupabase関連Cookieを削除
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.includes('supabase') || 
          cookie.name.includes('auth') || 
          cookie.name.includes('sb-')) {
        response.cookies.delete(cookie.name)
      }
    })
    
    return response
  }

  // リダイレクトループ検知
  const redirectCount = parseInt(request.headers.get(REDIRECT_COUNT_HEADER) || '0')
  if (redirectCount >= MAX_REDIRECTS) {
    console.error(`🚨 Redirect loop detected for ${pathname}. Count: ${redirectCount}`)
    
    // ループ時は全Cookie削除してリセット
    const response = new NextResponse(
      `Redirect loop detected. Clearing cookies and redirecting to home.`,
      { status: 302 }
    )
    response.headers.set('Location', '/')
    
    // Cookieを削除
    request.cookies.getAll().forEach(cookie => {
      response.cookies.delete(cookie.name)
    })
    
    return response
  }

  // 設定ページへのアクセスは特別扱い - より寛容に
  const isSettingsPage = pathname.startsWith('/setting')
  
  // Cookie サイズ事前チェック（設定ページ以外は厳格に）
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieSize = new TextEncoder().encode(cookieHeader).length
  
  // 個別のCookieサイズもチェック
  const largeCookies = request.cookies.getAll().filter(cookie => {
    const size = cookie.name.length + cookie.value.length
    return size > 1024 // 1KB以上
  })
  
  if (largeCookies.length > 0 && !isSettingsPage) {
    console.warn(`⚠️ Large cookies detected:`, largeCookies.map(c => ({
      name: c.name,
      size: c.name.length + c.value.length
    })))
  }
  
  if (cookieSize > COOKIE_WARNING_SIZE && !isSettingsPage) {
    console.warn(`⚠️ Cookie size warning: ${cookieSize} bytes for ${pathname}`)
  }
  
  if (cookieSize > COOKIE_ERROR_SIZE) {
    console.error(`🚨 Cookie size error: ${cookieSize} bytes for ${pathname}`)
    
    // 3KB超え - 警告して大きなCookieを削除試行
    if (!isSettingsPage) {
      const response = NextResponse.next({ request })
      
      // 大きなCookieを特定して削除
      let deletedAny = false
      const cookiesToDelete: string[] = []
      
      request.cookies.getAll().forEach(cookie => {
        const size = cookie.name.length + cookie.value.length
        
        // 1.5KB超えのCookie、またはBase64含有
        if (size > 1536 || 
            cookie.value.includes('data:image/') || 
            cookie.value.includes('base64')) {
          cookiesToDelete.push(cookie.name)
          console.log(`🗑️ Marking for deletion: ${cookie.name} (${size} bytes)`)
          deletedAny = true
        }
      })
      
      // 4KB超えた場合は即座に/cookie-errorへ
      if (cookieSize > COOKIE_CRITICAL_SIZE) {
        console.error(`💫 Cookie size CRITICAL: ${cookieSize} bytes! Redirecting to /cookie-error`)
        
        const errorUrl = new URL('/cookie-error', request.url)
        errorUrl.searchParams.set('size', cookieSize.toString())
        errorUrl.searchParams.set('from', pathname)
        
        const errorResponse = NextResponse.redirect(errorUrl)
        
        // 全Cookie削除
        request.cookies.getAll().forEach(cookie => {
          errorResponse.cookies.delete(cookie.name)
        })
        
        // Clear-Site-Dataヘッダーで完全クリア
        errorResponse.headers.set('Clear-Site-Data', '"cookies"')
        
        return errorResponse
      }
      
      // 3-4KBの間は削除試行
      if (deletedAny) {
        cookiesToDelete.forEach(name => {
          response.cookies.delete(name)
        })
      }
      
      return response
    }
  }
  
  // (上記の4KBチェックで処理済みのため、この部分は削除）

  try {
    const response = await updateSession(request)
    
    // レスポンスのCookieサイズもチェック
    const responseCookies = response.headers.get('set-cookie')
    if (responseCookies) {
      const responseSize = new TextEncoder().encode(responseCookies).length
      if (responseSize > COOKIE_WARNING_SIZE) {
        console.warn(`⚠️ Response cookie size warning: ${responseSize} bytes`)
      }
    }
    
    // リダイレクトの場合、カウンターを追加
    if (response.status >= 300 && response.status < 400) {
      response.headers.set(REDIRECT_COUNT_HEADER, (redirectCount + 1).toString())
    }
    
    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // エラー時は認証をスキップして継続
    return NextResponse.next()
  }
}

export const config = {
  // より限定的なマッチャー - 認証が必要なページのみ
  matcher: [
    '/setting/:path*',        // 設定ページを保護
    '/profile/:path*',        // プロフィールページを保護
    '/login',                 
    '/signup/:path*',         
    '/api/clear-cookies',     // Cookie削除エンドポイント
  ],
}
