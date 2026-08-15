import type { SupabaseClient } from "@supabase/supabase-js"

const HISTORICAL_AUTO_ISSUED_REVIEW_EXPECTED_COUNT = 9

type HistoricalAutoIssuedReviewCaseState =
  | "ready_for_review"
  | "state_changed"

interface HistoricalAutoIssuedReviewCase {
  intakeId: string
  referenceNumber: string | null
  aiApprovedAt: string
  certificateCreatedAt: string | null
  state: HistoricalAutoIssuedReviewCaseState
}

export interface HistoricalAutoIssuedReviewLane {
  expectedCount: number
  cohortCount: number
  resolvedCount: number
  unresolvedCount: number
  cases: HistoricalAutoIssuedReviewCase[]
  queryFailed: boolean
}

export type HistoricalAutoIssuedReviewOpenOutcome =
  | "opened"
  | "already_resolved"
  | "case_state_changed"
  | "case_not_found"
  | "actor_not_authorized"
  | "cohort_mismatch"
  | "unavailable"

export type HistoricalAutoIssuedReviewReceiptOutcome =
  | "recorded"
  | "already_recorded"
  | "correction_started"
  | "case_not_opened"
  | "case_state_changed"
  | "case_not_found"
  | "actor_not_authorized"
  | "cohort_mismatch"

export type HistoricalAutoIssuedReviewReceiptResult =
  | { outcome: HistoricalAutoIssuedReviewReceiptOutcome; queryFailed: false }
  | { outcome: null; queryFailed: true }

const OPEN_OUTCOMES = new Set<HistoricalAutoIssuedReviewOpenOutcome>([
  "opened",
  "already_resolved",
  "case_state_changed",
  "case_not_found",
  "actor_not_authorized",
  "cohort_mismatch",
])

const RECEIPT_OUTCOMES = new Set<HistoricalAutoIssuedReviewReceiptOutcome>([
  "recorded",
  "already_recorded",
  "correction_started",
  "case_not_opened",
  "case_state_changed",
  "case_not_found",
  "actor_not_authorized",
  "cohort_mismatch",
])

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null
}

function parseCase(value: unknown): HistoricalAutoIssuedReviewCase | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.intakeId !== "string" || row.intakeId.length === 0) return null
  if (typeof row.aiApprovedAt !== "string" || row.aiApprovedAt.length === 0) return null
  if (row.state !== "ready_for_review" && row.state !== "state_changed") return null

  return {
    intakeId: row.intakeId,
    referenceNumber: typeof row.referenceNumber === "string" ? row.referenceNumber : null,
    aiApprovedAt: row.aiApprovedAt,
    certificateCreatedAt:
      typeof row.certificateCreatedAt === "string" ? row.certificateCreatedAt : null,
    state: row.state,
  }
}

export function parseHistoricalAutoIssuedReviewLane(
  value: unknown,
): HistoricalAutoIssuedReviewLane | null {
  if (!value || typeof value !== "object") return null
  const payload = value as Record<string, unknown>
  const expectedCount = integer(payload.expectedCount)
  const cohortCount = integer(payload.cohortCount)
  const resolvedCount = integer(payload.resolvedCount)
  const unresolvedCount = integer(payload.unresolvedCount)
  const rawCases = Array.isArray(payload.cases) ? payload.cases : null

  if (
    expectedCount === null
    || cohortCount === null
    || resolvedCount === null
    || unresolvedCount === null
    || rawCases === null
  ) {
    return null
  }

  const cases = rawCases.map(parseCase)
  if (cases.some((row) => row === null)) return null
  if (cohortCount !== resolvedCount + unresolvedCount) return null
  if (cases.length !== unresolvedCount) return null

  return {
    expectedCount,
    cohortCount,
    resolvedCount,
    unresolvedCount,
    cases: cases as HistoricalAutoIssuedReviewCase[],
    queryFailed:
      expectedCount !== HISTORICAL_AUTO_ISSUED_REVIEW_EXPECTED_COUNT
      || cohortCount !== expectedCount,
  }
}

export async function getHistoricalAutoIssuedReviewLane(
  supabase: SupabaseClient,
): Promise<HistoricalAutoIssuedReviewLane> {
  const { data, error } = await supabase.rpc("get_historical_auto_issued_review_lane")
  const parsed = error ? null : parseHistoricalAutoIssuedReviewLane(data)

  return parsed ?? {
    expectedCount: HISTORICAL_AUTO_ISSUED_REVIEW_EXPECTED_COUNT,
    cohortCount: 0,
    resolvedCount: 0,
    unresolvedCount: 0,
    cases: [],
    queryFailed: true,
  }
}

export function parseHistoricalAutoIssuedReviewOpenOutcome(
  value: unknown,
): HistoricalAutoIssuedReviewOpenOutcome {
  return typeof value === "string"
    && OPEN_OUTCOMES.has(value as HistoricalAutoIssuedReviewOpenOutcome)
    ? value as HistoricalAutoIssuedReviewOpenOutcome
    : "unavailable"
}

export async function openHistoricalAutoIssuedReviewCase(
  supabase: SupabaseClient,
  intakeId: string,
  actorId: string,
): Promise<HistoricalAutoIssuedReviewOpenOutcome> {
  const { data, error } = await supabase.rpc(
    "open_historical_auto_issued_review_case",
    { p_intake_id: intakeId, p_actor_id: actorId },
  )
  if (error) return "unavailable"
  return parseHistoricalAutoIssuedReviewOpenOutcome(data)
}

export function parseHistoricalAutoIssuedReviewReceiptOutcome(
  value: unknown,
): HistoricalAutoIssuedReviewReceiptOutcome | null {
  return typeof value === "string"
    && RECEIPT_OUTCOMES.has(value as HistoricalAutoIssuedReviewReceiptOutcome)
    ? value as HistoricalAutoIssuedReviewReceiptOutcome
    : null
}

export async function recordHistoricalAutoIssuedNoCorrection(
  supabase: SupabaseClient,
  intakeId: string,
  actorId: string,
): Promise<HistoricalAutoIssuedReviewReceiptResult> {
  const { data, error } = await supabase.rpc(
    "record_historical_auto_issued_no_correction",
    { p_intake_id: intakeId, p_actor_id: actorId },
  )
  const outcome = error ? null : parseHistoricalAutoIssuedReviewReceiptOutcome(data)

  return outcome
    ? { outcome, queryFailed: false }
    : { outcome: null, queryFailed: true }
}
