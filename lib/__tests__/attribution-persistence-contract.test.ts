import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const ATTRIBUTION_COLUMNS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "landing_page",
  "attribution_captured_at",
  "gclid",
  "gbraid",
  "wbraid",
]

function read(path: string): string {
  return readFileSync(path, "utf8")
}

describe("attribution persistence contract", () => {
  it("persists the same attribution columns in authenticated and guest checkout", () => {
    const authenticated = read("lib/stripe/checkout.ts")
    const guest = read("lib/stripe/guest-checkout.ts")

    expect(authenticated).toContain("normalizeAttributionForStorage(input.attribution)")
    expect(guest).toContain("normalizeAttributionForStorage(input.attribution)")

    for (const column of ATTRIBUTION_COLUMNS) {
      expect(authenticated).toContain(`${column}: attribution.`)
      expect(guest).toContain(`${column}: attribution.`)
    }
  })

  it("keeps webhook attribution select and schema migration aligned with stored checkout fields", () => {
    const webhook = read("app/api/stripe/webhook/handlers/checkout-session-completed.ts")
    const migration = read("supabase/migrations/20260503000100_persist_full_intake_attribution.sql")
    const dbTypes = read("types/db.ts")

    for (const column of ATTRIBUTION_COLUMNS) {
      expect(webhook).toContain(column)
      expect(dbTypes).toContain(`${column}: string | null`)
    }

    for (const column of ["utm_content", "utm_term", "referrer", "landing_page", "attribution_captured_at"]) {
      expect(migration).toContain(column)
    }
  })
})
