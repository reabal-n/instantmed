import { describe, expect, it } from "vitest"

import { createSafeLogContext, sanitizeObject, sanitizeUrl } from "@/lib/observability/sanitize-phi"

const REDACTED = "[REDACTED]"

describe("sanitize-phi PHI scrubber", () => {
  // The lookup does key.toLowerCase(), so a camelCase entry in the field list
  // never matched its own key and the value shipped to Sentry in cleartext via
  // the weaker regex fallback. These name values are NOT caught by any regex
  // (no digits, no "name:" prefix), so this fails before the lowercase fix.
  it("redacts camelCase name fields whose values the regex cannot catch", () => {
    const out = sanitizeObject({
      firstName: "Jane",
      lastName: "Smith",
      fullName: "Jane Smith",
      patientName: "Jane Smith",
      streetAddress: "Tooak Place",
    }) as Record<string, string>
    for (const value of Object.values(out)) {
      expect(value).toBe(REDACTED)
    }
  })

  it("redacts camelCase, snake_case, and lowercase PHI field names alike", () => {
    const out = sanitizeObject({
      medicareNumber: "2123456701",
      medicare_number: "2123456701",
      phoneNumber: "0412345678",
      dateOfBirth: "1990-01-01",
      emailAddress: "jane@example.com",
      email: "jane@example.com",
    }) as Record<string, string>
    for (const value of Object.values(out)) {
      expect(value).toBe(REDACTED)
    }
  })

  it("redacts PHI nested in objects and arrays", () => {
    const out = sanitizeObject({
      patient: { firstName: "Jane", id: "ok-keep-123" },
      contacts: [{ fullName: "John Doe" }],
    }) as { patient: Record<string, string>; contacts: Array<Record<string, string>> }
    expect(out.patient.firstName).toBe(REDACTED)
    expect(out.patient.id).toBe("ok-keep-123")
    expect(out.contacts[0].fullName).toBe(REDACTED)
  })

  it("drops forbidden fields entirely from log context, including camelCase apiKey", () => {
    const out = createSafeLogContext({
      apiKey: "sk_live_should_never_log",
      authorization: "Bearer secret",
      intakeId: "abc-123",
    })
    expect(out.apiKey).toBeUndefined()
    expect(out.authorization).toBeUndefined()
    expect(out.intakeId).toBe("abc-123")
  })

  it("leaves non-PHI fields intact", () => {
    const out = sanitizeObject({ intakeId: "abc-123", status: "paid", count: 5 }) as Record<string, unknown>
    expect(out.intakeId).toBe("abc-123")
    expect(out.status).toBe("paid")
    expect(out.count).toBe(5)
  })

  it("removes one-time auth secrets carried in URL fragments before telemetry", () => {
    const sanitized = sanitizeUrl(
      "https://instantmed.com.au/auth/confirm#token_hash=one-time-secret&type=recovery&next=%2Fauth%2Freset-password",
    )

    expect(sanitized).toBe("https://instantmed.com.au/auth/confirm")
    expect(sanitized).not.toContain("one-time-secret")
    expect(sanitized).not.toContain("token_hash")
  })

  it("preserves ordinary navigation anchors", () => {
    expect(sanitizeUrl("https://instantmed.com.au/patient/settings#account-security"))
      .toBe("https://instantmed.com.au/patient/settings#account-security")
  })
})
