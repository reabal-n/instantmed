import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ATTRIBUTION_COLUMNS = [
  "utm_source",
  "utm_medium",
  "utm_id",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "landing_page",
  "attribution_captured_at",
  "gclid",
  "gbraid",
  "wbraid",
  "campaignid",
  "adgroupid",
  "keyword",
  "creative",
  "matchtype",
  "device",
  "network",
]

function read(path: string): string {
  return readFileSync(path, "utf8")
}

describe("attribution persistence contract", () => {
  it("persists the same attribution columns in authenticated and guest checkout", () => {
    // Authenticated checkout was carved (2026-05-10) into modules under
    // `lib/stripe/checkout/`. The orchestrator still calls
    // `normalizeAttributionForStorage`; the column->attribution literals
    // live in the persistence module that runs the intake insert.
    const authenticatedOrchestrator = read("lib/stripe/checkout.ts")
    const authenticatedPersistence = read("lib/stripe/checkout/persistence.ts")
    const guest = read("lib/stripe/guest-checkout.ts")

    expect(authenticatedOrchestrator).toContain("normalizeAttributionForStorage(resolvedAttribution)")
    expect(guest).toContain("normalizeAttributionForStorage(resolvedAttribution)")

    for (const column of ATTRIBUTION_COLUMNS) {
      expect(authenticatedPersistence).toContain(`${column}: attribution.`)
      expect(guest).toContain(`${column}: attribution.`)
    }
  })

  it("keeps webhook attribution select and schema migration aligned with stored checkout fields", () => {
    const webhook = read("app/api/stripe/webhook/handlers/checkout-session-completed.ts")
    const migrations = readdirSync("supabase/migrations")
      .filter((file) => file.endsWith(".sql"))
      .map((file) => read(join("supabase/migrations", file)))
      .join("\n")
    const dbTypes = read("types/db.ts")

    for (const column of ATTRIBUTION_COLUMNS) {
      expect(webhook).toContain(column)
      expect(dbTypes).toContain(`${column}: string | null`)
      expect(migrations).toContain(column)
    }
  })
})
