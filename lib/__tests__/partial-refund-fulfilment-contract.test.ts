import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260819054245_allow_partially_refunded_fulfilment.sql"),
  "utf8",
)

describe("partial-refund fulfilment contract", () => {
  it("keeps the doctor claim RPC and its hot-path index open only to paid obligations", () => {
    expect(migrationSource).toContain("payment_status IN ('paid', 'partially_refunded')")
    expect(migrationSource).toContain("payment_status NOT IN ('paid', 'partially_refunded')")
    expect(migrationSource).toContain("REVOKE ALL ON FUNCTION public.claim_intake_for_review")
    expect(migrationSource).toContain("GRANT EXECUTE ON FUNCTION public.claim_intake_for_review")
    expect(migrationSource).not.toContain("payment_status IN ('paid', 'partially_refunded', 'refunded')")
  })
})
