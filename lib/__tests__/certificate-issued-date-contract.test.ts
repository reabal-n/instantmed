import { describe, expect, it } from "vitest"

import { getSydneyDateOnly } from "@/lib/medical-certificates/date-policy"
import {
  buildCertificateIssuedDateSnapshot,
  hasConsistentCertificateIssuedDate,
} from "@/lib/medical-certificates/issued-date-integrity"
import {
  generateCertificateNumber,
  generateCertificateRef,
} from "@/lib/pdf/cert-identifiers"

describe("certificate Sydney issued-date contract", () => {
  it.each([
    ["AEST", "2026-08-15T15:02:00.000Z", "2026-08-16"],
    ["AEDT", "2026-01-15T14:02:00.000Z", "2026-01-16"],
  ])("derives %s issue dates from the Sydney civil day", (_season, timestamp, expected) => {
    expect(getSydneyDateOnly(new Date(timestamp))).toBe(expected)
  })

  it("uses the supplied Sydney issue date for both identifier formats", () => {
    const issuedOn = getSydneyDateOnly(new Date("2026-12-31T13:30:00.000Z"))

    expect(issuedOn).toBe("2027-01-01")
    expect(generateCertificateNumber(issuedOn)).toMatch(/^MC-2027-[0-9A-F]{8}$/)
    expect(generateCertificateRef("work", issuedOn)).toMatch(/^IM-WORK-20270101-\d{8}$/)
  })

  it.each([
    "2026-8-16",
    "2026-02-30",
    "not-a-date",
  ])("rejects malformed issuedOn values: %s", (issuedOn) => {
    expect(() => generateCertificateNumber(issuedOn)).toThrow(/issuedOn/i)
    expect(() => generateCertificateRef("work", issuedOn)).toThrow(/issuedOn/i)
  })

  it("keeps a valid issuance consistent when persistence crosses Sydney midnight", () => {
    const issuedAt = new Date("2026-08-16T13:59:59.000Z")
    const issuedOn = getSydneyDateOnly(issuedAt)

    expect(issuedOn).toBe("2026-08-16")
    expect(hasConsistentCertificateIssuedDate({
      createdAt: "2026-08-16T14:00:02.000Z",
      issueDate: issuedOn,
      templateConfigSnapshot: buildCertificateIssuedDateSnapshot(issuedAt, issuedOn),
    })).toBe(true)
  })

  it("fails closed on legacy UTC/Sydney issue-date drift", () => {
    expect(hasConsistentCertificateIssuedDate({
      createdAt: "2026-08-15T15:02:00.000Z",
      issueDate: "2026-08-15",
      templateConfigSnapshot: {},
    })).toBe(false)
  })

  it("fails closed on partial or conflicting immutable issue snapshots", () => {
    expect(hasConsistentCertificateIssuedDate({
      createdAt: "2026-08-16T00:02:00.000Z",
      issueDate: "2026-08-16",
      templateConfigSnapshot: {
        certificate_issued_on_sydney: "2026-08-16",
      },
    })).toBe(false)

    expect(hasConsistentCertificateIssuedDate({
      createdAt: "2026-08-16T00:02:00.000Z",
      issueDate: "2026-08-15",
      templateConfigSnapshot: buildCertificateIssuedDateSnapshot(
        new Date("2026-08-15T15:02:00.000Z"),
        "2026-08-16",
      ),
    })).toBe(false)
  })
})
