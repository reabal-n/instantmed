import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260814186000_correct_stripe_dispute_aggregation.sql",
)

describe("Stripe dispute aggregate correction migration", () => {
  it("reconciles payment state from every dispute linked to an intake", () => {
    const migration = fs.readFileSync(migrationPath, "utf8")

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.record_stripe_dispute_cash_event")
    expect(migration).toContain("WHERE dispute.intake_id = v_dispute.intake_id")
    expect(migration).toContain("v_outstanding_dispute_cents")
    expect(migration).not.toContain("intake.dispute_id = p_dispute_id")
    expect(migration).toContain("terminal_lost_at")
    expect(migration).toContain("record_stripe_dispute_status_event")
  })

  it("publishes one aggregate Ads target per intake without using intakes.dispute_id", () => {
    const migration = fs.readFileSync(migrationPath, "utf8")

    expect(migration).toContain("CREATE VIEW public.stripe_dispute_ads_targets")
    expect(migration).toContain("sum(GREATEST(")
    expect(migration).toContain("dispute.terminal_lost_at IS NOT NULL")
    expect(migration).toContain("target_net_value_cents")
    expect(migration.replaceAll("\n", " ")).not.toMatch(
      /JOIN public\.intakes[^;]+intake\.dispute_id/,
    )
  })

  it("atomically leases one external Ads mutation per exact target", () => {
    const migration = fs.readFileSync(migrationPath, "utf8")

    expect(migration).toContain("CREATE TABLE public.google_ads_conversion_adjustment_claims")
    expect(migration).toContain("UNIQUE (intake_id, generation)")
    expect(migration).toContain("ORDER BY claim.generation DESC")
    expect(migration).toContain("reserve_google_ads_conversion_adjustment")
    expect(migration).toContain("FOR UPDATE")
    expect(migration).toContain("lease_expires_at")
    expect(migration).toContain("complete_google_ads_conversion_adjustment_claim")
    expect(migration).toContain("exact_target_net_value_cents")
    expect(migration).toContain("GREATEST(computed.exact_target_net_value_cents, 1)")
    expect(migration).toContain("terminal_reason' = 'conversion_not_found'")
    expect(migration).toContain("error_code' LIKE '%CONVERSION_NOT_FOUND%'")
    expect(migration).toContain("GRANT EXECUTE")
    expect(migration).toContain("TO service_role")
  })

  it("makes a retryable exact target due after a late purchase-upload success", () => {
    const migration = fs.readFileSync(migrationPath, "utf8")
    const dueView = migration.slice(
      migration.indexOf("CREATE VIEW public.google_ads_conversion_adjustment_due"),
      migration.indexOf(
        "CREATE VIEW public.google_ads_conversion_adjustment_claim_health",
      ),
    )

    expect(dueView).toContain("audit.action = 'google_ads_conversion_upload'")
    expect(dueView).toContain("audit.metadata ->> 'status' = 'success'")
    expect(dueView).toContain("latest_claim.state IN ('pending', 'retryable_failed')")
    expect(dueView).toContain(
      "latest_claim.target_net_value_cents = target.target_net_value_cents",
    )
  })

  it("corrects refund lifecycle health and invalidates pending notification retries", () => {
    const migration = fs.readFileSync(migrationPath, "utf8")

    expect(migration).toContain("refund_reversed_at IS NULL")
    expect(migration).toContain("<>\n        COALESCE(exact_refund.exact_refund_cents, 0)")
    expect(migration).toContain("abs(")
    expect(migration).toContain("'cancelled'")
    expect(migration).toContain("':observation:'")
  })

  it("derives refund lifecycle from durable event time instead of delivery order", () => {
    const migration = fs.readFileSync(migrationPath, "utf8")

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.reconcile_intake_refund_cash_state")
    expect(migration).toContain("v_latest_refund_status")
    expect(migration).toContain("evidence.stripe_event_created_at")
    expect(migration).toContain("evidence.refund_reversed_at")
    expect(migration).toMatch(/ORDER BY \(\s+CASE/)
    expect(migration).toContain("'refund.created', 'refund.updated', 'refund.failed'")
    expect(migration).toContain("THEN evidence.stripe_event_created_at")
    expect(migration).toContain("ELSE GREATEST(")
    expect(migration).toContain("WHEN v_latest_refund_status IN ('failed', 'canceled')")
    expect(migration).toContain("v_outstanding_dispute_cents > 0 THEN 'disputed'")
  })

  it("serializes parallel support refund attempts before count-and-insert", () => {
    const migration = fs.readFileSync(migrationPath, "utf8")
    const functionStart = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.reserve_support_refund_attempt",
    )
    const functionEnd = migration.indexOf(
      "REVOKE ALL ON FUNCTION public.reserve_support_refund_attempt",
      functionStart,
    )
    const reservation = migration.slice(functionStart, functionEnd)

    expect(migration).toContain("CREATE TABLE public.support_refund_attempts")
    expect(migration).toContain("UNIQUE (actor_profile_id, attempt_key)")
    expect(migration).toContain("amount_cents BETWEEN 1 AND 10000")
    expect(reservation).toContain("v_actor_role <> 'support'::public.user_role")
    expect(reservation).toContain("v_now - INTERVAL '24 hours'")
    expect(reservation).toContain("v_recent_attempt_count >= 3")

    const actorMutex = reservation.indexOf("WHERE profile.id = p_actor_profile_id")
    const actorLock = reservation.indexOf("FOR UPDATE;", actorMutex)
    const rollingCount = reservation.lastIndexOf("SELECT count(*)::integer")
    const attemptInsert = reservation.indexOf(
      "INSERT INTO public.support_refund_attempts",
    )
    expect(actorMutex).toBeGreaterThan(-1)
    expect(actorLock).toBeGreaterThan(actorMutex)
    expect(rollingCount).toBeGreaterThan(actorLock)
    expect(attemptInsert).toBeGreaterThan(rollingCount)
  })

  it("keeps the support refund attempt ledger and RPC service-role-only", () => {
    const migration = fs.readFileSync(migrationPath, "utf8")

    expect(migration).toMatch(
      /ALTER TABLE public\.support_refund_attempts ENABLE ROW LEVEL SECURITY;\s+REVOKE ALL ON TABLE public\.support_refund_attempts\s+FROM PUBLIC, anon, authenticated, service_role;/,
    )
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.reserve_support_refund_attempt\(uuid, uuid, text, integer\)\s+FROM PUBLIC, anon, authenticated, service_role;\s+GRANT EXECUTE ON FUNCTION public\.reserve_support_refund_attempt\(uuid, uuid, text, integer\)\s+TO service_role;/,
    )

    const reservation = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.reserve_support_refund_attempt"),
    )
    expect(reservation).toContain("SECURITY DEFINER")
    expect(reservation).toContain("SET search_path = pg_catalog, public")
    expect(reservation).not.toMatch(/GRANT EXECUTE[^;]+TO (?:anon|authenticated)/)
  })
})
