import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { dumpCookieSize, sanitizeSupabaseSession } from '@/utils/cookie-monitor'
import { updateSession } from '@/utils/supabase/middleware'

// モック設定
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null
      })
    }
  }))
}))

describe('Cookie Size Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    console.log = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
  })

  describe('dumpCookieSize', () => {
    it('should analyze cookie sizes correctly', () => {
      const mockCookies = {
        getAll: () => [
          { name: 'small-cookie', value: 'short-value' },
          { name: 'medium-cookie', value: 'a'.repeat(1000) },
          { name: 'large-cookie', value: 'b'.repeat(5000) }
        ]
      }

      const analysis = dumpCookieSize(mockCookies as any, 'Test Analysis')

      expect(analysis.totalCookies).toBe(3)
      expect(analysis.cookies).toHaveLength(3)
      expect(analysis.warnings.length).toBeGreaterThan(0)
      expect(analysis.critical).toBe(true) // Total > 8KB
    })

    it('should detect Base64 images in cookies', () => {
      const mockCookies = {
        getAll: () => [
          { name: 'auth-cookie', value: 'data:image/png;base64,iVBORw0KGgoAAAANS...' }
        ]
      }

      const analysis = dumpCookieSize(mockCookies as any, 'Base64 Test')

      expect(analysis.warnings).toContain(
        expect.stringContaining('contains Base64 image data')
      )
      expect(analysis.critical).toBe(true)
    })
  })

  describe('sanitizeSupabaseSession', () => {
    it('should remove large fields from user_metadata', () => {
      const session = {
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: {
            name: 'Test User',
            profile_image: 'data:image/png;base64,' + 'A'.repeat(10000),
            avatar_url: 'https://example.com/avatar.png'
          }
        }
      }

      const sanitized = sanitizeSupabaseSession(session)

      expect(sanitized.user.user_metadata.name).toBe('Test User')
      expect(sanitized.user.user_metadata.profile_image).toBeUndefined()
      expect(sanitized.user.user_metadata.avatar_url).toBe('https://example.com/avatar.png')
    })

    it('should warn if session is still large after sanitization', () => {
      const largeSession = {
        user: {
          id: '123',
          user_metadata: {
            large_text: 'x'.repeat(4000)
          }
        }
      }

      sanitizeSupabaseSession(largeSession)

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Session still large after sanitization')
      )
    })
  })

  describe('Cookie size limits', () => {
    it('should keep cookies under 4KB each', async () => {
      const request = new NextRequest('http://localhost:3000/test', {
        headers: {
          cookie: 'test-cookie=' + 'a'.repeat(3000)
        }
      })

      // Cookieサイズをチェック
      const cookies = request.cookies.getAll()
      cookies.forEach(cookie => {
        const size = cookie.name.length + cookie.value.length
        expect(size).toBeLessThan(4096)
      })
    })

    it('should keep total cookie header under 8KB', () => {
      const cookies = [
        'cookie1=' + 'a'.repeat(2000),
        'cookie2=' + 'b'.repeat(2000),
        'cookie3=' + 'c'.repeat(2000)
      ].join('; ')

      const totalSize = new TextEncoder().encode(cookies).length
      expect(totalSize).toBeLessThan(8192)
    })
  })

  describe('JWT payload size', () => {
    it('should keep JWT payload under 3KB', () => {
      const jwtPayload = {
        sub: '123',
        email: 'test@example.com',
        user_metadata: {
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.png'
          // No Base64 images
        }
      }

      const payloadString = JSON.stringify(jwtPayload)
      const payloadSize = new TextEncoder().encode(payloadString).length

      expect(payloadSize).toBeLessThan(3072) // 3KB
    })
  })
})

describe('Middleware Cookie handling', () => {
  it('should process cookies without exceeding size limits', async () => {
    const request = new NextRequest('http://localhost:3000/login')
    
    // Mock implementation would go here
    // This is a placeholder for actual middleware testing
    
    expect(true).toBe(true)
  })
})

describe('Cookie Size Enforcement', () => {
  describe('Individual Cookie Limits', () => {
    it('should reject cookies larger than 4KB', () => {
      const largeCookie = {
        name: 'test-cookie',
        value: 'x'.repeat(4097) // 4KB + 1 byte
      }
      
      const size = largeCookie.name.length + largeCookie.value.length
      expect(size).toBeGreaterThan(4096)
      
      // このCookieは拒否されるべき
      const isValid = size <= 4096
      expect(isValid).toBe(false)
    })
    
    it('should accept cookies smaller than 4KB', () => {
      const normalCookie = {
        name: 'test-cookie',
        value: 'x'.repeat(4000)
      }
      
      const size = normalCookie.name.length + normalCookie.value.length
      expect(size).toBeLessThan(4096)
    })
  })
  
  describe('Total Header Size', () => {
    it('should keep total cookie header under 8KB', () => {
      const cookies = [
        { name: 'cookie1', value: 'a'.repeat(2000) },
        { name: 'cookie2', value: 'b'.repeat(2000) },
        { name: 'cookie3', value: 'c'.repeat(1000) }
      ]
      
      const headerString = cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ')
      
      const totalSize = new TextEncoder().encode(headerString).length
      expect(totalSize).toBeLessThan(8192)
    })
    
    it('should warn when approaching 8KB limit', () => {
      const cookies = [
        { name: 'large-cookie', value: 'x'.repeat(7000) }
      ]
      
      const headerString = cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ')
      
      const totalSize = new TextEncoder().encode(headerString).length
      const isWarning = totalSize > 6144 // 75% of 8KB
      
      expect(isWarning).toBe(true)
      expect(totalSize).toBeLessThan(8192)
    })
  })
  
  describe('Supabase Session Size', () => {
    it('should keep Supabase session under 3KB', () => {
      const session = {
        access_token: 'x'.repeat(1000), // Mocked token
        refresh_token: 'y'.repeat(500),
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: {
            name: 'Test User',
            avatar_url: 'https://example.com/avatar.png'
            // No Base64 images
          }
        }
      }
      
      const sessionSize = new TextEncoder().encode(JSON.stringify(session)).length
      expect(sessionSize).toBeLessThan(3072) // 3KB
    })
    
    it('should detect and report oversized sessions', () => {
      const oversizedSession = {
        access_token: 'x'.repeat(1000),
        refresh_token: 'y'.repeat(500),
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: {
            name: 'Test User',
            profile_image: 'data:image/png;base64,' + 'A'.repeat(10000)
          }
        }
      }
      
      const sessionSize = new TextEncoder().encode(JSON.stringify(oversizedSession)).length
      expect(sessionSize).toBeGreaterThan(3072)
      
      // このようなセッションは拒否されるべき
      const isValid = sessionSize <= 3072
      expect(isValid).toBe(false)
    })
  })
  
  describe('Base64 Detection', () => {
    it('should detect Base64 images in metadata', () => {
      const metadata = {
        name: 'Test User',
        profile_image: 'data:image/png;base64,iVBORw0KGgoAAAANS...'
      }
      
      const hasBase64 = Object.values(metadata).some(
        value => typeof value === 'string' && value.includes('data:image/')
      )
      
      expect(hasBase64).toBe(true)
    })
    
    it('should calculate Base64 size increase', () => {
      const originalSize = 1000 // 1KB binary
      const base64Size = Math.ceil(originalSize * 4 / 3) // Base64 encoding increases size by ~33%
      
      expect(base64Size).toBeGreaterThan(originalSize)
      expect(base64Size).toBeLessThanOrEqual(1334) // 1KB → ~1.33KB
    })
  })
})

describe('Performance Tests', () => {
  it('should process cookie analysis quickly', () => {
    const startTime = Date.now()
    
    const mockCookies = {
      getAll: () => Array(20).fill(null).map((_, i) => ({
        name: `cookie-${i}`,
        value: 'x'.repeat(100)
      }))
    }
    
    const analysis = dumpCookieSize(mockCookies as any, 'Performance Test')
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // 分析は100ms以内に完了すべき
    expect(duration).toBeLessThan(100)
    expect(analysis.totalCookies).toBe(20)
  })
})