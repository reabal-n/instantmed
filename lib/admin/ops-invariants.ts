import type { SupabaseClient } from "@supabase/supabase-js"

import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"

/**
 * Operational invariants surfaced on /admin/ops as an "Integrity" counter strip.
 *
 * Mirrors the weekly runbook queries in docs/OPERATIONS.md (Q1/Q2/Q4) so the
 * problems they detect stop being invisible. Q3 (integration env-type audit) is
 * a boot-time config check, not a row count, so it is intentionally not here.
 *
 * Counts are fail-soft (a query that errors returns 0) so a transient outage on
 * one invariant never throws the whole ops page, matching the resilience of
 * lib/data/system-health.ts and app/admin/ops/page.tsx.
 */

// Clinic-side, pre-decision intake statuses. A paid intake parked in one of
// these past the 24h review SLA is an actionable review backlog (the operator
// can pick it up now). `pending_info` is excluded on purpose: the clock there
// is on the patient, not the clinic. Decided / terminal states (approved,
// awaiting_script, declined, completed, cancelled, expired, checkout_failed)
// are not awaiting review.
const AWAITING_REVIEW_STATUSES = ["paid", "in_review", "escalated"] as const

// payment_status values that mean money went back to the patient.
const REFUNDED_PAYMENT_STATUSES = ["refunded", "partially_refunded"] as const

// Review SLA hard ceiling per docs/REVENUE_MODEL.md.
const SLA_REVIEW_HOURS = 24

// Backlog at or above this many overdue cases flips the SLA card from warning
// to critical. Tuned for a solo / small-roster clinic: one breach is a warning,
// a pile-up is a fire.
export const SLA_BREACH_CRITICAL = 10

export type OperationalInvariants = {
  slaBreachBacklog: number
  certRefundOrphans: number
  refundRecordAnomalies: number
  queryFailures?: OperationalInvariantQueryFailure[]
}

export type OperationalInvariantQueryFailure =
  | "sla_breach_backlog"
  | "cert_refund_orphans"
  | "refund_record_anomalies"

export type OperationalInvariantAlert = {
  metric:
    | "ops_sla_breach_backlog"
    | "ops_cert_refund_orphans"
    | "ops_refund_record_anomalies"
    | "ops_invariant_query_failed"
  severity: "warning" | "critical"
  detail: string
  count: number
}

type CountResult = { count: number | null; error: unknown }

function countOf(
  name: OperationalInvariantQueryFailure,
  result: PromiseSettledResult<CountResult>,
  queryFailures: OperationalInvariantQueryFailure[],
): number {
  if (result.status === "rejected") {
    queryFailures.push(name)
    return 0
  }
  if (result.value.error) {
    queryFailures.push(name)
    return 0
  }
  return result.value.count ?? 0
}

/**
 * One-shot read of the three DB-countable operational invariants. Pass the
 * service-role client (RLS-bypassing) from the calling server component.
 */
export async function getOperationalInvariants(
  supabase: SupabaseClient,
): Promise<OperationalInvariants> {
  const slaCutoff = new Date(Date.now() - SLA_REVIEW_HOURS * 60 * 60 * 1000).toISOString()

  const [slaResult, orphanResult, anomalyResult] = await Promise.allSettled([
    // Q1 proxy: paid intakes still awaiting clinician review past the 24h SLA.
    filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .in("status", [...AWAITING_REVIEW_STATUSES])
        .lt("paid_at", slaCutoff),
    ),
    // Q2: refunded intakes whose certificate still verifies as `valid`.
    filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id, issued_certificates!inner(status)", { count: "exact", head: true })
        .in("payment_status", [...REFUNDED_PAYMENT_STATUSES])
        .eq("issued_certificates.status", "valid"),
    ),
    // Q4: refunded intakes missing a refund record (legacy data anomaly).
    filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .in("payment_status", [...REFUNDED_PAYMENT_STATUSES])
        .or("refund_status.is.null,refund_status.eq.not_applicable,refunded_at.is.null"),
    ),
  ])

  const queryFailures: OperationalInvariantQueryFailure[] = []

  return {
    slaBreachBacklog: countOf("sla_breach_backlog", slaResult, queryFailures),
    certRefundOrphans: countOf("cert_refund_orphans", orphanResult, queryFailures),
    refundRecordAnomalies: countOf("refund_record_anomalies", anomalyResult, queryFailures),
    queryFailures,
  }
}

/**
 * Mirror of the components/ CounterCardTone. Declared here because lib/ must
 * not import from components/; the unions are structurally identical, so the
 * page passes an InvariantTone straight into a CounterCard `tone` prop.
 */
export type InvariantTone = "neutral" | "warning" | "critical"

/**
 * neutral at 0, critical at or above `criticalAt`, warning in between. Callers
 * pass criticalAt=1 to make any non-zero count critical, or Infinity to cap a
 * counter at warning.
 */
export function invariantTone(count: number, criticalAt: number): InvariantTone {
  if (count <= 0) return "neutral"
  if (count >= criticalAt) return "critical"
  return "warning"
}

export function slaBacklogHelper(count: number): string {
  return count === 0 ? "Within 24h SLA" : `${count} past 24h`
}

export function certOrphanHelper(count: number): string {
  return count === 0 ? "None" : `${count} need revoke decision`
}

export function refundAnomalyHelper(count: number): string {
  return count === 0 ? "None" : `${count} to reconcile`
}

export function buildOperationalInvariantAlerts(
  invariants: OperationalInvariants,
): OperationalInvariantAlert[] {
  const alerts: OperationalInvariantAlert[] = []
  const queryFailures = getInvariantQueryFailures(invariants)

  if (queryFailures.length > 0) {
    alerts.push({
      metric: "ops_invariant_query_failed",
      severity: "critical",
      detail: `${queryFailures.length} operational invariant ${queryFailures.length === 1 ? "query" : "queries"} failed`,
      count: queryFailures.length,
    })
  }

  if (invariants.slaBreachBacklog > 0) {
    alerts.push({
      metric: "ops_sla_breach_backlog",
      severity: invariantTone(invariants.slaBreachBacklog, SLA_BREACH_CRITICAL) === "critical" ? "critical" : "warning",
      detail: `${invariants.slaBreachBacklog} paid intakes past 24h review SLA`,
      count: invariants.slaBreachBacklog,
    })
  }

  if (invariants.certRefundOrphans > 0) {
    alerts.push({
      metric: "ops_cert_refund_orphans",
      severity: "critical",
      detail: `${invariants.certRefundOrphans} refunded certificate intakes still verify as valid`,
      count: invariants.certRefundOrphans,
    })
  }

  if (invariants.refundRecordAnomalies > 0) {
    alerts.push({
      metric: "ops_refund_record_anomalies",
      severity: "warning",
      detail: `${invariants.refundRecordAnomalies} refunded intake missing complete refund metadata`,
      count: invariants.refundRecordAnomalies,
    })
  }

  return alerts
}

export function getInvariantQueryFailures(invariants: OperationalInvariants): OperationalInvariantQueryFailure[] {
  return invariants.queryFailures ?? []
}
