import "server-only"

import { DECLINE_REASONS } from "@/lib/doctor/decline-reasons"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("dashboard-decline-trends")

export interface DeclineReasonRow {
  /** Canonical reason code from the decline_reason_code column. */
  code: string
  /** Friendly label derived from the canonical template registry, or
   * humanised from the raw code if it's a non-standard string. */
  label: string
  count: number
}

export interface DeclineReasonBreakdown {
  windowDays: number
  totalDeclines: number
  topReasons: DeclineReasonRow[]
}

const WINDOW_DAYS = 30
const TOP_N = 5

const EMPTY_BREAKDOWN: DeclineReasonBreakdown = {
  windowDays: WINDOW_DAYS,
  totalDeclines: 0,
  topReasons: [],
}

/**
 * Lookup of canonical reason code → patient-facing label. Same source the
 * doctor decline dialog renders from so the dashboard tile and the doctor
 * surface never disagree about wording.
 */
const REASON_LABEL_BY_CODE = new Map<string, string>(
  DECLINE_REASONS.map((reason) => [reason.code, reason.label]),
)

function humaniseReasonCode(code: string): string {
  return code
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function labelForCode(code: string): string {
  return REASON_LABEL_BY_CODE.get(code) ?? humaniseReasonCode(code)
}

/**
 * Top decline reasons in the last N days, grouped by `decline_reason_code`
 * and ranked descending by frequency. Returns an empty breakdown when there
 * are no declines in the window so the rendering tile can self-hide.
 *
 * Admin-only data; the caller is responsible for role-gating.
 */
export async function getDeclineReasonBreakdown(): Promise<DeclineReasonBreakdown> {
  const supabase = createServiceRoleClient()
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select("decline_reason_code, decline_reason")
    .eq("status", "declined")
    .gte("declined_at", windowStart)

  if (error || !data) {
    if (error) logger.error("Failed to fetch decline reason breakdown", {}, error)
    return EMPTY_BREAKDOWN
  }

  if (data.length === 0) {
    return EMPTY_BREAKDOWN
  }

  const counts = new Map<string, number>()
  for (const row of data) {
    const code =
      (row.decline_reason_code as string | null)?.trim() ||
      (row.decline_reason as string | null)?.trim() ||
      "other"
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }

  const topReasons: DeclineReasonRow[] = Array.from(counts.entries())
    .map(([code, count]) => ({ code, label: labelForCode(code), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N)

  return {
    windowDays: WINDOW_DAYS,
    totalDeclines: data.length,
    topReasons,
  }
}
