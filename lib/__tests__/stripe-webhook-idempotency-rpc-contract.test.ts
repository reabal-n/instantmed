import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260503050700_fix_stripe_webhook_event_claim.sql"),
  "utf8",
)

describe("Stripe webhook idempotency RPC migration", () => {
  it("claims events from the atomic insert row count, not a timestamp window", () => {
    expect(migrationSource).toContain("GET DIAGNOSTICS v_rows = ROW_COUNT")
    expect(migrationSource).toContain("RETURN v_rows = 1")
    expect(migrationSource).not.toContain("INTERVAL '1 second'")
  })

  it("stores the claimed request in the current intake_id column", () => {
    const insertColumns = migrationSource.match(/INSERT INTO public\.stripe_webhook_events \(([\s\S]*?)\)\s+VALUES/)

    expect(insertColumns?.[1]).toContain("intake_id")
    expect(insertColumns?.[1]).not.toContain("request_id")
  })
})
