import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  AdsAgentSnapshot,
  AdsRecommendation,
} from "@/lib/ads-agent/types"

const SYDNEY_TIME_ZONE = "Australia/Sydney"
const RUN_LEASE_MINUTES = 30

const sydneyHourFormatter = new Intl.DateTimeFormat("en-AU", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone: SYDNEY_TIME_ZONE,
})

export type AdsAgentRunStatus =
  | "running"
  | "delivered"
  | "failed"
  | "skipped"

export interface AdsAgentRunRecord {
  errorCode: string | null
  id: string
  reportDate: string
  startedAt: string
  status: AdsAgentRunStatus
  updatedAt: string
}

export interface DeliveredAdsAgentRunEvidence {
  deliveredAt: string
  id: string
  recommendations: AdsRecommendation[]
  reportDate: string
  snapshot: AdsAgentSnapshot
}

export type LatestDeliveredAdsAgentRunRead =
  | {
      availability: "available"
      reason: null
      run: DeliveredAdsAgentRunEvidence
    }
  | {
      availability: "unavailable"
      reason: "invalid_record" | "not_found" | "query_failed"
      run: null
    }

interface StoredDeliveredAdsAgentRun {
  delivered_at: unknown
  id: unknown
  recommendation: unknown
  report_date: unknown
  snapshot: unknown
}

interface StoredAdsAgentRun {
  error_code: string | null
  id: string
  report_date: string
  started_at: string
  status: AdsAgentRunStatus
  updated_at: string
}

export type ExistingRunClaimDisposition =
  | "retry"
  | "skip_ambiguous"
  | "skip_delivered"
  | "skip_running"

export type DailyAdsAgentRunClaim =
  | {
      claimed: true
      run: AdsAgentRunRecord
    }
  | {
      claimed: false
      reason:
        | "already_delivered"
        | "delivery_ambiguous"
        | "run_in_progress"
        | "claim_race_lost"
      run: AdsAgentRunRecord
    }

function toRunRecord(row: StoredAdsAgentRun): AdsAgentRunRecord {
  return {
    errorCode: row.error_code,
    id: row.id,
    reportDate: row.report_date,
    startedAt: row.started_at,
    status: row.status,
    updatedAt: row.updated_at,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isAdsRecommendation(value: unknown): value is AdsRecommendation {
  if (!isRecord(value)) return false
  return (
    ["HOLD", "INVESTIGATE", "APPROVAL_NEEDED"].includes(String(value.kind)) &&
    Array.isArray(value.reasonCodes) &&
    value.reasonCodes.every((reason) => typeof reason === "string") &&
    typeof value.service === "string"
  )
}

function isAdsAgentSnapshot(value: unknown): value is AdsAgentSnapshot {
  if (!isRecord(value) || !isRecord(value.tracking)) return false
  return (
    typeof value.generatedAt === "string" &&
    Number.isFinite(Date.parse(value.generatedAt)) &&
    typeof value.reportDate === "string" &&
    Array.isArray(value.rolling30) &&
    ["GREEN", "AMBER", "RED"].includes(String(value.tracking.state)) &&
    typeof value.tracking.evidenceAsOf === "string" &&
    Array.isArray(value.tracking.reasonCodes)
  )
}

export function parseDeliveredAdsAgentRun(
  value: unknown,
): DeliveredAdsAgentRunEvidence | null {
  if (!isRecord(value)) return null
  const row = value as unknown as StoredDeliveredAdsAgentRun
  if (
    typeof row.id !== "string" ||
    typeof row.report_date !== "string" ||
    typeof row.delivered_at !== "string" ||
    !Number.isFinite(Date.parse(row.delivered_at)) ||
    !isAdsAgentSnapshot(row.snapshot) ||
    !Array.isArray(row.recommendation) ||
    !row.recommendation.every(isAdsRecommendation)
  ) {
    return null
  }

  return {
    deliveredAt: row.delivered_at,
    id: row.id,
    recommendations: row.recommendation,
    reportDate: row.report_date,
    snapshot: row.snapshot,
  }
}

/**
 * Read-only evidence seam for the Business surface. The page consumes the
 * latest report that was actually delivered to the operator; it never builds
 * a fresh snapshot (which can refresh the Stripe fee cache) during rendering.
 */
export async function getLatestDeliveredAdsAgentRun(
  supabase: SupabaseClient,
): Promise<LatestDeliveredAdsAgentRunRead> {
  const result = await supabase
    .from("google_ads_agent_runs")
    .select("id, report_date, delivered_at, snapshot, recommendation")
    .eq("status", "delivered")
    .not("delivered_at", "is", null)
    .order("delivered_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (result.error) {
    return { availability: "unavailable", reason: "query_failed", run: null }
  }
  if (!result.data) {
    return { availability: "unavailable", reason: "not_found", run: null }
  }

  const run = parseDeliveredAdsAgentRun(result.data)
  return run
    ? { availability: "available", reason: null, run }
    : { availability: "unavailable", reason: "invalid_record", run: null }
}

/** One closed Sydney day of delivered ads evidence, keyed by that day. */
export interface AdsDailySpendDay {
  clicks: number | null
  dateKey: string
  deliveredAt: string
  reportDate: string
  spendCents: number
}

export type RecentDeliveredAdsDailySpendRead =
  | { availability: "available"; days: AdsDailySpendDay[] }
  | { availability: "unavailable"; days: AdsDailySpendDay[]; reason: "query_failed" }

function portfolioMetric(
  totals: unknown,
  field: "spendCents" | "clicks",
): number | null {
  if (!isRecord(totals)) return null
  let sum = 0
  for (const bucket of ["enabled", "paused", "other"]) {
    const portfolio = totals[bucket]
    if (!isRecord(portfolio)) return null
    const value = portfolio[field]
    if (typeof value !== "number" || !Number.isFinite(value)) return null
    sum += value
  }
  return sum
}

/**
 * Daily ads-spend ledger assembled from delivered immutable agent runs. Each
 * run's `totals.daily` covers exactly one closed Sydney day, so the delivered
 * history doubles as a per-day spend series without ever calling Google on
 * page load. Days whose spend evidence is null are omitted — unknown is not
 * zero — and callers surface coverage instead of interpolating.
 */
export async function getRecentDeliveredAdsAgentRunDailySpend(
  supabase: SupabaseClient,
  options?: { limit?: number },
): Promise<RecentDeliveredAdsDailySpendRead> {
  const limit = Math.max(1, Math.min(90, options?.limit ?? 35))
  const result = await supabase
    .from("google_ads_agent_runs")
    .select(
      "report_date, delivered_at, daily_totals:snapshot->totals->daily, daily_window:snapshot->windows->daily",
    )
    .eq("status", "delivered")
    .not("delivered_at", "is", null)
    .order("report_date", { ascending: false })
    .limit(limit)

  if (result.error) {
    return { availability: "unavailable", days: [], reason: "query_failed" }
  }

  const days = new Map<string, AdsDailySpendDay>()
  for (const row of result.data ?? []) {
    if (!isRecord(row)) continue
    const window = row.daily_window
    if (!isRecord(window)) continue
    const dateKey = window.startDate
    // Only single-closed-day windows may enter the ledger; anything wider
    // cannot be attributed to one day.
    if (typeof dateKey !== "string" || dateKey.length === 0 || window.endDate !== dateKey) {
      continue
    }
    const spendCents = portfolioMetric(row.daily_totals, "spendCents")
    if (spendCents === null) continue
    if (
      days.has(dateKey) ||
      typeof row.report_date !== "string" ||
      typeof row.delivered_at !== "string"
    ) {
      continue
    }
    days.set(dateKey, {
      clicks: portfolioMetric(row.daily_totals, "clicks"),
      dateKey,
      deliveredAt: row.delivered_at,
      reportDate: row.report_date,
      spendCents,
    })
  }

  return { availability: "available", days: [...days.values()] }
}

export function isSydneyDailyAdsBriefHour(now = new Date()): boolean {
  if (!Number.isFinite(now.getTime())) return false
  const values = new Map(
    sydneyHourFormatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  )
  return values.get("hour") === 9
}

export function getExistingRunClaimDisposition(
  run: {
    errorCode?: string | null
    startedAt: string
    status: AdsAgentRunStatus
  },
  now = new Date(),
): ExistingRunClaimDisposition {
  if (run.status === "delivered") return "skip_delivered"
  if (
    run.errorCode === "telegram_delivery_receipt_ambiguous"
    || run.errorCode === "telegram_delivery_status_ambiguous"
  ) {
    return "skip_ambiguous"
  }
  if (run.status !== "running") return "retry"

  const startedAt = Date.parse(run.startedAt)
  if (!Number.isFinite(startedAt)) return "retry"
  const leaseMs = RUN_LEASE_MINUTES * 60 * 1000
  return now.getTime() - startedAt >= leaseMs ? "retry" : "skip_running"
}

export async function claimDailyAdsAgentRun(args: {
  now?: Date
  reportDate: string
  supabase: SupabaseClient
}): Promise<DailyAdsAgentRunClaim> {
  const now = args.now ?? new Date()
  const timestamp = now.toISOString()
  const inserted = await args.supabase
    .from("google_ads_agent_runs")
    .insert({
      report_date: args.reportDate,
      started_at: timestamp,
      status: "running",
      updated_at: timestamp,
    })
    .select(
      "id, report_date, status, error_code, started_at, updated_at",
    )
    .single()

  if (!inserted.error && inserted.data) {
    return {
      claimed: true,
      run: toRunRecord(inserted.data as StoredAdsAgentRun),
    }
  }
  if (inserted.error?.code !== "23505") {
    throw new Error(
      `google_ads_agent_run_insert_failed:${inserted.error?.code || "unknown"}`,
    )
  }

  const existingResult = await args.supabase
    .from("google_ads_agent_runs")
    .select("id, report_date, status, error_code, started_at, updated_at")
    .eq("report_date", args.reportDate)
    .maybeSingle()
  if (existingResult.error || !existingResult.data) {
    throw new Error(
      `google_ads_agent_run_read_failed:${existingResult.error?.code || "missing"}`,
    )
  }

  const existing = existingResult.data as StoredAdsAgentRun
  const disposition = getExistingRunClaimDisposition({
    errorCode: existing.error_code,
    startedAt: existing.started_at,
    status: existing.status,
  }, now)
  if (disposition !== "retry") {
    const reason = disposition === "skip_delivered"
      ? "already_delivered"
      : disposition === "skip_ambiguous"
        ? "delivery_ambiguous"
        : "run_in_progress"
    return {
      claimed: false,
      reason,
      run: toRunRecord(existing),
    }
  }

  const retryQuery = args.supabase
    .from("google_ads_agent_runs")
    .update({
      completed_at: null,
      delivered_at: null,
      error_code: null,
      started_at: timestamp,
      status: "running",
      telegram_message_id: null,
      updated_at: timestamp,
    })
    .eq("id", existing.id)
    .eq("status", existing.status)
  const guardedRetryQuery = existing.updated_at
    ? retryQuery.eq("updated_at", existing.updated_at)
    : retryQuery.is("updated_at", null)
  const retried = await guardedRetryQuery
    .select("id, report_date, status, error_code, started_at, updated_at")
    .maybeSingle()

  if (retried.error) {
    throw new Error(
      `google_ads_agent_run_retry_failed:${retried.error.code || "unknown"}`,
    )
  }
  if (!retried.data) {
    return {
      claimed: false,
      reason: "claim_race_lost",
      run: toRunRecord(existing),
    }
  }

  return {
    claimed: true,
    run: toRunRecord(retried.data as StoredAdsAgentRun),
  }
}

export async function markDailyAdsAgentRunPrepared(args: {
  recommendations: AdsRecommendation[]
  runId: string
  snapshot: AdsAgentSnapshot
  supabase: SupabaseClient
}): Promise<void> {
  const result = await args.supabase
    .from("google_ads_agent_runs")
    .update({
      recommendation: args.recommendations,
      snapshot: args.snapshot,
      tracking_state: args.snapshot.tracking.state,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.runId)
    .eq("status", "running")
    .select("id")
    .maybeSingle()

  if (result.error || !result.data) {
    throw new Error(
      `google_ads_agent_run_prepare_failed:${result.error?.code || "cas_miss"}`,
    )
  }
}

export async function markDailyAdsAgentRunDelivered(args: {
  recommendations: AdsRecommendation[]
  runId: string
  snapshot: AdsAgentSnapshot
  supabase: SupabaseClient
  telegramMessageId: number
}): Promise<void> {
  const now = new Date().toISOString()
  const result = await args.supabase
    .from("google_ads_agent_runs")
    .update({
      completed_at: now,
      delivered_at: now,
      error_code: null,
      recommendation: args.recommendations,
      snapshot: args.snapshot,
      status: "delivered",
      telegram_message_id: args.telegramMessageId,
      tracking_state: args.snapshot.tracking.state,
      updated_at: now,
    })
    .eq("id", args.runId)
    .eq("status", "running")
    .select("id")
    .maybeSingle()

  if (result.error || !result.data) {
    throw new Error(
      `google_ads_agent_run_delivery_receipt_failed:${result.error?.code || "cas_miss"}`,
    )
  }
}

export async function markDailyAdsAgentRunFailed(args: {
  errorCode: string
  runId: string
  supabase: SupabaseClient
}): Promise<void> {
  const now = new Date().toISOString()
  const errorCode = args.errorCode
    .replace(/[^a-z0-9_:-]/gi, "_")
    .slice(0, 96)
  const result = await args.supabase
    .from("google_ads_agent_runs")
    .update({
      completed_at: now,
      error_code: errorCode || "unknown",
      status: "failed",
      updated_at: now,
    })
    .eq("id", args.runId)
    .eq("status", "running")
    .select("id")
    .maybeSingle()

  if (result.error || !result.data) {
    throw new Error(
      `google_ads_agent_run_failure_receipt_failed:${result.error?.code || "cas_miss"}`,
    )
  }
}
