import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814184000_add_stripe_refund_event_ledger.sql",
  ),
  "utf8",
)

describe("Stripe refund event ledger migration", () => {
  it("creates an append-only exact-evidence table and canonical cash-movement view", () => {
    expect(migration).toContain("CREATE TABLE public.stripe_refund_events")
    expect(migration).toContain("evidence_key text NOT NULL UNIQUE")
    expect(migration).toContain("stripe_event_id text")
    expect(migration).toContain("stripe_refund_id text NOT NULL")
    expect(migration).toContain("refund_cash_at timestamptz")
    expect(migration).toContain("refund_reversed_at timestamptz")
    expect(migration).toContain("refund_created_at timestamptz NOT NULL")
    expect(migration).toContain("CREATE VIEW public.stripe_refund_evidence_consistency")
    expect(migration).toContain("is_consistent")
    expect(migration).toContain("conflicting_refund_count")
    expect(migration).toContain("CREATE VIEW public.stripe_refund_cash_movements")
    expect(migration).toContain("consistency.refund_cash_at IS NOT NULL")
    expect(migration).toContain("unlinked_refund_count")
    expect(migration).toContain("unlinked_refund_cents")
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.reconcile_intake_refund_cash_state")
    expect(migration).toContain("FOR UPDATE")
    expect(migration).toContain("Conflicting exact refund evidence")
    expect(migration).toContain("movement.refund_reversed_at IS NULL")
    expect(migration).toContain("FROM public.stripe_disputes AS dispute")
    expect(migration).toContain("Exact refund evidence does not cover cumulative intake refunds")
    expect(migration).not.toContain("WHERE refund_event.refund_status = 'succeeded'")
    expect(migration).not.toContain("DISTINCT ON")
  })

  it("allows the webhook role to insert and read but never update or delete evidence", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY")
    expect(migration).toContain("REVOKE ALL ON public.stripe_refund_events")
    expect(migration).toContain("GRANT SELECT, INSERT ON public.stripe_refund_events TO service_role")
    expect(migration).not.toContain("GRANT UPDATE")
    expect(migration).not.toContain("GRANT DELETE")
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.reconcile_intake_refund_cash_state(uuid, boolean, text)",
    )
  })
})
