import { NextRequest } from 'next/server'
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies'

export interface CookieDetail {
  name: string
  size: number
  hasBase64: boolean
  category: 'auth' | 'session' | 'other'
}

export interface CookieAnalysis {
  totalSize: number
  cookieCount: number
  details: CookieDetail[]
  warnings: string[]
  status?: 'ok' | 'warning' | 'critical'
}

/**
 * Cookie サイズを詳細に分析・ダンプするユーティリティ
 * RequestCookies、Headers、または文字列形式のCookieに対応
 */
export function dumpCookieSize(
  cookies: RequestCookies | Request['headers'] | string,
  label: string = 'Cookie Analysis'
): CookieAnalysis {
  const analysis: CookieAnalysis = {
    totalSize: 0,
    cookieCount: 0,
    details: [],
    warnings: []
  }

  const SIZE_LIMITS = {
    ok: 2048,        // 2KB - OK
    warning: 3072,   // 3KB - 警告
    critical: 4096   // 4KB - 危険
  }

  // RequestCookiesの場合
  if (typeof cookies === 'object' && 'getAll' in cookies) {
    const allCookies = cookies.getAll()
    analysis.cookieCount = allCookies.length

    allCookies.forEach(cookie => {
      const size = cookie.name.length + cookie.value.length
      analysis.totalSize += size

      const hasBase64 = cookie.value.includes('data:image/') || cookie.value.includes('base64')
      const isSupabase = cookie.name.includes('supabase') || cookie.name.includes('sb-')
      const isSession = cookie.name.includes('session') || cookie.name.includes('auth')
      
      analysis.details.push({
        name: cookie.name,
        size,
        hasBase64,
        category: isSupabase || isSession ? 'auth' : 'other'
      })

      // 問題のあるCookieを警告
      if (size > 1024) {
        const emoji = size > 2048 ? '🚨' : '⚠️'
        analysis.warnings.push(`${emoji} ${cookie.name}: ${size} bytes (${(size / 1024).toFixed(1)} KB)`)
      }

      if (hasBase64) {
        analysis.warnings.push(`🖼️ ${cookie.name}: Contains Base64 image data!`)
      }
    })
  }
  // Headersの場合
  else if (typeof cookies === 'object' && 'get' in cookies) {
    const cookieHeader = cookies.get('cookie') || ''
    if (cookieHeader) {
      const cookieString = typeof cookieHeader === 'string' ? cookieHeader : cookieHeader.toString()
      analysis.totalSize = new TextEncoder().encode(cookieString).length
      analysis.cookieCount = cookieString.split(';').filter(c => c.trim()).length
    }
  }
  // 文字列の場合（document.cookie など）
  else if (typeof cookies === 'string') {
    analysis.totalSize = new TextEncoder().encode(cookies).length
    const cookiePairs = cookies.split(';').filter(c => c.trim())
    analysis.cookieCount = cookiePairs.length
    
    cookiePairs.forEach(pair => {
      const [name, ...valueParts] = pair.trim().split('=')
      const value = valueParts.join('=')
      const size = name.length + value.length
      
      const hasBase64 = value.includes('data:image/') || value.includes('base64')
      const isAuth = name.includes('supabase') || name.includes('sb-') || 
                     name.includes('session') || name.includes('auth')
      
      analysis.details.push({
        name: name.trim(),
        size,
        hasBase64,
        category: isAuth ? 'auth' : 'other'
      })
    })
  }

  // 状態判定
  let status: 'ok' | 'warning' | 'critical' = 'ok'
  if (analysis.totalSize > SIZE_LIMITS.critical) {
    status = 'critical'
  } else if (analysis.totalSize > SIZE_LIMITS.warning) {
    status = 'warning'
  }
  analysis.status = status

  // コンソール出力（色付き）
  const statusEmoji = {
    ok: '✅',
    warning: '⚠️',
    critical: '🚨'
  }

  console.log(`\n🍪 ${label} ${statusEmoji[status]}`)
  console.log('═'.repeat(60))
  
  // サイズバー表示
  const percentage = Math.min((analysis.totalSize / SIZE_LIMITS.critical) * 100, 100)
  const barLength = 40
  const filledLength = Math.floor((percentage / 100) * barLength)
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
  
  console.log(`Size: ${analysis.totalSize} bytes (${(analysis.totalSize / 1024).toFixed(2)} KB)`)
  console.log(`[${bar}] ${percentage.toFixed(0)}%`)
  console.log(`Cookies: ${analysis.cookieCount}`)
  
  // カテゴリ別サマリー
  if (analysis.details.length > 0) {
    const authCookies = analysis.details.filter(d => d.category === 'auth')
    const otherCookies = analysis.details.filter(d => d.category === 'other')
    const authSize = authCookies.reduce((sum, c) => sum + c.size, 0)
    const otherSize = otherCookies.reduce((sum, c) => sum + c.size, 0)
    
    console.log('\n📊 Breakdown:')
    console.log(`  🔐 Auth cookies: ${authCookies.length} (${(authSize / 1024).toFixed(1)} KB)`)
    console.log(`  📦 Other cookies: ${otherCookies.length} (${(otherSize / 1024).toFixed(1)} KB)`)
  }

  // 大きなCookieトップ5
  if (analysis.details.length > 0) {
    console.log('\n🏆 Top 5 largest cookies:')
    analysis.details
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .forEach((detail, i) => {
        const marker = detail.hasBase64 ? '🖼️' : 
                      detail.category === 'auth' ? '🔐' : '📦'
        const sizeKB = (detail.size / 1024).toFixed(1)
        console.log(`  ${i + 1}. ${marker} ${detail.name}: ${detail.size}B (${sizeKB}KB)`)
      })
  }

  // 警告表示
  if (analysis.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    analysis.warnings.forEach(warning => console.log(`  ${warning}`))
  }

  // 推奨アクション
  if (status === 'critical') {
    console.log('\n🚨 CRITICAL: Immediate action required!')
    console.log('  - Run: npm run migrate:images')
    console.log('  - Or visit: /cookie-error')
  } else if (status === 'warning') {
    console.log('\n⚠️  WARNING: Cookie size approaching limit')
    console.log('  - Consider clearing old sessions')
    console.log('  - Check for Base64 images in profile')
  }

  console.log('═'.repeat(60))

  return analysis
}

/**
 * ブラウザ環境でのCookieサイズチェック
 */
export function checkBrowserCookieSize(): CookieAnalysis {
  if (typeof window === 'undefined') {
    throw new Error('checkBrowserCookieSize can only be used in browser environment')
  }
  
  return dumpCookieSize(document.cookie, 'Browser Cookie Check')
}

/**
 * Cookie削減の推奨事項を取得
 */
export function getCookieRecommendations(analysis: CookieAnalysis): string[] {
  const recommendations: string[] = []
  
  if (analysis.status === 'critical') {
    recommendations.push('🚨 緊急: Cookieサイズが4KBを超えています。即座に対処が必要です。')
  }
  
  const base64Cookies = analysis.details.filter(d => d.hasBase64)
  if (base64Cookies.length > 0) {
    recommendations.push(
      `🖼️ Base64画像を含むCookieが${base64Cookies.length}個見つかりました。` +
      'Supabase Storageへの移行を推奨します。'
    )
  }
  
  const largeCookies = analysis.details.filter(d => d.size > 1024)
  if (largeCookies.length > 0) {
    recommendations.push(
      `📦 1KB以上の大きなCookieが${largeCookies.length}個あります。` +
      '不要なデータの削除を検討してください。'
    )
  }
  
  if (analysis.cookieCount > 20) {
    recommendations.push(
      `🔢 Cookieの数が多すぎます（${analysis.cookieCount}個）。` +
      '古いセッションのクリアを推奨します。'
    )
  }
  
  return recommendations
}