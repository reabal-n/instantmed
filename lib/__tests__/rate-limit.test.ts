import { describe, it, expect } from "vitest"
import { getClientIdentifier, rateLimitConfigs } from "@/lib/rate-limit/redis"

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

    it("should have limiter as null when Redis is not configured", () => {
      // In test environment, Redis is not configured
      for (const [, config] of Object.entries(rateLimitConfigs)) {
        expect(config.limiter).toBeNull()
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
})
