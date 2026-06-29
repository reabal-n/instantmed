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
export const CERTIFICATE_MISSING_RECORD_DAYS = 14
export const CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS = 14

// Backlog at or above this many overdue cases flips the SLA card from warning
// to critical. Tuned for a solo / small-roster clinic: one breach is a warning,
// a pile-up is a fire.
export const SLA_BREACH_CRITICAL = 10

export type OperationalInvariants = {
  slaBreachBacklog: number
  certRefundOrphans: number
  refundRecordAnomalies: number
  // Paid intakes that were cancelled without a refund and are still in reporting
  // — an undelivered-but-charged order (a live chargeback/complaint vector, e.g.
  // the 2026-03 $19 med cert `e9c0aec2`). Optional so existing literals/tests
  // (and any cached callers) stay valid; getOperationalInvariants always sets it.
  paidButCancelled?: number
  // Recent certificate delivery emails that were sent, but the patient-facing
  // intake mirror still lacks document_sent_at. Optional for backwards-compatible
  // test literals; getOperationalInvariants always sets it.
  certificateSentMissingTimestamp?: number
  // Recent paid med-cert intakes in a terminal delivery state without a
  // generated certificate row. These are clinical delivery failures, not email
  // retry cases, so they need escalation instead of a resend.
  approvedCertificateMissingRecord?: number
  queryFailures?: OperationalInvariantQueryFailure[]
}

export type OperationalInvariantQueryFailure =
  | "sla_breach_backlog"
  | "cert_refund_orphans"
  | "refund_record_anomalies"
  | "paid_but_cancelled"
  | "approved_certificate_missing_record"
  | "certificate_sent_missing_timestamp"

export type OperationalInvariantAlert = {
  metric:
    | "ops_sla_breach_backlog"
    | "ops_cert_refund_orphans"
    | "ops_refund_record_anomalies"
    | "ops_paid_but_cancelled"
    | "ops_approved_certificate_missing_record"
    | "ops_certificate_sent_missing_timestamp"
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

async function countApprovedCertificateMissingRecord(
  supabase: SupabaseClient,
  sinceIso: string,
): Promise<CountResult> {
  const { data: intakeRows, error: intakeError } = await filterSeededE2EIntakes(
    supabase
      .from("intakes")
      .select("id")
      .eq("category", "medical_certificate")
      .eq("payment_status", "paid")
      .in("status", ["approved", "completed"])
      .gte("approved_at", sinceIso)
      .or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false"),
  )
    .limit(5000)

  if (intakeError) {
    return { count: null, error: intakeError }
  }

  const intakeIds = ((intakeRows ?? []) as Array<{ id: string | null }>)
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)

  if (intakeIds.length === 0) {
    return { count: 0, error: null }
  }

  const { data: certificateRows, error: certificateError } = await supabase
    .from("issued_certificates")
    .select("intake_id")
    .in("intake_id", intakeIds)
    .limit(5000)

  if (certificateError) {
    return { count: null, error: certificateError }
  }

  const generatedIntakeIds = new Set(
    ((certificateRows ?? []) as Array<{ intake_id: string | null }>)
      .map((row) => row.intake_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  )

  return {
    count: intakeIds.filter((id) => !generatedIntakeIds.has(id)).length,
    error: null,
  }
}

async function countCertificateSentMissingTimestamp(
  supabase: SupabaseClient,
  sinceIso: string,
): Promise<CountResult> {
  const { data: sentRows, error: emailError } = await supabase
    .from("email_outbox")
    .select("intake_id")
    .eq("email_type", "med_cert_patient")
    .eq("status", "sent")
    .gte("created_at", sinceIso)
    .not("intake_id", "is", null)
    .limit(5000)

  if (emailError) {
    return { count: null, error: emailError }
  }

  const intakeIds = [
    ...new Set(
      ((sentRows ?? []) as Array<{ intake_id: string | null }>)
        .map((row) => row.intake_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ]

  if (intakeIds.length === 0) {
    return { count: 0, error: null }
  }

  const { count, error } = await filterSeededE2EIntakes(
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("id", intakeIds)
      .eq("category", "medical_certificate")
      .is("document_sent_at", null)
      .or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false"),
  )

  return { count, error }
}

/**
 * One-shot read of the DB-countable operational invariants. Pass the
 * service-role client (RLS-bypassing) from the calling server component.
 */
export async function getOperationalInvariants(
  supabase: SupabaseClient,
): Promise<OperationalInvariants> {
  const slaCutoff = new Date(Date.now() - SLA_REVIEW_HOURS * 60 * 60 * 1000).toISOString()
  const certificateMissingRecordCutoff = new Date(
    Date.now() - CERTIFICATE_MISSING_RECORD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
  const certificateTimestampCutoff = new Date(
    Date.now() - CERTIFICATE_SENT_TIMESTAMP_DRIFT_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  const [
    slaResult,
    orphanResult,
    anomalyResult,
    paidCancelledResult,
    certificateMissingRecordResult,
    certificateTimestampResult,
  ] = await Promise.allSettled([
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
    // Paid + cancelled + still in reporting = charged but undelivered, never
    // refunded. Excluded rows are already operator-triaged, so they drop out.
    filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .eq("status", "cancelled")
        .or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false"),
    ),
    countApprovedCertificateMissingRecord(supabase, certificateMissingRecordCutoff),
    countCertificateSentMissingTimestamp(supabase, certificateTimestampCutoff),
  ])

  const queryFailures: OperationalInvariantQueryFailure[] = []

  return {
    slaBreachBacklog: countOf("sla_breach_backlog", slaResult, queryFailures),
    certRefundOrphans: countOf("cert_refund_orphans", orphanResult, queryFailures),
    refundRecordAnomalies: countOf("refund_record_anomalies", anomalyResult, queryFailures),
    paidButCancelled: countOf("paid_but_cancelled", paidCancelledResult, queryFailures),
    approvedCertificateMissingRecord: countOf(
      "approved_certificate_missing_record",
      certificateMissingRecordResult,
      queryFailures,
    ),
    certificateSentMissingTimestamp: countOf(
      "certificate_sent_missing_timestamp",
      certificateTimestampResult,
      queryFailures,
    ),
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

export function paidButCancelledHelper(count: number): string {
  return count === 0 ? "None" : `${count} charged, undelivered`
}

export function approvedCertificateMissingRecordHelper(count: number): string {
  return count === 0 ? "All generated" : `${count} need escalation`
}

export function certificateSentMissingTimestampHelper(count: number): string {
  return count === 0 ? "All mirrored" : `${count} missing sent ${count === 1 ? "timestamp" : "timestamps"}`
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

  if ((invariants.paidButCancelled ?? 0) > 0) {
    const count = invariants.paidButCancelled ?? 0
    alerts.push({
      metric: "ops_paid_but_cancelled",
      severity: "critical",
      detail: `${count} paid ${count === 1 ? "intake" : "intakes"} cancelled without refund (charged, undelivered)`,
      count,
    })
  }

  if ((invariants.approvedCertificateMissingRecord ?? 0) > 0) {
    const count = invariants.approvedCertificateMissingRecord ?? 0
    alerts.push({
      metric: "ops_approved_certificate_missing_record",
      severity: "critical",
      detail: `${count} approved medical certificate ${count === 1 ? "intake is" : "intakes are"} missing a certificate record`,
      count,
    })
  }

  if ((invariants.certificateSentMissingTimestamp ?? 0) > 0) {
    const count = invariants.certificateSentMissingTimestamp ?? 0
    alerts.push({
      metric: "ops_certificate_sent_missing_timestamp",
      severity: "warning",
      detail: `${count} recent certificate ${count === 1 ? "send is" : "sends are"} missing document_sent_at`,
      count,
    })
  }

  return alerts
}

export function getInvariantQueryFailures(invariants: OperationalInvariants): OperationalInvariantQueryFailure[] {
  return invariants.queryFailures ?? []
}
