import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { SEEDED_E2E_PATIENT_PROFILE_IDS } from "@/lib/data/seeded-e2e-data"

const REVIEW_REQUEST_FUNNEL_WINDOW_DAYS = 30
export const PRODUCT_REVIEW_TOTAL_METRIC_NAME = "productreview_review_total"

const DAY_MS = 24 * 60 * 60 * 1000
const EXTERNAL_SNAPSHOT_STALE_DAYS = 14

export type ReviewRequestFunnelStatus = "degraded" | "no_sends" | "baseline" | "live"
export type ProductReviewSnapshotStatus = "due" | "baseline" | "live" | "stale" | "degraded"

interface ReviewRequestFunnelAxis {
  status: ReviewRequestFunnelStatus
  eligible: number | null
  sent: number | null
  delivered: number | null
  trackableSent: number | null
  uniqueRedirectTraversals: number | null
  /** Unique redirect traversals divided by trackable sends, never all sends. */
  traversalRate: number | null
}

interface ProductReviewSnapshotAxis {
  status: ProductReviewSnapshotStatus
  total: number | null
  delta: number | null
  baselineTotal: number | null
  latestRecordedAt: string | null
}

export interface ReviewRequestFunnelSnapshot {
  generatedAt: string
  windowStart: string
  windowEnd: string
  windowDays: typeof REVIEW_REQUEST_FUNNEL_WINDOW_DAYS
  funnel: ReviewRequestFunnelAxis
  external: ProductReviewSnapshotAxis
}

interface FunnelRpcRow {
  eligible: number
  sent: number
  delivered: number
  trackableSent: number
  uniqueRedirectTraversals: number
}

interface ExternalMetricRow {
  total: number
  recordedAt: string
}

const DEGRADED_FUNNEL: ReviewRequestFunnelAxis = {
  status: "degraded",
  eligible: null,
  sent: null,
  delivered: null,
  trackableSent: null,
  uniqueRedirectTraversals: null,
  traversalRate: null,
}

const DEGRADED_EXTERNAL: ProductReviewSnapshotAxis = {
  status: "degraded",
  total: null,
  delta: null,
  baselineTotal: null,
  latestRecordedAt: null,
}

export function buildDegradedReviewRequestFunnelSnapshot(
  now = new Date(),
): ReviewRequestFunnelSnapshot {
  const windowEnd = now.toISOString()
  const windowStart = new Date(
    now.getTime() - REVIEW_REQUEST_FUNNEL_WINDOW_DAYS * DAY_MS,
  ).toISOString()

  return {
    generatedAt: windowEnd,
    windowStart,
    windowEnd,
    windowDays: REVIEW_REQUEST_FUNNEL_WINDOW_DAYS,
    funnel: { ...DEGRADED_FUNNEL },
    external: { ...DEGRADED_EXTERNAL },
  }
}

function parseNonNegativeInteger(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function parseFunnelRow(value: unknown): FunnelRpcRow | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const eligible = parseNonNegativeInteger(row.eligible)
  const sent = parseNonNegativeInteger(row.sent)
  const delivered = parseNonNegativeInteger(row.delivered)
  const trackableSent = parseNonNegativeInteger(row.trackable_sent)
  const uniqueRedirectTraversals = parseNonNegativeInteger(row.unique_redirect_traversals)

  if (
    eligible === null ||
    sent === null ||
    delivered === null ||
    trackableSent === null ||
    uniqueRedirectTraversals === null ||
    sent > eligible ||
    delivered > sent ||
    trackableSent > sent ||
    uniqueRedirectTraversals > trackableSent
  ) {
    return null
  }

  return { eligible, sent, delivered, trackableSent, uniqueRedirectTraversals }
}

function buildFunnelAxis(value: unknown, hasError: boolean): ReviewRequestFunnelAxis {
  if (hasError) return DEGRADED_FUNNEL
  const row = parseFunnelRow(value)
  if (!row) return DEGRADED_FUNNEL

  const status: ReviewRequestFunnelStatus = row.sent === 0
    ? "no_sends"
    : row.trackableSent === 0
      ? "baseline"
      : "live"

  return {
    status,
    ...row,
    traversalRate: row.trackableSent > 0
      ? Math.round((row.uniqueRedirectTraversals / row.trackableSent) * 1_000) / 10
      : null,
  }
}

function parseExternalRows(value: unknown): ExternalMetricRow[] | null {
  if (!Array.isArray(value)) return null

  const parsed = value.map((item): ExternalMetricRow | null => {
    if (!item || typeof item !== "object") return null
    const row = item as Record<string, unknown>
    const total = parseNonNegativeInteger(row.metric_value)
    const recordedAt = typeof row.recorded_at === "string" ? row.recorded_at : null
    const recordedAtMs = recordedAt ? Date.parse(recordedAt) : Number.NaN
    if (total === null || !Number.isFinite(recordedAtMs)) return null
    return { total, recordedAt: new Date(recordedAtMs).toISOString() }
  })

  if (parsed.some((row) => row === null)) return null
  const deduped = Array.from(
    new Map(
      (parsed as ExternalMetricRow[]).map((row) => [
        `${row.recordedAt}:${row.total}`,
        row,
      ]),
    ).values(),
  )
  return deduped.sort(
    (left, right) => Date.parse(left.recordedAt) - Date.parse(right.recordedAt),
  )
}

function buildExternalAxis(
  value: unknown,
  hasError: boolean,
  now: Date,
): ProductReviewSnapshotAxis {
  if (hasError) return DEGRADED_EXTERNAL
  const rows = parseExternalRows(value)
  if (!rows) return DEGRADED_EXTERNAL

  if (rows.length === 0) {
    return {
      status: "due",
      total: null,
      delta: null,
      baselineTotal: null,
      latestRecordedAt: null,
    }
  }

  const latest = rows.at(-1)!
  const stale = now.getTime() - Date.parse(latest.recordedAt) > EXTERNAL_SNAPSHOT_STALE_DAYS * DAY_MS
  if (rows.length === 1) {
    return {
      status: stale ? "stale" : "baseline",
      total: latest.total,
      delta: null,
      baselineTotal: latest.total,
      latestRecordedAt: latest.recordedAt,
    }
  }

  const baseline = rows[0]
  return {
    status: stale ? "stale" : "live",
    total: latest.total,
    delta: latest.total - baseline.total,
    baselineTotal: baseline.total,
    latestRecordedAt: latest.recordedAt,
  }
}

/**
 * Aggregate-only review acquisition read model.
 *
 * The email funnel and manually verified external total intentionally fail
 * independently. A query error is rendered as unavailable, never as zero.
 */
export async function getReviewRequestFunnelSnapshot(
  supabase: Pick<SupabaseClient, "rpc" | "from">,
  now = new Date(),
): Promise<ReviewRequestFunnelSnapshot> {
  const windowEnd = now.toISOString()
  const windowStart = new Date(
    now.getTime() - REVIEW_REQUEST_FUNNEL_WINDOW_DAYS * DAY_MS,
  ).toISOString()

  const [funnelRead, baselineRead, latestRead] = await Promise.allSettled([
    Promise.resolve().then(() => supabase
      .rpc("get_review_request_funnel", {
        p_window_start: windowStart,
        p_as_of: windowEnd,
        p_excluded_patient_ids: [...SEEDED_E2E_PATIENT_PROFILE_IDS],
      })
      .single()),
    Promise.resolve().then(() => supabase
      .from("operational_metrics")
      .select("metric_value, recorded_at")
      .eq("metric_name", PRODUCT_REVIEW_TOTAL_METRIC_NAME)
      .order("recorded_at", { ascending: true })
      .limit(1)),
    Promise.resolve().then(() => supabase
      .from("operational_metrics")
      .select("metric_value, recorded_at")
      .eq("metric_name", PRODUCT_REVIEW_TOTAL_METRIC_NAME)
      .order("recorded_at", { ascending: false })
      .limit(1)),
  ])

  const funnelResult = funnelRead.status === "fulfilled" ? funnelRead.value : null
  const baselineResult = baselineRead.status === "fulfilled" ? baselineRead.value : null
  const latestResult = latestRead.status === "fulfilled" ? latestRead.value : null
  const externalData = Array.isArray(baselineResult?.data) && Array.isArray(latestResult?.data)
    ? [...baselineResult.data, ...latestResult.data]
    : null
  const externalHasError = baselineRead.status === "rejected" ||
    latestRead.status === "rejected" ||
    Boolean(baselineResult?.error) ||
    Boolean(latestResult?.error)

  return {
    generatedAt: windowEnd,
    windowStart,
    windowEnd,
    windowDays: REVIEW_REQUEST_FUNNEL_WINDOW_DAYS,
    funnel: buildFunnelAxis(
      funnelResult?.data,
      funnelRead.status === "rejected" || Boolean(funnelResult?.error),
    ),
    external: buildExternalAxis(
      externalData,
      externalHasError,
      now,
    ),
  }
}
