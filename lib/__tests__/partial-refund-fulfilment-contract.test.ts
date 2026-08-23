import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const entitlementMigrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260819055501_allow_partially_refunded_fulfilment.sql"),
  "utf8",
)

const claimRepairMigrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260823101500_fix_partially_refunded_review_claim.sql"),
  "utf8",
)

describe("partial-refund fulfilment contract", () => {
  it("keeps the doctor queue index open only to fulfilment-entitled payments", () => {
    expect(entitlementMigrationSource).toContain("payment_status IN ('paid', 'partially_refunded')")
    expect(entitlementMigrationSource).not.toContain(
      "payment_status IN ('paid', 'partially_refunded', 'refunded')",
    )
  })

  it("repairs the canonical three-argument claim RPC used by the application", () => {
    expect(claimRepairMigrationSource).toContain(
      "DROP FUNCTION IF EXISTS public.claim_intake_for_review(uuid, uuid);",
    )
    expect(claimRepairMigrationSource).toContain("p_force boolean DEFAULT false")
    expect(claimRepairMigrationSource).toContain("RETURNS TABLE")
    expect(claimRepairMigrationSource).not.toContain("RETURNS JSONB")
    expect(claimRepairMigrationSource).toContain(
      "payment_status NOT IN ('paid', 'partially_refunded')",
    )
    expect(claimRepairMigrationSource).toContain(
      "payment_status IN ('paid', 'partially_refunded')",
    )
    expect(claimRepairMigrationSource).toContain(
      "GRANT EXECUTE ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) TO service_role",
    )
    expect(claimRepairMigrationSource).toContain(
      "REVOKE ALL ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated",
    )
    expect(claimRepairMigrationSource).not.toContain(
      "payment_status IN ('paid', 'partially_refunded', 'refunded')",
    )
  })
})
