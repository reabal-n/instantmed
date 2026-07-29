import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  ATTRIBUTION_SOURCE_LABELS,
  ATTRIBUTION_SOURCE_ORDER,
  type AttributionClassificationInput,
  type AttributionSourceGroup,
  classifyAttributionSource,
} from "@/lib/analytics/source-classification"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"

const DAY_MS = 24 * 60 * 60 * 1000
const ATTRIBUTION_SELECT = [
  "adgroupid",
  "campaignid",
  "creative",
  "device",
  "gbraid",
  "gclid",
  "keyword",
  "landing_page",
  "matchtype",
  "network",
  "referrer",
  "utm_campaign",
  "utm_medium",
  "utm_source",
  "utm_term",
  "wbraid",
].join(", ")

interface RecordedAttributionRow {
  count: number
  group: AttributionSourceGroup
  known: boolean
  label: string
}

export interface RecordedAttributionBreakdown {
  availability: "available" | "unavailable"
  coveragePercent: number | null
  generatedAt: string
  knownCount: number | null
  paidTotal: number | null
  rows: RecordedAttributionRow[]
  windowDays: number
}

function emptyRows(): RecordedAttributionRow[] {
  return ATTRIBUTION_SOURCE_ORDER.map((group) => ({
    count: 0,
    group,
    known: !["direct", "unknown"].includes(group),
    label: ATTRIBUTION_SOURCE_LABELS[group],
  }))
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1_000) / 10
}

export function buildRecordedAttributionBreakdown(args: {
  days?: number
  now?: Date
  rows: AttributionClassificationInput[]
}): RecordedAttributionBreakdown {
  const now = args.now ?? new Date()
  const days = Math.max(1, Math.floor(args.days ?? 30))
  const counts = new Map<AttributionSourceGroup, number>()
  let knownCount = 0

  for (const row of args.rows) {
    const classification = classifyAttributionSource(row)
    counts.set(classification.group, (counts.get(classification.group) ?? 0) + 1)
    if (classification.known) knownCount += 1
  }

  return {
    availability: "available",
    coveragePercent: percentage(knownCount, args.rows.length),
    generatedAt: now.toISOString(),
    knownCount,
    paidTotal: args.rows.length,
    rows: emptyRows()
      .map((row) => ({ ...row, count: counts.get(row.group) ?? 0 }))
      .sort((left, right) => {
        const countOrder = right.count - left.count
        return countOrder || ATTRIBUTION_SOURCE_ORDER.indexOf(left.group) - ATTRIBUTION_SOURCE_ORDER.indexOf(right.group)
      }),
    windowDays: days,
  }
}

export function buildUnavailableRecordedAttributionBreakdown(
  now = new Date(),
  days = 30,
): RecordedAttributionBreakdown {
  return {
    availability: "unavailable",
    coveragePercent: null,
    generatedAt: now.toISOString(),
    knownCount: null,
    paidTotal: null,
    rows: emptyRows(),
    windowDays: days,
  }
}

/** Aggregate-only, code-side attribution for paid orders. */
export async function getRecordedAttributionBreakdown(
  supabase: SupabaseClient,
  options: { days?: number; now?: Date } = {},
): Promise<RecordedAttributionBreakdown> {
  const now = options.now ?? new Date()
  const days = Math.max(1, Math.floor(options.days ?? 30))
  const since = new Date(now.getTime() - days * DAY_MS).toISOString()

  const result = await filterReportableIntakes(supabase
    .from("intakes")
    .select(ATTRIBUTION_SELECT)
    .in("payment_status", ["paid", "partially_refunded", "refunded"])
    .not("paid_at", "is", null)
    .gte("paid_at", since)
    .lte("paid_at", now.toISOString()))

  if (result.error || !result.data) {
    return buildUnavailableRecordedAttributionBreakdown(now, days)
  }

  return buildRecordedAttributionBreakdown({
    days,
    now,
    rows: result.data as AttributionClassificationInput[],
  })
}
