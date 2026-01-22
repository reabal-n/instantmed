/**
 * CSRF Protection Module Tests
 * 
 * Tests for CSRF token generation, validation, and middleware.
 * Covers: token generation, timing-safe comparison, expiry, middleware wrapper.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { NextResponse } from "next/server"

// Mock next/headers cookies
const mockCookieStore = new Map<string, string>()

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: (name: string) => {
      const value = mockCookieStore.get(name)
      return value ? { value } : undefined
    },
    set: (name: string, value: string, _options?: unknown) => {
      mockCookieStore.set(name, value)
    },
    delete: (name: string) => {
      mockCookieStore.delete(name)
    },
  })),
}))

describe("CSRF protection module", () => {
  beforeEach(() => {
    mockCookieStore.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  describe("generateCSRFToken", () => {
    it("generates a hex token", async () => {
      const { generateCSRFToken } = await import("../security/csrf")
      
      const token = await generateCSRFToken()
      
      expect(token).toMatch(/^[a-f0-9]{64}$/) // 32 bytes = 64 hex chars
    })

    it("stores token in cookie", async () => {
      const { generateCSRFToken } = await import("../security/csrf")
      
      await generateCSRFToken()
      
      const cookieValue = mockCookieStore.get("csrf_token")
      expect(cookieValue).toBeDefined()
      
      const parsed = JSON.parse(cookieValue!)
      expect(parsed.value).toBeDefined()
      expect(parsed.expiresAt).toBeDefined()
    })

    it("sets expiry time 1 hour in future", async () => {
      const { generateCSRFToken } = await import("../security/csrf")
      const now = Date.now()
      vi.setSystemTime(now)
      
      await generateCSRFToken()
      
      const cookieValue = mockCookieStore.get("csrf_token")
      const parsed = JSON.parse(cookieValue!)
      
      expect(parsed.expiresAt).toBe(now + 60 * 60 * 1000)
    })

    it("generates unique tokens each time", async () => {
      const { generateCSRFToken } = await import("../security/csrf")
      
      const token1 = await generateCSRFToken()
      mockCookieStore.clear()
      const token2 = await generateCSRFToken()
      
      expect(token1).not.toBe(token2)
    })
  })

  describe("validateCSRFToken", () => {
    it("returns true for valid token", async () => {
      const { generateCSRFToken, validateCSRFToken } = await import("../security/csrf")
      
      const token = await generateCSRFToken()
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-csrf-token": token },
      })
      
      const isValid = await validateCSRFToken(request)
      
      expect(isValid).toBe(true)
    })

    it("returns false when header token is missing", async () => {
      const { generateCSRFToken, validateCSRFToken } = await import("../security/csrf")
      
      await generateCSRFToken()
      const request = new Request("http://localhost/api/test", {
        method: "POST",
      })
      
      const isValid = await validateCSRFToken(request)
      
      expect(isValid).toBe(false)
    })

    it("returns false when cookie token is missing", async () => {
      const { validateCSRFToken } = await import("../security/csrf")
      
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-csrf-token": "some-token" },
      })
      
      const isValid = await validateCSRFToken(request)
      
      expect(isValid).toBe(false)
    })

    it("returns false when tokens do not match", async () => {
      const { generateCSRFToken, validateCSRFToken } = await import("../security/csrf")
      
      await generateCSRFToken()
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-csrf-token": "wrong-token-value-that-is-64-chars-long-aaaaaaaaaaaaaaaaaaaaaa" },
      })
      
      const isValid = await validateCSRFToken(request)
      
      expect(isValid).toBe(false)
    })

    it("returns false when token is expired", async () => {
      const { generateCSRFToken, validateCSRFToken } = await import("../security/csrf")
      
      const token = await generateCSRFToken()
      
      // Advance time past expiry
      vi.advanceTimersByTime(60 * 60 * 1000 + 1)
      
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-csrf-token": token },
      })
      
      const isValid = await validateCSRFToken(request)
      
      expect(isValid).toBe(false)
    })

    it("returns false on malformed cookie JSON", async () => {
      const { validateCSRFToken } = await import("../security/csrf")
      
      mockCookieStore.set("csrf_token", "not-valid-json")
      
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-csrf-token": "some-token" },
      })
      
      const isValid = await validateCSRFToken(request)
      
      expect(isValid).toBe(false)
    })
  })

  describe("withCSRFProtection middleware", () => {
    it("allows GET requests without CSRF token", async () => {
      const { withCSRFProtection } = await import("../security/csrf")
      
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const protectedHandler = withCSRFProtection(handler)
      
      const request = new Request("http://localhost/api/test", {
        method: "GET",
      })
      
      const response = await protectedHandler(request)
      
      expect(handler).toHaveBeenCalledWith(request)
      expect(response.status).toBe(200)
    })

    it("blocks POST requests without valid CSRF token", async () => {
      const { withCSRFProtection } = await import("../security/csrf")
      
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const protectedHandler = withCSRFProtection(handler)
      
      const request = new Request("http://localhost/api/test", {
        method: "POST",
      })
      
      const response = await protectedHandler(request)
      
      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
      
      const body = await response.json()
      expect(body.error).toContain("CSRF")
    })

    it("allows POST requests with valid CSRF token", async () => {
      const { withCSRFProtection, generateCSRFToken } = await import("../security/csrf")
      
      const token = await generateCSRFToken()
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const protectedHandler = withCSRFProtection(handler)
      
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-csrf-token": token },
      })
      
      const response = await protectedHandler(request)
      
      expect(handler).toHaveBeenCalledWith(request)
      expect(response.status).toBe(200)
    })

    it("blocks PUT requests without valid CSRF token", async () => {
      const { withCSRFProtection } = await import("../security/csrf")
      
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const protectedHandler = withCSRFProtection(handler)
      
      const request = new Request("http://localhost/api/test", {
        method: "PUT",
      })
      
      const response = await protectedHandler(request)
      
      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })

    it("blocks DELETE requests without valid CSRF token", async () => {
      const { withCSRFProtection } = await import("../security/csrf")
      
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const protectedHandler = withCSRFProtection(handler)
      
      const request = new Request("http://localhost/api/test", {
        method: "DELETE",
      })
      
      const response = await protectedHandler(request)
      
      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })

    it("blocks PATCH requests without valid CSRF token", async () => {
      const { withCSRFProtection } = await import("../security/csrf")
      
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const protectedHandler = withCSRFProtection(handler)
      
      const request = new Request("http://localhost/api/test", {
        method: "PATCH",
      })
      
      const response = await protectedHandler(request)
      
      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })
  })

  describe("requireValidCsrf", () => {
    it("returns null for valid token", async () => {
      const { generateCSRFToken, requireValidCsrf } = await import("../security/csrf")
      
      const token = await generateCSRFToken()
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-csrf-token": token },
      })
      
      const result = await requireValidCsrf(request)
      
      expect(result).toBeNull()
    })

    it("returns 403 response for invalid token", async () => {
      const { requireValidCsrf } = await import("../security/csrf")
      
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-csrf-token": "invalid" },
      })
      
      const result = await requireValidCsrf(request)
      
      expect(result).not.toBeNull()
      expect(result?.status).toBe(403)
    })
  })

  describe("getCSRFTokenForClient", () => {
    it("returns a token for client use", async () => {
      const { getCSRFTokenForClient } = await import("../security/csrf")
      
      const token = await getCSRFTokenForClient()
      
      expect(token).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
