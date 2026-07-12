import { describe, expect, it, vi } from "vitest"

import {
  filterSeededE2EIntakes,
  isLikelyE2EIntakeMarkers,
  isLikelyTestPatientIdentity,
  shouldIncludeSeededE2EData,
} from "@/lib/data/seeded-e2e-data"

function createQueryRecorder() {
  return {
    calls: [] as Array<[string, string, string]>,
    not(column: string, operator: string, value: string) {
      this.calls.push([column, operator, value])
      return this
    },
  }
}

describe("seeded E2E data guards", () => {
  it("hides seeded E2E intakes from live operational reads by default", () => {
    expect(shouldIncludeSeededE2EData({})).toBe(false)

    const query = createQueryRecorder()
    const returned = filterSeededE2EIntakes(query, {})

    expect(returned).toBe(query)
    expect(query.calls).toEqual([
      [
        "patient_id",
        "in",
        "(e2e00000-0000-0000-0000-000000000002,e2e00000-0000-0000-0000-000000000090,e2e00000-0000-0000-0000-0000000000a1,e2e00000-0000-0000-0000-0000000000a2,e2e00000-0000-0000-0000-0000000000a3)",
      ],
    ])
  })

  it("keeps seeded E2E intakes visible during test runs", () => {
    for (const env of [
      { PLAYWRIGHT: "1" },
      { E2E: "true" },
      { E2E_MODE: "true" },
      { NODE_ENV: "test" },
    ]) {
      expect(shouldIncludeSeededE2EData(env)).toBe(true)

      const query = createQueryRecorder()
      filterSeededE2EIntakes(query, env)

      expect(query.calls).toEqual([])
    }
  })

  it("keeps the production helper tied to the actual runtime environment", async () => {
    vi.stubEnv("PLAYWRIGHT", "1")
    try {
      expect(shouldIncludeSeededE2EData()).toBe(true)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

// Pins the machine-generated test-identity patterns that keep E2E/CI orders
// out of operator-facing signals (Telegram paid-request pages). Every pattern
// must be machine-shaped: a real patient must never be classifiable as test.
describe("isLikelyTestPatientIdentity", () => {
  it.each([
    "test.patient@example.com",
    "mobile.checkout@example.com",
    "proof-desktop-pill@example.org",
    "someone@instantmed-e2e.test",
    "request-qol-uti-390@instantmed.test",
    "browser-1782377899885@instantmed.com.au",
    "test@instantmed.com.au",
    "e2e-guest@gmail.com",
  ])("classifies %s as a test identity", (email) => {
    expect(isLikelyTestPatientIdentity({ email })).toBe(true)
  })

  it.each([
    "sarah.jones@gmail.com",
    "beclamont@hotmail.con", // typo domain is a REAL patient, not a test
    "browser@instantmed.com.au", // no timestamp suffix - not the automation pattern
    "steste@bigpond.com", // contains 'test' mid-string but not e2e-prefixed
  ])("keeps %s as a real identity", (email) => {
    expect(isLikelyTestPatientIdentity({ email })).toBe(false)
  })

  it("classifies fixture names but never ordinary names", () => {
    expect(isLikelyTestPatientIdentity({ fullName: "E2E Test Patient" })).toBe(true)
    expect(isLikelyTestPatientIdentity({ fullName: "Test Patient" })).toBe(true)
    expect(isLikelyTestPatientIdentity({ fullName: "Sarah Jones" })).toBe(false)
    expect(isLikelyTestPatientIdentity({ fullName: "Testa Rossi" })).toBe(false)
  })

  it("returns false for empty input", () => {
    expect(isLikelyTestPatientIdentity({})).toBe(false)
    expect(isLikelyTestPatientIdentity({ email: null, fullName: null })).toBe(false)
  })
})

describe("isLikelyE2EIntakeMarkers", () => {
  // The 2026-07-03 pager hole: AUTHED CI fixtures (fresh random patient,
  // guest_email NULL) can only be classified from the intake's own columns.
  it.each([
    { referenceNumber: "E2E-AUTO-ABC123" }, // medcert.auto-approval.spec.ts
    { referenceNumber: "E2E-GUEST-XYZ" }, // guest-checkout.spec.ts
    { referenceNumber: "E2E-RX-IDENTITY" }, // admin.prescribing-identity.spec.ts
    { referenceNumber: "e2e-lowercase" }, // case-insensitive
    { paymentId: "pi_e2e_auto_m123abc" }, // medcert.auto-approval.spec.ts
    { paymentId: "cs_e2e_fixture" }, // contains _e2e_ marker
    { referenceNumber: "IM-WORK-20260703-01234567", paymentId: "pi_e2e_x" }, // either marker is enough
  ])("classifies %j as an E2E fixture intake", (input) => {
    expect(isLikelyE2EIntakeMarkers(input)).toBe(true)
  })

  it.each([
    { referenceNumber: "IM-WORK-20260703-01234567", paymentId: "cs_live_a1Wp9pcJ4WkOioXj" }, // real order shape
    { referenceNumber: "IM-STUDY-20260426-06236622" }, // canary cert ref stays real
    { referenceNumber: null, paymentId: null },
    {},
  ])("keeps %j as a real intake", (input) => {
    expect(isLikelyE2EIntakeMarkers(input)).toBe(false)
  })
})
