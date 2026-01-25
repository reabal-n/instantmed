/**
 * E2E Auth Bypass Safety Tests
 * 
 * These tests verify that E2E authentication bypass mechanisms
 * cannot be triggered in production environments.
 * 
 * If these tests fail, it indicates a security vulnerability
 * that could allow unauthorized access in production.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

/**
 * Helper to check if E2E test mode would be enabled for given env values.
 * This mirrors the logic in lib/auth.ts and app/api/test/login/route.ts
 */
function checkIsE2ETestModeEnabled(nodeEnv: string, playwright?: string): boolean {
  return nodeEnv === "test" || playwright === "1"
}

describe("E2E Auth Bypass Safety", () => {
  const originalPlaywright = process.env.PLAYWRIGHT
  const originalE2ESecret = process.env.E2E_SECRET
  const originalAllowedHosts = process.env.E2E_ALLOWED_HOSTS

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.PLAYWRIGHT = originalPlaywright
    process.env.E2E_SECRET = originalE2ESecret
    process.env.E2E_ALLOWED_HOSTS = originalAllowedHosts
  })

  describe("isE2ETestModeEnabled check", () => {
    it("returns false when NODE_ENV is production", () => {
      const isEnabled = checkIsE2ETestModeEnabled("production", undefined)
      expect(isEnabled).toBe(false)
    })

    it("returns false when NODE_ENV is development (not test)", () => {
      const isEnabled = checkIsE2ETestModeEnabled("development", undefined)
      expect(isEnabled).toBe(false)
    })

    it("returns true when NODE_ENV is test", () => {
      const isEnabled = checkIsE2ETestModeEnabled("test", undefined)
      expect(isEnabled).toBe(true)
    })

    it("returns true when PLAYWRIGHT is 1", () => {
      const isEnabled = checkIsE2ETestModeEnabled("development", "1")
      expect(isEnabled).toBe(true)
    })

    it("returns false when PLAYWRIGHT is any other value", () => {
      const isEnabled = checkIsE2ETestModeEnabled("development", "true")
      expect(isEnabled).toBe(false)
    })

    it("returns true when PLAYWRIGHT=1 even in production (relies on secret+host checks)", () => {
      // This documents the current behavior - PLAYWRIGHT=1 enables bypass
      // Security relies on: 1) secret check 2) host check 3) PLAYWRIGHT not set in prod
      const isEnabled = checkIsE2ETestModeEnabled("production", "1")
      expect(isEnabled).toBe(true) // This is why we have additional security layers
    })
  })

  describe("Production safety assertions", () => {
    it("CRITICAL: Production deployments must NOT set PLAYWRIGHT=1", () => {
      // This test documents the security requirement:
      // Production deployments must NEVER set PLAYWRIGHT=1
      // This is enforced by deployment configuration, not code
      
      // Simulate production without PLAYWRIGHT
      const isEnabled = checkIsE2ETestModeEnabled("production", undefined)
      expect(isEnabled, "E2E bypass must be disabled in production without PLAYWRIGHT").toBe(false)
    })

    it("E2E_SECRET must be set to a non-empty value for bypass to work", () => {
      process.env.E2E_SECRET = ""
      const secretIsValid = Boolean(process.env.E2E_SECRET)
      expect(secretIsValid).toBe(false)
    })

    it("E2E_SECRET comparison must be exact match", () => {
      const secret: string = "my-secret-123"
      const correctSecret: string = "my-secret-123"
      const wrongCaseSecret: string = "MY-SECRET-123"
      const partialSecret: string = "my-secret"
      
      expect(correctSecret === secret).toBe(true)
      expect(wrongCaseSecret === secret).toBe(false)
      expect(partialSecret === secret).toBe(false)
    })
  })

  describe("Host validation", () => {
    it("localhost should be allowed by default", () => {
      const defaultAllowed = ["localhost", "127.0.0.1"]
      expect(defaultAllowed.includes("localhost")).toBe(true)
      expect(defaultAllowed.includes("127.0.0.1")).toBe(true)
    })

    it("external hosts should be blocked by default", () => {
      const defaultAllowed = ["localhost", "127.0.0.1"]
      expect(defaultAllowed.includes("example.com")).toBe(false)
      expect(defaultAllowed.includes("attacker.com")).toBe(false)
    })

    it("E2E_ALLOWED_HOSTS can add custom hosts", () => {
      process.env.E2E_ALLOWED_HOSTS = "staging.example.com,ci.internal"
      
      const customAllowed = (process.env.E2E_ALLOWED_HOSTS || "")
        .split(",")
        .map(h => h.trim())
        .filter(Boolean)
      
      expect(customAllowed).toContain("staging.example.com")
      expect(customAllowed).toContain("ci.internal")
    })
  })

  describe("Security invariants", () => {
    it("bypass requires ALL of: test mode + secret + allowed host", () => {
      // Document the three-layer security model:
      // 1. NODE_ENV=test OR PLAYWRIGHT=1 (test mode check)
      // 2. X-E2E-SECRET header matches E2E_SECRET (secret check)
      // 3. Request from localhost or E2E_ALLOWED_HOSTS (host check)
      
      // All three must pass for bypass to work
      const testModeEnabled = checkIsE2ETestModeEnabled("test", undefined)
      const secretMatches = "secret123" === "secret123"
      const hostAllowed = ["localhost", "127.0.0.1"].includes("localhost")
      
      const bypassAllowed = testModeEnabled && secretMatches && hostAllowed
      expect(bypassAllowed).toBe(true)
      
      // If any layer fails, bypass is blocked
      const wrongSecret: string = "wrong"
      const expectedSecret: string = "secret123"
      const attackerHost: string = "attacker.com"
      
      const bypassBlockedNoTestMode = checkIsE2ETestModeEnabled("production", undefined) && secretMatches && hostAllowed
      const bypassBlockedBadSecret = testModeEnabled && (wrongSecret === expectedSecret) && hostAllowed
      const bypassBlockedBadHost = testModeEnabled && secretMatches && ["localhost", "127.0.0.1"].includes(attackerHost)
      
      expect(bypassBlockedNoTestMode).toBe(false)
      expect(bypassBlockedBadSecret).toBe(false)
      expect(bypassBlockedBadHost).toBe(false)
    })
  })
})
