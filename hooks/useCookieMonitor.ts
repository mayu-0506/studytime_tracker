"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const COOKIE_SIZE_LIMIT = 4096 // 4KB
const CHECK_INTERVAL = 30000 // 30秒ごとにチェック

export function useCookieMonitor() {
  const router = useRouter()

  useEffect(() => {
    const checkCookieSize = async () => {
      const cookieSize = document.cookie.length
      
      if (cookieSize > COOKIE_SIZE_LIMIT) {
        console.warn(`⚠️ Cookie size exceeds limit: ${cookieSize} bytes`)
        
        // デバッグ情報を取得
        try {
          const response = await fetch('/api/debug-cookies')
          const data = await response.json()
          console.log('Cookie debug info:', data)
          
          if (data.status.critical) {
            toast.error('Cookieサイズが大きすぎます。自動的にクリーンアップします...')
            
            // 自動クリーンアップを試みる
            const clearResponse = await fetch('/api/clear-cookies', { 
              method: 'POST',
              credentials: 'include'
            })
            
            if (clearResponse.ok) {
              toast.success('Cookieをクリーンアップしました。ページをリロードします。')
              setTimeout(() => {
                router.refresh()
              }, 1000)
            }
          } else if (data.status.error) {
            toast('Cookieサイズが大きくなっています。', {
              icon: '⚠️',
              duration: 5000
            })
          }
        } catch (error) {
          console.error('Cookie monitoring error:', error)
        }
      }
    }

    // 初回チェック
    checkCookieSize()

    // 定期チェック
    const interval = setInterval(checkCookieSize, CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [router])
}

// Cookieサイズを手動でチェックする関数
export async function checkAndCleanCookies(): Promise<boolean> {
  try {
    const response = await fetch('/api/debug-cookies')
    const data = await response.json()
    
    if (data.status.error || data.status.critical) {
      const clearResponse = await fetch('/api/clear-cookies', { 
        method: 'POST',
        credentials: 'include'
      })
      
      return clearResponse.ok
    }
    
    return true
  } catch (error) {
    console.error('Cookie check failed:', error)
    return false
  }
}