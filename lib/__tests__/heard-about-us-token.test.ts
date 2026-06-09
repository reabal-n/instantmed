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
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")
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
