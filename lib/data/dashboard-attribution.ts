import "server-only"

import {
  ATTRIBUTION_SOURCE_LABELS,
  type AttributionSourceGroup,
  classifyAttributionSource,
} from "@/lib/analytics/source-classification"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("dashboard-attribution")

export interface AttributionSourceBreakdownRow {
  group: AttributionSourceGroup
  label: string
  count: number
  /** Share of the total, as a fraction 0-1. */
  share: number
}

export interface AttributionSourceBreakdown {
  windowDays: number
  totalIntakes: number
  topSources: AttributionSourceBreakdownRow[]
}

const WINDOW_DAYS = 30
const TOP_N = 5

const EMPTY_BREAKDOWN: AttributionSourceBreakdown = {
  windowDays: WINDOW_DAYS,
  totalIntakes: 0,
  topSources: [],
}

/**
 * Top attribution sources for paid intakes in the last N days, classified
 * into the canonical 9-group taxonomy. Returns sorted descending by count.
 * Admin-only data; the caller is responsible for role-gating.
 *
 * Excludes seeded E2E test data. Returns an empty breakdown when there are
 * no paid intakes in the window so the rendering tile can self-hide.
 */
export async function getAttributionSourceBreakdown(): Promise<AttributionSourceBreakdown> {
  const supabase = createServiceRoleClient()
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const query = supabase
    .from("intakes")
    .select(
      "utm_source, utm_medium, utm_campaign, utm_term, gclid, gbraid, wbraid, campaignid, adgroupid, keyword, creative, matchtype, device, network, referrer, landing_page",
    )
    .gte("paid_at", windowStart)
    .not("paid_at", "is", null)

  const { data, error } = await filterSeededE2EIntakes(query)

  if (error || !data) {
    if (error) logger.error("Failed to fetch attribution breakdown", {}, error)
    return EMPTY_BREAKDOWN
  }

  if (data.length === 0) {
    return EMPTY_BREAKDOWN
  }

  const counts = new Map<AttributionSourceGroup, number>()
  for (const row of data) {
    const { group } = classifyAttributionSource(row)
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }

  const total = data.length
  const topSources: AttributionSourceBreakdownRow[] = Array.from(counts.entries())
    .map(([group, count]) => ({
      group,
      label: ATTRIBUTION_SOURCE_LABELS[group],
      count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N)

  return { windowDays: WINDOW_DAYS, totalIntakes: total, topSources }
}
