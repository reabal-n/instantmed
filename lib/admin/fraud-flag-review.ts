import type { SupabaseClient } from "@supabase/supabase-js"

const FRAUD_FLAG_REVIEW_LIMIT = 20

const FRAUD_FLAG_TYPES = [
  "multiple_daily",
  "suspicious_medicare",
  "rapid_completion",
  "duplicate_request",
  "duplicate_medication",
  "rolling_window_abuse",
  "chat_restart_abuse",
  "injection_attempt",
  "soft_flag",
] as const

const FRAUD_FLAG_SEVERITIES = ["low", "medium", "high", "critical"] as const

export type FraudFlagReviewOutcome = "reviewed" | "dismissed"
export type FraudFlagReviewType = (typeof FRAUD_FLAG_TYPES)[number] | "unknown_signal"
type FraudFlagReviewSeverity = (typeof FRAUD_FLAG_SEVERITIES)[number] | "unknown"

interface FraudFlagReviewItem {
  createdAt: string | null
  flagId: string
  flagType: FraudFlagReviewType
  intakeId: string | null
  severity: FraudFlagReviewSeverity
}

export interface FraudFlagReviewQueue {
  coverageCapped: boolean
  items: FraudFlagReviewItem[]
  openCount: number
  queryFailed: boolean
}

function normalizeType(value: string | null): FraudFlagReviewType {
  return FRAUD_FLAG_TYPES.includes(value as (typeof FRAUD_FLAG_TYPES)[number])
    ? value as (typeof FRAUD_FLAG_TYPES)[number]
    : "unknown_signal"
}

function normalizeSeverity(value: string | null): FraudFlagReviewSeverity {
  return FRAUD_FLAG_SEVERITIES.includes(value as (typeof FRAUD_FLAG_SEVERITIES)[number])
    ? value as (typeof FRAUD_FLAG_SEVERITIES)[number]
    : "unknown"
}

export async function getOpenFraudFlagReviewQueue(
  supabase: SupabaseClient,
  options: { limit?: number } = {},
): Promise<FraudFlagReviewQueue> {
  const limit = Math.max(1, Math.min(options.limit ?? FRAUD_FLAG_REVIEW_LIMIT, 100))
  const { data, count, error } = await supabase
    .from("fraud_flags")
    .select("id, intake_id, flag_type, severity, created_at", { count: "exact" })
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error || count === null) {
    return { coverageCapped: false, items: [], openCount: 0, queryFailed: true }
  }

  const items = ((data ?? []) as Array<{
    created_at: string | null
    flag_type: string | null
    id: string
    intake_id: string | null
    severity: string | null
  }>).map((row) => ({
    createdAt: row.created_at,
    flagId: row.id,
    flagType: normalizeType(row.flag_type),
    intakeId: row.intake_id,
    severity: normalizeSeverity(row.severity),
  }))

  return {
    coverageCapped: count > items.length,
    items,
    openCount: count,
    queryFailed: false,
  }
}

export async function resolveFraudFlagReview(
  supabase: SupabaseClient,
  flagId: string,
  actorId: string,
  outcome: FraudFlagReviewOutcome,
): Promise<{ outcome: "resolved" | "not_open"; queryFailed: boolean }> {
  const { data, error } = await supabase
    .from("fraud_flags")
    .update({
      status: outcome,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorId,
    })
    .eq("id", flagId)
    .eq("status", "open")
    .select("id")
    .maybeSingle()

  if (error) return { outcome: "not_open", queryFailed: true }
  return { outcome: data ? "resolved" : "not_open", queryFailed: false }
}
