import { beforeEach,describe, expect, it, vi } from "vitest"

import { signUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/crypto/unsubscribe-token"

describe("unsubscribe-token", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", "test-secret-key-for-hmac-signing")
  })

  describe("signUnsubscribeToken", () => {
    it("should return a base64url-encoded string", () => {
      const token = signUnsubscribeToken("profile-123")
      expect(token).toBeTruthy()
      // base64url should not contain +, /, =
      expect(token).not.toMatch(/[+/=]/)
    })

    it("should produce different tokens for different profile IDs", () => {
      const t1 = signUnsubscribeToken("profile-1")
      const t2 = signUnsubscribeToken("profile-2")
      expect(t1).not.toBe(t2)
    })
  })

  describe("verifyUnsubscribeToken", () => {
    it("should verify a valid token and return profileId", () => {
      const token = signUnsubscribeToken("profile-abc")
      const result = verifyUnsubscribeToken(token)
      expect(result).not.toBeNull()
      expect(result?.profileId).toBe("profile-abc")
    })

    it("should reject a tampered token", () => {
      const token = signUnsubscribeToken("profile-abc")
      // Tamper with the token by changing a character
      const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")
      expect(verifyUnsubscribeToken(tampered)).toBeNull()
    })

    it("should reject an empty string", () => {
      expect(verifyUnsubscribeToken("")).toBeNull()
    })

    it("should reject garbage input", () => {
      expect(verifyUnsubscribeToken("not-a-valid-token")).toBeNull()
    })

    it("should reject expired tokens (>90 days)", () => {
      // TTL is 90 days (Spam Act 30-day minimum + functional headroom so an
      // email opened on day 31 still has a working List-Unsubscribe link).
      const realNow = Date.now
      const ninetyOneDaysAgo = realNow() - 91 * 24 * 60 * 60 * 1000
      vi.spyOn(Date, "now").mockReturnValue(ninetyOneDaysAgo)
      const token = signUnsubscribeToken("profile-old")
      vi.spyOn(Date, "now").mockReturnValue(realNow())
      expect(verifyUnsubscribeToken(token)).toBeNull()
    })

    it("should accept tokens within the 90-day window (incl. past the 30-day legal minimum)", () => {
      const realNow = Date.now
      const fortyDaysAgo = realNow() - 40 * 24 * 60 * 60 * 1000
      vi.spyOn(Date, "now").mockReturnValue(fortyDaysAgo)
      const token = signUnsubscribeToken("profile-recent")
      vi.spyOn(Date, "now").mockReturnValue(realNow())
      expect(verifyUnsubscribeToken(token)).not.toBeNull()
    })
  })
})
