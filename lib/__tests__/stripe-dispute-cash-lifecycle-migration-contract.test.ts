import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814182000_track_stripe_dispute_cash_lifecycle.sql",
  ),
  "utf8",
)
const revenueModel = readFileSync(
  join(process.cwd(), "docs/REVENUE_MODEL.md"),
  "utf8",
)

describe("Stripe dispute cash lifecycle migration contract", () => {
  it("stores canonical withdrawal and reinstatement evidence separately from dispute creation", () => {
    for (const column of [
      "funds_withdrawn_at",
      "funds_withdrawn_cents",
      "funds_withdrawn_event_id",
      "funds_reinstated_at",
      "funds_reinstated_cents",
      "funds_reinstated_event_id",
      "dispute_status_event_at",
      "dispute_status_event_id",
    ]) {
      expect(migration).toContain(column)
    }
    expect(migration).toContain("stripe_disputes_funds_withdrawn_evidence_check")
    expect(migration).toContain("stripe_disputes_funds_reinstated_evidence_check")
  })

  it("atomically applies each cash event once and requires withdrawal evidence before reinstatement", () => {
    expect(migration).toContain("record_stripe_dispute_cash_event")
    expect(migration).toContain("charge.dispute.funds_withdrawn")
    expect(migration).toContain("charge.dispute.funds_reinstated")
    expect(migration).toContain("FOR UPDATE")
    expect(migration).toContain("funds_withdrawn_event_id IS NOT NULL")
    expect(migration).toContain("funds_reinstated_event_id IS NOT NULL")
    expect(migration).toContain("requires a prior withdrawal")
  })

  it("restores intake payment truth from durable refund evidence without exposing the RPC", () => {
    expect(migration).toContain("refund_amount_cents")
    expect(migration).toContain("refunded_at")
    expect(migration).toContain("'partially_refunded'")
    expect(migration).toContain("'refunded'")
    expect(migration).toContain("'paid'")
    expect(migration).toContain("payment_status = 'disputed'")
    expect(migration).toContain("SECURITY DEFINER")
    expect(migration).toContain("SET search_path = pg_catalog, public")
    expect(migration).toContain("FROM PUBLIC, anon, authenticated")
    expect(migration).toContain("TO service_role")
  })

  it("keeps the intake disputed while reinstated cash is still below the withdrawal", () => {
    expect(migration).toContain("p_amount_cents < v_dispute.funds_withdrawn_cents")
    expect(migration).toContain("v_restore_status := 'disputed'")
  })

  it("pins revenue windows to cash movement rather than dispute case creation or closure", () => {
    expect(revenueModel).toContain("`stripe_disputes.funds_withdrawn_at`")
    expect(revenueModel).toContain("`stripe_disputes.funds_reinstated_at`")
    expect(revenueModel).not.toContain("disputes leave by `stripe_disputes.created_at`")
  })
})
