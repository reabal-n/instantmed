import { describe, expect, it, vi } from "vitest"

import {
  filterSeededE2EIntakes,
  isLikelyTestPatientIdentity,
  SEEDED_E2E_PATIENT_PROFILE_ID,
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
      ["patient_id", "in", `(${SEEDED_E2E_PATIENT_PROFILE_ID})`],
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
