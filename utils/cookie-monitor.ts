import { NextRequest } from 'next/server'
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies'

export interface CookieInfo {
  name: string
  size: number
  sizeKB: string
  isSupabase: boolean
  isAuth: boolean
  preview: string
}

export interface CookieAnalysis {
  totalCookies: number
  totalSize: number
  totalSizeKB: string
  cookies: CookieInfo[]
  warnings: string[]
  critical: boolean
}

/**
 * Cookieサイズをダンプしてログ出力（詳細版）
 */
export function dumpCookieSize(
  cookies: RequestCookies | Request['headers'],
  label: string = 'Cookie Analysis',
  options?: {
    verbose?: boolean
    logToFile?: boolean
    includeValues?: boolean
  }
): CookieAnalysis {
  console.log(`\n📊 === ${label} ===`)
  
  let cookieArray: { name: string; value: string }[] = []
  
  // RequestCookiesの場合
  if ('getAll' in cookies) {
    cookieArray = cookies.getAll()
  } else {
    // Headersの場合
    const cookieHeader = cookies.get('cookie') || ''
    cookieArray = parseCookieHeader(cookieHeader)
  }
  
  const analysis: CookieAnalysis = {
    totalCookies: cookieArray.length,
    totalSize: 0,
    totalSizeKB: '0',
    cookies: [],
    warnings: [],
    critical: false
  }
  
  // 各Cookieを分析
  cookieArray.forEach(cookie => {
    const size = cookie.name.length + cookie.value.length + 2 // "=" と ";"
    analysis.totalSize += size
    
    const cookieInfo: CookieInfo = {
      name: cookie.name,
      size: size,
      sizeKB: (size / 1024).toFixed(2),
      isSupabase: cookie.name.includes('sb-') || cookie.name.includes('supabase'),
      isAuth: cookie.name.includes('auth') || cookie.name.includes('session'),
      preview: cookie.value.length > 50 
        ? cookie.value.substring(0, 50) + '...' 
        : cookie.value
    }
    
    analysis.cookies.push(cookieInfo)
    
    // 警告判定
    if (size > 4096) {
      analysis.warnings.push(`⚠️ Cookie "${cookie.name}" is too large: ${cookieInfo.sizeKB} KB`)
    }
    
    if (cookie.value.includes('data:image/')) {
      analysis.warnings.push(`🖼️ Cookie "${cookie.name}" contains Base64 image data!`)
      analysis.critical = true
    }
  })
  
  analysis.totalSizeKB = (analysis.totalSize / 1024).toFixed(2)
  
  // ログ出力
  console.log(`Total Cookies: ${analysis.totalCookies}`)
  console.log(`Total Size: ${analysis.totalSize} bytes (${analysis.totalSizeKB} KB)`)
  
  // 詳細ログ
  if (options?.verbose) {
    console.log('\n📝 All Cookies:')
    const cookieTable = analysis.cookies.map(c => ({
      name: c.name,
      sizeKB: c.sizeKB,
      isSupabase: c.isSupabase,
      isAuth: c.isAuth,
      value: options?.includeValues ? c.preview : '***'
    }))
    console.table(cookieTable)
  }
  
  // 大きなCookieをログ
  const largeCookies = analysis.cookies
    .filter(c => c.size > 1024)
    .sort((a, b) => b.size - a.size)
  
  if (largeCookies.length > 0) {
    console.log('\n🔍 Large Cookies:')
    console.table(largeCookies.map(c => ({
      name: c.name,
      sizeKB: c.sizeKB,
      isSupabase: c.isSupabase,
      isAuth: c.isAuth,
      value: options?.includeValues ? c.preview : '***'
    })))
  }
  
  // ファイル出力オプション
  if (options?.logToFile) {
    const logData = {
      timestamp: new Date().toISOString(),
      label,
      analysis,
      environment: process.env.NODE_ENV
    }
    
    // 実際のファイル書き込みは環境に応じて実装
    console.log('📄 [Would write to file]:', JSON.stringify(logData, null, 2))
  }
  
  // 警告出力
  if (analysis.warnings.length > 0) {
    console.log('\n⚠️ Warnings:')
    analysis.warnings.forEach(w => console.log(w))
  }
  
  // 致命的エラー
  if (analysis.totalSize > 8192) {
    console.error(`\n🚨 CRITICAL: Total cookie size (${analysis.totalSizeKB} KB) exceeds 8KB!`)
    analysis.critical = true
  }
  
  console.log(`\n=== End ${label} ===\n`)
  
  return analysis
}

/**
 * CookieヘッダーをパースしてCookie配列に変換
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return []
  
  return cookieHeader.split(';').map(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=')
    return {
      name: name || '',
      value: valueParts.join('=') || ''
    }
  }).filter(c => c.name)
}

/**
 * SupabaseセッションからBase64データを削除
 */
export function sanitizeSupabaseSession(session: any): any {
  if (!session) return session
  
  const sanitized = JSON.parse(JSON.stringify(session)) // Deep clone
  
  // user_metadataをクリーン
  if (sanitized.user?.user_metadata) {
    const metadata = sanitized.user.user_metadata
    
    // 大きなフィールドを削除
    Object.keys(metadata).forEach(key => {
      const value = metadata[key]
      if (typeof value === 'string' && value.length > 1024) {
        console.log(`🗑️ Removing large metadata field: ${key} (${value.length} bytes)`)
        delete metadata[key]
      }
      
      // Base64画像を検出して削除
      if (typeof value === 'string' && value.includes('data:image/')) {
        console.log(`🖼️ Removing Base64 image from: ${key}`)
        delete metadata[key]
      }
    })
  }
  
  // JWTトークン自体が大きい場合は警告
  const sessionString = JSON.stringify(sanitized)
  if (sessionString.length > 3072) { // 3KB
    console.warn(`⚠️ Session still large after sanitization: ${(sessionString.length / 1024).toFixed(2)} KB`)
  }
  
  return sanitized
}

/**
 * Middleware用のCookie監視フック
 */
export function createCookieMonitor(options?: {
  maxCookieSize?: number
  maxTotalSize?: number
  logLevel?: 'debug' | 'warn' | 'error'
}) {
  const config = {
    maxCookieSize: options?.maxCookieSize || 4096,
    maxTotalSize: options?.maxTotalSize || 8192,
    logLevel: options?.logLevel || 'warn'
  }
  
  return (request: NextRequest, label?: string) => {
    const analysis = dumpCookieSize(request.cookies, label || request.nextUrl.pathname)
    
    // 設定に基づいてアクション
    if (analysis.critical || analysis.totalSize > config.maxTotalSize) {
      if (config.logLevel !== 'error') {
        console.error(`🚨 Cookie size critical for ${request.nextUrl.pathname}`)
      }
      return { shouldBlock: true, analysis }
    }
    
    if (analysis.warnings.length > 0 && config.logLevel === 'debug') {
      console.warn(`⚠️ Cookie warnings for ${request.nextUrl.pathname}`)
    }
    
    return { shouldBlock: false, analysis }
  }
}