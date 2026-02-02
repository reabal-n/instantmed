import { describe, it, expect, vi, beforeEach } from "vitest"
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

    it("should reject expired tokens (>30 days)", () => {
      // Mock Date.now to create an old token, then restore
      const realNow = Date.now
      const thirtyOneDaysAgo = realNow() - 31 * 24 * 60 * 60 * 1000
      vi.spyOn(Date, "now").mockReturnValue(thirtyOneDaysAgo)
      const token = signUnsubscribeToken("profile-old")
      vi.spyOn(Date, "now").mockReturnValue(realNow())
      expect(verifyUnsubscribeToken(token)).toBeNull()
    })

    it("should accept tokens within 30-day window", () => {
      const realNow = Date.now
      const twentyNineDaysAgo = realNow() - 29 * 24 * 60 * 60 * 1000
      vi.spyOn(Date, "now").mockReturnValue(twentyNineDaysAgo)
      const token = signUnsubscribeToken("profile-recent")
      vi.spyOn(Date, "now").mockReturnValue(realNow())
      expect(verifyUnsubscribeToken(token)).not.toBeNull()
    })
  })
})
