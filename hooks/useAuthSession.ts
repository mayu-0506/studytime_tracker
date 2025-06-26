import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface AuthSession {
  user: User | null
  session: Session | null
  loading: boolean
  error: Error | null
}

/**
 * Supabase認証セッションの軽量化フック
 * 大きなメタデータを自動的に削除
 */
export function useAuthSession() {
  const [authState, setAuthState] = useState<AuthSession>({
    user: null,
    session: null,
    loading: true,
    error: null
  })
  
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // セッションを取得して軽量化
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (session && mounted) {
          // セッションサイズをチェック
          const sessionSize = JSON.stringify(session).length
          console.log(`Session size: ${sessionSize} bytes (${(sessionSize / 1024).toFixed(2)} KB)`)
          
          // 大きなメタデータを検出して削除
          const cleanedSession = sanitizeSession(session)
          
          setAuthState({
            user: cleanedSession.user,
            session: cleanedSession,
            loading: false,
            error: null
          })
        } else {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            error: null
          })
        }
      } catch (error) {
        console.error('Session error:', error)
        setAuthState({
          user: null,
          session: null,
          loading: false,
          error: error as Error
        })
      }
    }

    getSession()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        
        if (session && mounted) {
          const cleanedSession = sanitizeSession(session)
          setAuthState({
            user: cleanedSession.user,
            session: cleanedSession,
            loading: false,
            error: null
          })
        } else {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            error: null
          })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return authState
}

/**
 * セッションから大きなデータを削除
 */
function sanitizeSession(session: Session): Session {
  const cloned = JSON.parse(JSON.stringify(session))
  
  if (cloned.user?.user_metadata) {
    const metadata = cloned.user.user_metadata
    const metadataSize = JSON.stringify(metadata).length
    
    console.log(`User metadata size: ${metadataSize} bytes`)
    
    // 大きなフィールドを削除
    Object.keys(metadata).forEach(key => {
      const value = metadata[key]
      
      // Base64画像を削除
      if (typeof value === 'string' && value.includes('data:image/')) {
        console.warn(`🗑️ Removing Base64 image from metadata.${key}`)
        delete metadata[key]
      }
      
      // 1KB以上の文字列を削除
      if (typeof value === 'string' && value.length > 1024) {
        console.warn(`🗑️ Removing large field metadata.${key} (${value.length} bytes)`)
        delete metadata[key]
      }
    })
    
    // サニタイズ後のサイズ
    const newSize = JSON.stringify(metadata).length
    if (metadataSize !== newSize) {
      console.log(`✅ Metadata reduced from ${metadataSize} to ${newSize} bytes`)
    }
  }
  
  return cloned
}

/**
 * ユーザーメタデータを安全に更新
 */
export async function updateUserMetadata(
  supabase: ReturnType<typeof createClient>,
  updates: Record<string, any>
) {
  // 大きなデータをフィルタリング
  const safeUpdates: Record<string, any> = {}
  
  Object.entries(updates).forEach(([key, value]) => {
    // Base64画像は保存しない
    if (typeof value === 'string' && value.includes('data:image/')) {
      console.error(`❌ Blocked Base64 image in ${key}`)
      return
    }
    
    // 大きな文字列は切り詰める
    if (typeof value === 'string' && value.length > 500) {
      console.warn(`⚠️ Truncating large field ${key} from ${value.length} to 500 chars`)
      safeUpdates[key] = value.substring(0, 500) + '...'
    } else {
      safeUpdates[key] = value
    }
  })
  
  // 更新実行
  const { data, error } = await supabase.auth.updateUser({
    data: safeUpdates
  })
  
  if (error) {
    console.error('Update metadata error:', error)
    throw error
  }
  
  return data
}