/**
 * E2E Auth Bypass Safety Tests
 * 
 * These tests verify that E2E authentication bypass mechanisms
 * cannot be triggered in production environments.
 * 
 * If these tests fail, it indicates a security vulnerability
 * that could allow unauthorized access in production.
 */

import { afterEach, describe, expect, it, vi } from "vitest"

import { verifyE2ESecret } from "@/lib/dev-only-route-auth"
import { canAccessDevOnlyRoute, isAllowedDevOnlyRequest, isE2ETestModeEnabled } from "@/lib/dev-only-routes"

function requestFromHost(host: string): Request {
  return new Request(`https://${host}/api/test/login`, { headers: { host } })
}

describe("E2E Auth Bypass Safety", () => {
  const originalPlaywright = process.env.PLAYWRIGHT
  const originalE2ESecret = process.env.E2E_SECRET
  const originalAllowedHosts = process.env.E2E_ALLOWED_HOSTS

  afterEach(() => {
    vi.unstubAllEnvs()
    process.env.PLAYWRIGHT = originalPlaywright
    process.env.E2E_SECRET = originalE2ESecret
    process.env.E2E_ALLOWED_HOSTS = originalAllowedHosts
  })

  describe("isE2ETestModeEnabled check", () => {
    it.each(["production", "preview"])(
      "fails closed in Vercel %s even when PLAYWRIGHT=1",
      (vercelEnv) => {
        vi.stubEnv("NODE_ENV", "production")
        vi.stubEnv("VERCEL_ENV", vercelEnv)
        vi.stubEnv("PLAYWRIGHT", "1")

        expect(isE2ETestModeEnabled()).toBe(false)
        expect(canAccessDevOnlyRoute()).toBe(false)
      },
    )

    it("returns false when NODE_ENV is production", () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("PLAYWRIGHT", "")

      expect(isE2ETestModeEnabled()).toBe(false)
    })

    it("returns false when NODE_ENV is development (not test)", () => {
      vi.stubEnv("NODE_ENV", "development")
      vi.stubEnv("PLAYWRIGHT", "")

      expect(isE2ETestModeEnabled()).toBe(false)
    })

    it("returns true when NODE_ENV is test", () => {
      vi.stubEnv("NODE_ENV", "test")
      vi.stubEnv("VERCEL_ENV", "development")
      vi.stubEnv("PLAYWRIGHT", "")

      expect(isE2ETestModeEnabled()).toBe(true)
    })

    it("returns true when PLAYWRIGHT is 1", () => {
      vi.stubEnv("NODE_ENV", "development")
      vi.stubEnv("VERCEL_ENV", "development")
      vi.stubEnv("PLAYWRIGHT", "1")

      expect(isE2ETestModeEnabled()).toBe(true)
    })

    it("returns false when PLAYWRIGHT is any other value", () => {
      vi.stubEnv("NODE_ENV", "development")
      vi.stubEnv("PLAYWRIGHT", "true")

      expect(isE2ETestModeEnabled()).toBe(false)
    })
  })

  describe("E2E secret guard", () => {
    it("requires E2E_SECRET to be configured", () => {
      process.env.E2E_SECRET = ""

      const result = verifyE2ESecret(new Request("http://localhost/api/test/login"))

      expect(result).toEqual({ ok: false, error: "E2E_SECRET not configured", status: 500 })
    })

    it("rejects missing and incorrect secrets", () => {
      process.env.E2E_SECRET = "secret123"

      expect(verifyE2ESecret(new Request("http://localhost/api/test/login"))).toMatchObject({
        ok: false,
        status: 401,
      })
      expect(
        verifyE2ESecret(
          new Request("http://localhost/api/test/login", {
            headers: { "X-E2E-SECRET": "wrong" },
          }),
        ),
      ).toMatchObject({ ok: false, status: 401 })
    })

    it("accepts the exact configured secret", () => {
      process.env.E2E_SECRET = "secret123"

      const result = verifyE2ESecret(
        new Request("http://localhost/api/test/login", {
          headers: { "X-E2E-SECRET": "secret123" },
        }),
      )

      expect(result).toEqual({ ok: true })
    })
  })

  describe("Host validation", () => {
    it("localhost should be allowed by default", () => {
      vi.stubEnv("PLAYWRIGHT", "1")

      expect(isAllowedDevOnlyRequest(requestFromHost("localhost"))).toBe(true)
      expect(isAllowedDevOnlyRequest(requestFromHost("127.0.0.1"))).toBe(true)
    })

    it("external hosts should be blocked by default", () => {
      vi.stubEnv("PLAYWRIGHT", "1")

      expect(isAllowedDevOnlyRequest(requestFromHost("example.com"))).toBe(false)
      expect(isAllowedDevOnlyRequest(requestFromHost("attacker.com"))).toBe(false)
    })

    it("E2E_ALLOWED_HOSTS can add custom hosts", () => {
      vi.stubEnv("PLAYWRIGHT", "1")
      vi.stubEnv("E2E_ALLOWED_HOSTS", "staging.example.com,ci.internal")

      expect(isAllowedDevOnlyRequest(requestFromHost("staging.example.com"))).toBe(true)
      expect(isAllowedDevOnlyRequest(requestFromHost("ci.internal"))).toBe(true)
    })
  })
})
