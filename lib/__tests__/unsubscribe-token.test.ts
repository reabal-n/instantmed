import { beforeEach,describe, expect, it, vi } from "vitest"

import {
  signEmailUnsubscribeToken,
  signUnsubscribeToken,
  verifyEmailUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/crypto/unsubscribe-token"

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

  // Email-keyed tokens: the account-less unsubscribe path for recipients with
  // no profile (partial-intake drafts). Spam Act s18 fix, 2026-07-06 audit.
  describe("email-keyed tokens", () => {
    it("round-trips an email address, normalized to lowercase", () => {
      const token = signEmailUnsubscribeToken("  Person@Example.COM ")
      const result = verifyEmailUnsubscribeToken(token)
      expect(result?.email).toBe("person@example.com")
    })

    it("survives emails containing dots (the payload separator)", () => {
      const token = signEmailUnsubscribeToken("first.last@sub.example.com.au")
      expect(verifyEmailUnsubscribeToken(token)?.email).toBe("first.last@sub.example.com.au")
    })

    it("email tokens never verify as profile tokens, and vice versa", () => {
      const emailToken = signEmailUnsubscribeToken("person@example.com")
      expect(verifyUnsubscribeToken(emailToken)).toBeNull()

      const profileToken = signUnsubscribeToken("profile-abc")
      expect(verifyEmailUnsubscribeToken(profileToken)).toBeNull()
    })

    it("rejects tampered email tokens", () => {
      const token = signEmailUnsubscribeToken("person@example.com")
      const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")
      expect(verifyEmailUnsubscribeToken(tampered)).toBeNull()
    })

    it("rejects expired email tokens", () => {
      // Fixed timestamps: capturing `Date.now` here would grab a spy left
      // installed by an earlier test in this file, silently collapsing the
      // 91-day gap to zero.
      const base = new Date("2026-07-01T00:00:00Z").getTime()
      vi.spyOn(Date, "now").mockReturnValue(base - 91 * 24 * 60 * 60 * 1000)
      const token = signEmailUnsubscribeToken("person@example.com")
      vi.spyOn(Date, "now").mockReturnValue(base)
      expect(verifyEmailUnsubscribeToken(token)).toBeNull()
    })
  })
})
