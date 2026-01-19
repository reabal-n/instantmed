import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const key = 'test-ip-1'
      
      // First request should be allowed
      const result1 = checkRateLimit(key, RATE_LIMITS.verification)
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(9) // 10 - 1
      
      // Second request should also be allowed
      const result2 = checkRateLimit(key, RATE_LIMITS.verification)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(8)
    })

    it('should block requests over limit', () => {
      const key = 'test-ip-2'
      
      // Use up all allowed requests
      for (let i = 0; i < 10; i++) {
        checkRateLimit(key, RATE_LIMITS.verification)
      }
      
      // Next request should be blocked
      const result = checkRateLimit(key, RATE_LIMITS.verification)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterMs).toBeDefined()
    })

    it('should reset after window expires', () => {
      const key = 'test-ip-3'
      
      // Use up all requests
      for (let i = 0; i < 10; i++) {
        checkRateLimit(key, RATE_LIMITS.verification)
      }
      
      // Should be blocked
      expect(checkRateLimit(key, RATE_LIMITS.verification).allowed).toBe(false)
      
      // Advance time past the window (60 seconds)
      vi.advanceTimersByTime(61000)
      
      // Should be allowed again
      const result = checkRateLimit(key, RATE_LIMITS.verification)
      expect(result.allowed).toBe(true)
    })

    it('should apply stricter limits for failed verification attempts', () => {
      const key = 'test-ip-4'
      
      // Strict limit is 3 requests per minute
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(key, RATE_LIMITS.verificationStrict)
        expect(result.allowed).toBe(true)
      }
      
      // 4th request should be blocked
      const blocked = checkRateLimit(key, RATE_LIMITS.verificationStrict)
      expect(blocked.allowed).toBe(false)
    })

    it('should track different keys independently', () => {
      const key1 = 'ip-192.168.1.1'
      const key2 = 'ip-192.168.1.2'
      
      // Use up key1's quota
      for (let i = 0; i < 10; i++) {
        checkRateLimit(key1, RATE_LIMITS.verification)
      }
      
      // key1 should be blocked
      expect(checkRateLimit(key1, RATE_LIMITS.verification).allowed).toBe(false)
      
      // key2 should still work
      expect(checkRateLimit(key2, RATE_LIMITS.verification).allowed).toBe(true)
    })
  })

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
      })
      
      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.195')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '203.0.113.195',
        },
      })
      
      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.195')
    })

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '10.0.0.1',
          'x-real-ip': '10.0.0.2',
        },
      })
      
      const ip = getClientIp(request)
      expect(ip).toBe('10.0.0.1')
    })

    it('should return fallback when no headers present', () => {
      const request = new Request('http://localhost')
      
      const ip = getClientIp(request)
      expect(ip).toBe('127.0.0.1')
    })
  })
})

describe('Rate Limit Configuration', () => {
  it('should have correct verification limits', () => {
    expect(RATE_LIMITS.verification.maxRequests).toBe(10)
    expect(RATE_LIMITS.verification.windowMs).toBe(60000) // 1 minute
  })

  it('should have correct strict verification limits', () => {
    expect(RATE_LIMITS.verificationStrict.maxRequests).toBe(3)
    expect(RATE_LIMITS.verificationStrict.windowMs).toBe(60000)
  })

  it('should have correct API limits', () => {
    expect(RATE_LIMITS.api.maxRequests).toBe(100)
    expect(RATE_LIMITS.api.windowMs).toBe(60000)
  })

  it('should have correct sensitive operation limits', () => {
    expect(RATE_LIMITS.sensitive.maxRequests).toBe(5)
    expect(RATE_LIMITS.sensitive.windowMs).toBe(60000)
  })
})
