import { afterEach, describe, expect, it, vi } from "vitest"

import { getClientIdentifier, rateLimitConfigs } from "@/lib/rate-limit/redis"

const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("rate-limit/redis", () => {
  describe("rateLimitConfigs", () => {
    it("should define all expected tiers", () => {
      expect(rateLimitConfigs).toHaveProperty("standard")
      expect(rateLimitConfigs).toHaveProperty("auth")
      expect(rateLimitConfigs).toHaveProperty("sensitive")
      expect(rateLimitConfigs).toHaveProperty("upload")
      expect(rateLimitConfigs).toHaveProperty("webhook")
    })

    it("should have a label for each tier", () => {
      for (const [key, config] of Object.entries(rateLimitConfigs)) {
        expect(config.label).toBe(key)
      }
    })

    it("marks abuse-sensitive buckets as fail-closed", () => {
      expect(rateLimitConfigs.auth.failureMode).toBe("closed")
      expect(rateLimitConfigs.sensitive.failureMode).toBe("closed")
      expect(rateLimitConfigs.addressSearch.failureMode).toBe("closed")
      expect(rateLimitConfigs.upload.failureMode).toBe("closed")
      expect(rateLimitConfigs.ai.failureMode).toBe("closed")

      expect(rateLimitConfigs.standard.failureMode).toBe("open")
      expect(rateLimitConfigs.webhook.failureMode).toBe("open")
      expect(rateLimitConfigs.webhookAuth.failureMode).toBe("open")
      expect(rateLimitConfigs.admin.failureMode).toBe("open")
    })

    it("should have consistent limiter state based on Redis config", () => {
      // When Redis is not configured (CI), limiter is null.
      // When Redis IS configured (.env.local), limiter is a Ratelimit instance.
      for (const [, config] of Object.entries(rateLimitConfigs)) {
        if (hasRedis) {
          expect(config.limiter).not.toBeNull()
        } else {
          expect(config.limiter).toBeNull()
        }
      }
    })
  })

  describe("getClientIdentifier", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const req = new Request("https://example.com", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      })
      expect(getClientIdentifier(req)).toBe("1.2.3.4")
    })

    it("should fall back to x-real-ip", () => {
      const req = new Request("https://example.com", {
        headers: { "x-real-ip": "10.0.0.1" },
      })
      expect(getClientIdentifier(req)).toBe("10.0.0.1")
    })

    it("should return 'unknown' when no IP headers", () => {
      const req = new Request("https://example.com")
      expect(getClientIdentifier(req)).toBe("unknown")
    })

    it("should trim whitespace from forwarded-for", () => {
      const req = new Request("https://example.com", {
        headers: { "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" },
      })
      expect(getClientIdentifier(req)).toBe("1.2.3.4")
    })
  })

  describe("applyRateLimit failure policy", () => {
    it("blocks critical production buckets when Redis is not configured", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")
      vi.resetModules()

      const { applyRateLimit } = await import("@/lib/rate-limit/redis")
      const response = await applyRateLimit(new Request("https://example.com/api/profile/ensure"), "sensitive")

      expect(response).toBeInstanceOf(Response)
      expect(response?.status).toBe(503)
      await expect(response?.json()).resolves.toMatchObject({
        error: "Rate limit protection unavailable",
      })
    })

    it("keeps non-critical production buckets fail-open when Redis is not configured", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")
      vi.resetModules()

      const { applyRateLimit } = await import("@/lib/rate-limit/redis")

      await expect(
        applyRateLimit(new Request("https://example.com/api/health"), "standard"),
      ).resolves.toBeNull()
    })

    it("blocks critical production buckets when Redis throws", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.resetModules()

      const { applyRateLimit, rateLimitConfigs } = await import("@/lib/rate-limit/redis")
      Object.assign(rateLimitConfigs.sensitive, {
        limiter: {
          limit: vi.fn().mockRejectedValue(new Error("redis down")),
        },
      })

      const response = await applyRateLimit(new Request("https://example.com/api/profile/ensure"), "sensitive")

      expect(response).toBeInstanceOf(Response)
      expect(response?.status).toBe(503)
      await expect(response?.json()).resolves.toMatchObject({
        error: "Rate limit protection unavailable",
      })
    })
  })
})
