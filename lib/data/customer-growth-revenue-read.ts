import type { SupabaseClient } from "@supabase/supabase-js"

import type { AttributionClassificationInput } from "@/lib/analytics/source-classification"
import {
  buildNetRetainedPurchaseValue,
  getRecordedRefundCents,
  type NetRetainedDisputeRow,
  type NetRetainedPurchaseRow,
  type NetRetainedRefundRow,
} from "@/lib/data/net-retained-purchase-value"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import {
  SEEDED_E2E_PATIENT_PROFILE_IDS,
  shouldIncludeSeededE2EData,
} from "@/lib/data/seeded-e2e-data"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"

const MAX_DISPUTE_BASELINE_ROWS = 5_000
const MAX_CREATED_INTAKE_ROWS = 1_000
const MAX_PAID_ATTRIBUTION_ROWS = 100
const MAX_PAID_REVENUE_ROWS = 5_000
const MAX_REFUND_MOVEMENT_ROWS = 5_000

type RefundMovementReadRow = {
  amount_cents: number | null
  exclude_from_reporting: boolean | null
  intake_id: string | null
  order_amount_cents: number | null
  patient_id: string | null
  refund_cash_at: string | null
  refund_reversed_at: string | null
  stripe_refund_id: string | null
}

type LinkedDisputeIntakeRow = {
  amount_cents: number | null
  exclude_from_reporting: boolean | null
  patient_id: string | null
  refund_amount_cents: number | null
}

type DisputeReadRow = {
  funds_reinstated_at: string | null
  funds_reinstated_cents: number | null
  funds_withdrawn_at: string | null
  funds_withdrawn_cents: number | null
  intake: LinkedDisputeIntakeRow | LinkedDisputeIntakeRow[] | null
  intake_id: string | null
}

type RefundLedgerHealthRow = {
  conflicting_refund_count: number | string | null
  incomplete_intake_count: number | string | null
  unknown_mode_dispute_count: number | string | null
  unknown_priority_classification_count: number | string | null
  unledgered_refund_cents: number | string | null
  unlinked_live_dispute_cents: number | string | null
  unlinked_live_dispute_count: number | string | null
  unlinked_refund_cents: number | string | null
  unlinked_refund_count: number | string | null
  unsupported_currency_dispute_count: number | string | null
  unsupported_currency_refund_cents: number | string | null
  unsupported_currency_refund_count: number | string | null
}

export type CustomerGrowthRevenueEvidence = {
  disputeRows: NetRetainedDisputeRow[]
  paidRows: CustomerGrowthPaidRevenueRow[]
  refundRows: NetRetainedRefundRow[]
}

export type CustomerGrowthPaidRevenueRow = NetRetainedPurchaseRow & {
  category: string | null
  payment_status: string | null
  status: string | null
  subtype: string | null
}

export type CustomerGrowthAttributionRow = AttributionClassificationInput & {
  id: string
}

export type CustomerGrowthCreatedIntakeRow = {
  amount_cents: number | null
  category: string | null
  paid_at: string | null
  payment_status: string | null
  status: string | null
  subtype: string | null
}

type ExactCountResult = {
  count: number | null
}

export function requireExactCustomerGrowthCount(
  label: string,
  result: ExactCountResult,
): number {
  if (typeof result.count !== "number") {
    throw new Error(`${label} count is incomplete`)
  }
  return result.count
}

export function collectCustomerGrowthAttributionIntakeIds(
  evidence: CustomerGrowthRevenueEvidence,
): Set<string> {
  return new Set([
    ...evidence.paidRows.flatMap((row) => row.id ? [row.id] : []),
    ...evidence.refundRows.flatMap((row) => row.id ? [row.id] : []),
    ...evidence.disputeRows.flatMap((row) => row.intake_id ? [row.intake_id] : []),
  ])
}

export async function readCustomerGrowthCreatedIntakeRows(
  supabase: SupabaseClient,
  sinceIso: string,
  untilIso: string,
): Promise<CustomerGrowthCreatedIntakeRow[]> {
  let result: QueryResponse<CustomerGrowthCreatedIntakeRow> & { count: number | null }
  try {
    result = await (filterReportableIntakes(
      supabase
        .from("intakes")
        .select("category, subtype, status, payment_status, paid_at, amount_cents", { count: "exact" })
        .gte("created_at", sinceIso)
        .lte("created_at", untilIso)
        .limit(MAX_CREATED_INTAKE_ROWS),
    ) as unknown as PromiseLike<QueryResponse<CustomerGrowthCreatedIntakeRow> & {
      count: number | null
    }>)
  } catch {
    throw new Error("Customer growth intake cohort is unavailable")
  }

  const rows = result.data ?? []
  if (
    result.error ||
    typeof result.count !== "number" ||
    result.count !== rows.length
  ) {
    throw new Error("Customer growth intake cohort is incomplete")
  }
  return rows
}

export function buildCustomerGrowthRevenueForIntakeIds(
  evidence: CustomerGrowthRevenueEvidence,
  intakeIds: ReadonlySet<string>,
  since: Date,
  until: Date,
): ReturnType<typeof buildNetRetainedPurchaseValue> {
  return buildNetRetainedPurchaseValue({
    paidRows: evidence.paidRows.filter(
      (row) => Boolean(row.id && intakeIds.has(row.id)),
    ),
    refundRows: evidence.refundRows.filter(
      (row) => Boolean(row.id && intakeIds.has(row.id)),
    ),
    disputeRows: evidence.disputeRows.filter(
      (row) => Boolean(row.intake_id && intakeIds.has(row.intake_id)),
    ),
    since,
    until,
  })
}

type QueryResponse<T> = {
  data: T[] | null
  error: { message: string } | null
}

/**
 * The dashboard's revenue read is server-only, so this audit reader mirrors
 * its exact live-AUD cash-event boundary. Returned rows stay in memory and are
 * reduced by the caller before any aggregate artifact is written.
 */
export async function readCustomerGrowthRevenueEvidence(
  supabase: SupabaseClient,
  since: Date,
  until: Date,
): Promise<CustomerGrowthRevenueEvidence> {
  const sinceIso = since.toISOString()
  const untilIso = until.toISOString()

  let paidResult: QueryResponse<CustomerGrowthPaidRevenueRow> & {
    count: number | null
  }
  let refundResult: QueryResponse<RefundMovementReadRow> & {
    count: number | null
  }
  let ledgerHealthResult: {
    data: unknown
    error: { message: string } | null
  }
  let disputeResult: QueryResponse<DisputeReadRow> & {
    count: number | null
  }

  try {
    [paidResult, refundResult, ledgerHealthResult, disputeResult] = await Promise.all([
      filterReportableIntakes(
        supabase
          .from("intakes")
          .select("id, amount_cents, category, subtype, paid_at, payment_status, status", { count: "exact" })
          .in("payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES])
          .not("paid_at", "is", null)
          .gte("paid_at", sinceIso)
          .lte("paid_at", untilIso)
          .limit(MAX_PAID_REVENUE_ROWS),
      ) as unknown as PromiseLike<QueryResponse<CustomerGrowthPaidRevenueRow> & {
        count: number | null
      }>,
      supabase
        .from("stripe_refund_cash_movements")
        .select(
          "stripe_refund_id, intake_id, amount_cents, refund_cash_at, refund_reversed_at, " +
            "order_amount_cents, exclude_from_reporting, patient_id",
          { count: "exact" },
        )
        .eq("currency", "aud")
        .eq("livemode", true)
        .or(
          `and(refund_cash_at.gte.${sinceIso},refund_cash_at.lte.${untilIso}),` +
            `and(refund_reversed_at.gte.${sinceIso},refund_reversed_at.lte.${untilIso})`,
        )
        .limit(MAX_REFUND_MOVEMENT_ROWS) as unknown as PromiseLike<QueryResponse<RefundMovementReadRow> & {
          count: number | null
        }>,
      supabase
        .from("stripe_refund_ledger_health")
        .select(
          "conflicting_refund_count, incomplete_intake_count, unledgered_refund_cents, " +
            "unlinked_refund_count, unlinked_refund_cents, unsupported_currency_refund_count, " +
            "unsupported_currency_refund_cents, unlinked_live_dispute_count, " +
            "unlinked_live_dispute_cents, unknown_mode_dispute_count, " +
            "unsupported_currency_dispute_count, unknown_priority_classification_count",
        )
        .single() as unknown as PromiseLike<{
          data: unknown
          error: { message: string } | null
        }>,
      supabase
        .from("stripe_disputes")
        .select(
          "intake_id, funds_withdrawn_at, funds_withdrawn_cents, funds_reinstated_at, funds_reinstated_cents, intake:intakes(amount_cents, refund_amount_cents, exclude_from_reporting, patient_id)",
          { count: "exact" },
        )
        .eq("currency", "aud")
        .eq("livemode", true)
        .not("funds_withdrawn_at", "is", null)
        .lte("funds_withdrawn_at", untilIso)
        .order("funds_withdrawn_at", { ascending: false })
        .limit(MAX_DISPUTE_BASELINE_ROWS) as unknown as PromiseLike<QueryResponse<DisputeReadRow> & {
          count: number | null
        }>,
    ])
  } catch {
    throw new Error("Customer growth revenue evidence is unavailable")
  }

  if (paidResult.error || refundResult.error || ledgerHealthResult.error || disputeResult.error) {
    throw new Error("Customer growth revenue evidence is unavailable")
  }

  const refundRows = (refundResult.data ?? []) as RefundMovementReadRow[]
  const disputeRows = (disputeResult.data ?? []) as DisputeReadRow[]
  const ledgerHealth = normalizeLedgerHealth(ledgerHealthResult.data)
  const refundEvidenceComplete =
    typeof refundResult.count === "number" &&
    refundResult.count <= refundRows.length &&
    refundRows.every(hasCompleteRefundMovementEvidence) &&
    ledgerHealth.problemCount === 0 &&
    ledgerHealth.problemCents === 0
  const disputeEvidenceComplete =
    typeof disputeResult.count === "number" && disputeResult.count <= disputeRows.length
  const paidEvidenceComplete =
    typeof paidResult.count === "number" && paidResult.count <= (paidResult.data?.length ?? 0)
  if (!paidEvidenceComplete || !refundEvidenceComplete || !disputeEvidenceComplete) {
    throw new Error("Customer growth revenue evidence is incomplete")
  }

  const normalizedRefundRows = normalizeRefundMovementRows(refundRows)
  return {
    disputeRows: normalizeDisputeRows(disputeRows, normalizedRefundRows),
    paidRows: paidResult.data ?? [],
    refundRows: normalizedRefundRows,
  }
}

const PAID_ATTRIBUTION_SELECT = [
  "id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "referrer",
  "landing_page",
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
].join(", ")

export async function readCustomerGrowthAttributionRows(
  supabase: SupabaseClient,
  intakeIds: ReadonlySet<string>,
): Promise<CustomerGrowthAttributionRow[]> {
  const ids = [...intakeIds]
  const rows: CustomerGrowthAttributionRow[] = []

  for (let index = 0; index < ids.length; index += MAX_PAID_ATTRIBUTION_ROWS) {
    const chunk = ids.slice(index, index + MAX_PAID_ATTRIBUTION_ROWS)
    let result: QueryResponse<CustomerGrowthAttributionRow> & { count: number | null }
    try {
      result = await (filterReportableIntakes(
        supabase
          .from("intakes")
          .select(PAID_ATTRIBUTION_SELECT, { count: "exact" })
          .in("id", chunk)
          .limit(MAX_PAID_ATTRIBUTION_ROWS),
      ) as unknown as PromiseLike<QueryResponse<CustomerGrowthAttributionRow> & {
        count: number | null
      }>)
    } catch {
      throw new Error("Customer growth attribution evidence is unavailable")
    }

    const data = result.data ?? []
    if (
      result.error ||
      typeof result.count !== "number" ||
      result.count !== data.length ||
      result.count !== chunk.length
    ) {
      throw new Error("Customer growth attribution evidence is incomplete")
    }
    rows.push(...data)
  }

  return rows
}

export async function countSentAbandonedCheckoutEmails(
  supabase: SupabaseClient,
  sinceIso: string,
  untilIso: string,
): Promise<number> {
  let result: { count: number | null; error: { message: string } | null }
  try {
    result = await supabase
      .from("email_outbox")
      .select("sent_at", { count: "exact", head: true })
      .in("email_type", ["abandoned_checkout", "abandoned_checkout_followup"])
      .eq("status", "sent")
      .not("sent_at", "is", null)
      .gte("sent_at", sinceIso)
      .lte("sent_at", untilIso)
  } catch {
    throw new Error("Abandoned checkout send count is unavailable")
  }
  if (result.error) throw new Error("Abandoned checkout send count is unavailable")
  return requireExactCustomerGrowthCount("Abandoned checkout send", result)
}

function normalizeRefundMovementRows(rows: RefundMovementReadRow[]): NetRetainedRefundRow[] {
  const includeSeeded = shouldIncludeSeededE2EData()
  const seededPatientIds = new Set<string>(SEEDED_E2E_PATIENT_PROFILE_IDS)
  return rows.flatMap((row) => {
    if (
      !row.intake_id ||
      row.exclude_from_reporting === true ||
      (!includeSeeded && row.patient_id && seededPatientIds.has(row.patient_id))
    ) {
      return []
    }
    return [{
      amount_cents: row.order_amount_cents,
      id: row.intake_id,
      refund_amount_cents: row.amount_cents,
      refund_status: "succeeded",
      refund_reversed_at: row.refund_reversed_at,
      refunded_at: row.refund_cash_at,
      stripe_refund_id: row.stripe_refund_id,
    }]
  })
}

function normalizeDisputeRows(
  rows: DisputeReadRow[],
  refundRows: NetRetainedRefundRow[],
): NetRetainedDisputeRow[] {
  const includeSeeded = shouldIncludeSeededE2EData()
  const seededPatientIds = new Set<string>(SEEDED_E2E_PATIENT_PROFILE_IDS)
  const currentRefundCentsByIntake = new Map<string, number>()
  for (const row of refundRows) {
    if (!row.id) continue
    const outstandingMovementCents = row.refund_reversed_at ? 0 : getRecordedRefundCents(row)
    currentRefundCentsByIntake.set(
      row.id,
      (currentRefundCentsByIntake.get(row.id) ?? 0) + outstandingMovementCents,
    )
  }

  return rows.flatMap((row) => {
    const intake = Array.isArray(row.intake) ? (row.intake[0] ?? null) : row.intake
    if (
      intake?.exclude_from_reporting === true ||
      (!includeSeeded && intake?.patient_id && seededPatientIds.has(intake.patient_id))
    ) {
      return []
    }
    return [{
      funds_reinstated_at: row.funds_reinstated_at,
      funds_reinstated_cents: row.funds_reinstated_cents,
      funds_withdrawn_at: row.funds_withdrawn_at,
      funds_withdrawn_cents: row.funds_withdrawn_cents,
      intake_id: row.intake_id,
      order_amount_cents: intake?.amount_cents ?? null,
      prior_refund_cents: Math.max(
        Number(intake?.refund_amount_cents ?? 0) -
          (row.intake_id ? currentRefundCentsByIntake.get(row.intake_id) ?? 0 : 0),
        0,
      ),
    }]
  })
}

function hasCompleteRefundMovementEvidence(row: RefundMovementReadRow): boolean {
  return Boolean(
    row.intake_id &&
      row.stripe_refund_id &&
      row.refund_cash_at &&
      Number.isFinite(Date.parse(row.refund_cash_at)) &&
      (
        row.refund_reversed_at === null ||
        (
          Number.isFinite(Date.parse(row.refund_reversed_at)) &&
          Date.parse(row.refund_reversed_at) >= Date.parse(row.refund_cash_at)
        )
      ) &&
      Number.isInteger(row.amount_cents) &&
      Number(row.amount_cents) > 0,
  )
}

function normalizeLedgerHealth(data: unknown): { problemCents: number; problemCount: number } {
  const value = Array.isArray(data) ? data[0] : data
  const row = value as RefundLedgerHealthRow | null | undefined
  const counts = [
    row?.conflicting_refund_count,
    row?.incomplete_intake_count,
    row?.unknown_priority_classification_count,
    row?.unlinked_refund_count,
    row?.unsupported_currency_refund_count,
    row?.unlinked_live_dispute_count,
    row?.unknown_mode_dispute_count,
    row?.unsupported_currency_dispute_count,
  ].map(Number)
  const cents = [
    row?.unledgered_refund_cents,
    row?.unlinked_refund_cents,
    row?.unsupported_currency_refund_cents,
    row?.unlinked_live_dispute_cents,
  ].map(Number)
  return {
    problemCents: cents.every(Number.isFinite)
      ? cents.reduce((sum, value) => sum + value, 0)
      : Number.POSITIVE_INFINITY,
    problemCount: counts.every(Number.isFinite)
      ? counts.reduce((sum, value) => sum + value, 0)
      : Number.POSITIVE_INFINITY,
  }
}
