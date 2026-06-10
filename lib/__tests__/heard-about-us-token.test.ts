import { beforeEach, describe, expect, it, vi } from "vitest"

import { signHeardAboutUsToken, verifyHeardAboutUsToken } from "@/lib/crypto/heard-about-us-token"

describe("heard-about-us-token", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", "test-secret-key-for-hmac-signing")
  })

  it("signs a URL-safe base64url token", () => {
    const token = signHeardAboutUsToken("intake-123")
    expect(token).toBeTruthy()
    expect(token).not.toMatch(/[+/=]/)
  })

  it("round-trips a valid token to its intakeId", () => {
    const token = signHeardAboutUsToken("intake-abc")
    expect(verifyHeardAboutUsToken(token)).toEqual({ intakeId: "intake-abc" })
  })

  it("produces different tokens for different intakes", () => {
    expect(signHeardAboutUsToken("a")).not.toBe(signHeardAboutUsToken("b"))
  })

  it("rejects a tampered token", () => {
    const token = signHeardAboutUsToken("intake-abc")
    // Tamper the DECODED payload (flip the last HMAC hex char) so the change is
    // guaranteed to alter a byte. Flipping the last base64url char of the encoded
    // token can be a no-op when its trailing bits are unused — that made this test
    // non-deterministic (the embedded timestamp varies the final bytes per run).
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const tamperedDecoded = decoded.slice(0, -1) + (decoded.endsWith("a") ? "b" : "a")
    const tampered = Buffer.from(tamperedDecoded, "utf-8").toString("base64url")
    expect(verifyHeardAboutUsToken(tampered)).toBeNull()
  })

  it("rejects empty and garbage input", () => {
    expect(verifyHeardAboutUsToken("")).toBeNull()
    expect(verifyHeardAboutUsToken("not-a-token")).toBeNull()
  })

  it("rejects tokens older than the 30-day TTL", () => {
    const realNow = Date.now
    vi.spyOn(Date, "now").mockReturnValue(realNow() - 31 * 24 * 60 * 60 * 1000)
    const token = signHeardAboutUsToken("intake-old")
    vi.spyOn(Date, "now").mockReturnValue(realNow())
    expect(verifyHeardAboutUsToken(token)).toBeNull()
  })

  it("accepts tokens within the 30-day window", () => {
    const realNow = Date.now
    vi.spyOn(Date, "now").mockReturnValue(realNow() - 29 * 24 * 60 * 60 * 1000)
    const token = signHeardAboutUsToken("intake-recent")
    vi.spyOn(Date, "now").mockReturnValue(realNow())
    expect(verifyHeardAboutUsToken(token)).toEqual({ intakeId: "intake-recent" })
  })

  it("does not validate a token signed with a different secret", () => {
    const token = signHeardAboutUsToken("intake-x")
    vi.stubEnv("INTERNAL_API_SECRET", "a-different-secret")
    expect(verifyHeardAboutUsToken(token)).toBeNull()
  })
})
