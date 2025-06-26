import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { dumpCookieSize, sanitizeSupabaseSession } from "@/utils/cookie-monitor"

// Cookie軽量化の設定
const COOKIE_SIZE_LIMITS = {
  warning: 2048,    // 2KB: 警告
  error: 3072,      // 3KB: JWT警告
  critical: 4096    // 4KB: 強制削除
}

// 画像をSupabase Storageにアップロード（サーバーサイド）
async function uploadBase64ToStorage(
  base64: string, 
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string | null> {
  try {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    const match = base64.match(/^data:image\/(\w+);base64,/)
    const extension = match ? match[1] : 'png'
    const fileName = `${userId}_${Date.now()}.${extension}`
    
    // 直接APIを使用してアップロード
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/avatars/profile-images/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': `image/${extension}`,
          'Cache-Control': '3600'
        },
        body: buffer
      }
    )

    if (response.ok) {
      return `${supabaseUrl}/storage/v1/object/public/avatars/profile-images/${fileName}`
    }
    
    console.error('Storage upload failed:', await response.text())
    return null
  } catch (error) {
    console.error('Storage upload error:', error)
    return null
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // リクエスト時のCookieサイズをダンプ（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    dumpCookieSize(request.cookies, `Request to ${request.nextUrl.pathname}`)
  }

  // Cookie サイズ制限機能付きのSupabaseクライアント
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        async setAll(cookiesToSet) {
          // Cookieサイズチェックと軽量化
          const optimizedCookies = await Promise.all(cookiesToSet.map(async ({ name, value, options }) => {
            let optimizedValue = value
            
            // 大きなCookieを検出
            if (value.length > COOKIE_SIZE_LIMITS.warning) {
              console.warn(`⚠️ Large cookie detected: ${name} (${value.length} bytes)`)
              
              // Base64画像データの検出と変換
              if (value.includes('data:image/') || value.includes('base64')) {
                console.error(`🚨 Base64 image data in cookie ${name}, converting to Storage URL...`)
                
                try {
                  // JSONとして解析
                  const parsed = JSON.parse(value)
                  let hasBase64 = false
                  let userId = parsed.user?.id
                  
                  // ユーザーオブジェクト内のメタデータを処理
                  if (parsed.user && userId) {
                    if (parsed.user.user_metadata) {
                      // Base64画像をStorage URLに変換
                      const imageFields = ['profile_image', 'avatar_url', 'picture', 'photo', 'image']
                      for (const field of imageFields) {
                        const fieldValue = parsed.user.user_metadata[field]
                        if (fieldValue && fieldValue.startsWith('data:image/')) {
                          console.log(`🔄 Converting ${field} to Storage URL...`)
                          const storageUrl = await uploadBase64ToStorage(
                            fieldValue,
                            userId,
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                          )
                          
                          if (storageUrl) {
                            parsed.user.user_metadata.avatar_url = storageUrl
                            console.log(`✅ Converted to: ${storageUrl}`)
                          }
                          
                          // 元のBase64フィールドは削除
                          delete parsed.user.user_metadata[field]
                          hasBase64 = true
                        }
                      }
                    }
                    
                    // identitiesのメタデータも処理
                    if (parsed.user.identities && Array.isArray(parsed.user.identities)) {
                      parsed.user.identities.forEach((identity: any) => {
                        if (identity.identity_data) {
                          const dataFields = ['avatar_url', 'picture', 'profile_image']
                          dataFields.forEach(field => {
                            if (identity.identity_data[field] && 
                                identity.identity_data[field].includes('base64')) {
                              console.log(`🗑️ Removing ${field} from identity_data`)
                              delete identity.identity_data[field]
                              hasBase64 = true
                            }
                          })
                        }
                      })
                    }
                  }
                  
                  // トップレベルのuser_metadataも確認
                  if (parsed.user_metadata) {
                    const metadataFields = ['profile_image', 'avatar_url', 'picture', 'photo', 'image']
                    metadataFields.forEach(field => {
                      if (parsed.user_metadata[field] && parsed.user_metadata[field].includes('base64')) {
                        console.log(`🗑️ Removing ${field} from user_metadata`)
                        delete parsed.user_metadata[field]
                        hasBase64 = true
                      }
                    })
                  }
                  
                  if (hasBase64) {
                    optimizedValue = JSON.stringify(parsed)
                  }
                } catch (e) {
                  // JSONでない場合はBase64を直接削除
                  if (value.includes('data:image/')) {
                    console.warn('🗑️ Found base64 image in non-JSON cookie, removing')
                    const base64Pattern = /"data:image\/[^"]+"/g
                    optimizedValue = value.replace(base64Pattern, '""')
                  }
                }
              }
              
              // 3KB警告、4KB強制切り詰め
              if (optimizedValue.length > COOKIE_SIZE_LIMITS.error) {
                console.warn(`⚠️ Cookie ${name} exceeds 3KB (${optimizedValue.length} bytes)`)
                
                // セッション情報から不要なフィールドを削除
                try {
                  const parsed = JSON.parse(optimizedValue)
                  
                  // 削除する非必須フィールド
                  const removeFields = [
                    'user.identities',
                    'user.factors',
                    'user.user_metadata.full_name',
                    'user.user_metadata.name',
                    'user.app_metadata'
                  ]
                  
                  removeFields.forEach(path => {
                    const parts = path.split('.')
                    let obj = parsed
                    for (let i = 0; i < parts.length - 1; i++) {
                      obj = obj?.[parts[i]]
                    }
                    if (obj) {
                      delete obj[parts[parts.length - 1]]
                    }
                  })
                  
                  optimizedValue = JSON.stringify(parsed)
                }
                catch (e) {
                  // JSONパース失敗時は単純に切り詰め
                }
              }
              
              // 4KB超えは強制切り詰め
              if (optimizedValue.length > COOKIE_SIZE_LIMITS.critical) {
                console.error(`🚨 Cookie ${name} exceeds 4KB, truncating!`)
                optimizedValue = optimizedValue.substring(0, 3900) + '...'
              }
            }
            
            return { name, value: optimizedValue, options }
          }))

          // 総Cookie サイズをチェック
          const totalSize = optimizedCookies.reduce((sum, cookie) => 
            sum + cookie.name.length + cookie.value.length, 0)
          
          if (totalSize > 6144) { // 6KB警告
            console.warn(`⚠️ Total cookie size: ${totalSize} bytes. Consider further optimization.`)
          }

          // Cookieを設定
          optimizedCookies.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          
          supabaseResponse = NextResponse.next({
            request,
          })
          
          optimizedCookies.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 認証チェック（/loginページでは無限ループを避ける）
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith("/login") || 
                     pathname.startsWith("/signup") ||
                     pathname.startsWith("/auth/")

  if (!isAuthPage) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // プロテクトされたページへの未認証アクセス
      // (main)グループと設定ページを保護
      if (!user && (pathname.startsWith("/main") || pathname.startsWith("/setting"))) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        console.log(`Redirecting unauthenticated user from ${pathname} to /`)
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('Error checking user in middleware:', error)
      // エラー時は継続（認証エラーでアプリが止まるのを防ぐ）
    }
  }

  return supabaseResponse
}
