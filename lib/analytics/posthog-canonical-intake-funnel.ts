import "server-only"

import {
  buildCanonicalIntakeFunnel,
  CANONICAL_INTAKE_FUNNEL_EVENTS,
  type CanonicalFunnelCoverageRow,
  type CanonicalFunnelFlowRow,
  type CanonicalIntakeFunnelSummary,
} from "@/lib/analytics/canonical-intake-funnel"

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_COHORT_DAYS = 30
const COHORT_OBSERVATION_HOURS = 24
const RECENT_COVERAGE_DAYS = 7
const POSTHOG_QUERY_TIMEOUT_MS = 6500

interface RecentFunnelCoverage {
  coveragePercent: number | null
  days: typeof RECENT_COVERAGE_DAYS
}

export type PostHogCanonicalIntakeFunnelSnapshot =
  | {
      ok: true
      queriedAt: string
      recentCoverage: RecentFunnelCoverage
      reason?: undefined
      source: "posthog"
      summary: CanonicalIntakeFunnelSummary
    }
  | {
      ok: false
      queriedAt: string
      recentCoverage: null
      reason: string
      source: "posthog"
      summary: CanonicalIntakeFunnelSummary
    }

interface Options {
  days?: number
  now?: Date
}

function normalizePostHogHost(host: string): string {
  if (host.includes("us.i.posthog.com")) return "https://us.posthog.com"
  return host.replace(/\/$/, "")
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function parseNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function parseCount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
}

function parseCoverageRows(results: unknown[][]): CanonicalFunnelCoverageRow[] {
  return results.flatMap((row) => {
    const event = parseNullableString(row[0])
    if (!event) return []
    return [{
      event,
      rawRows: parseCount(row[2]),
      withFlowId: parseCount(row[1]),
    }]
  })
}

function buildUnavailableSummary(dateFrom: string, dateTo: string): CanonicalIntakeFunnelSummary {
  return buildCanonicalIntakeFunnel({
    coverageRows: [],
    dateFrom,
    dateTo,
    flowRows: [],
  })
}

async function runHogQlQuery({
  apiKey,
  host,
  name,
  projectId,
  query,
}: {
  apiKey: string
  host: string
  name: string
  projectId: string
  query: string
}): Promise<unknown[][]> {
  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    body: JSON.stringify({
      name,
      query: {
        kind: "HogQLQuery",
        query,
      },
    }),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(POSTHOG_QUERY_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`PostHog query returned ${response.status}.`)
  }

  const payload = (await response.json().catch(() => ({}))) as { results?: unknown[][] }
  if (!Array.isArray(payload.results)) {
    throw new Error("PostHog query returned no result rows.")
  }
  return payload.results
}

export function buildUnavailablePostHogCanonicalIntakeFunnelSnapshot({
  days = DEFAULT_COHORT_DAYS,
  now = new Date(),
  reason,
}: Options & { reason: string }): PostHogCanonicalIntakeFunnelSnapshot {
  const normalizedDays = Math.min(Math.max(Math.floor(days), 1), 90)
  const cohortEnd = new Date(now.getTime() - COHORT_OBSERVATION_HOURS * 60 * 60 * 1000)
  const cohortStart = new Date(cohortEnd.getTime() - normalizedDays * DAY_MS)
  return {
    ok: false,
    queriedAt: now.toISOString(),
    recentCoverage: null,
    reason,
    source: "posthog",
    summary: buildUnavailableSummary(cohortStart.toISOString(), cohortEnd.toISOString()),
  }
}

export async function getPostHogCanonicalIntakeFunnelSnapshot(
  options: Options = {},
): Promise<PostHogCanonicalIntakeFunnelSnapshot> {
  const days = Math.min(Math.max(Math.floor(options.days ?? DEFAULT_COHORT_DAYS), 1), 90)
  const now = options.now ?? new Date()
  const cohortEnd = new Date(now.getTime() - COHORT_OBSERVATION_HOURS * 60 * 60 * 1000)
  const cohortStart = new Date(cohortEnd.getTime() - days * DAY_MS)
  const dateFrom = cohortStart.toISOString()
  const dateTo = cohortEnd.toISOString()
  const observationEnd = now.toISOString()
  const recentCoverageFrom = new Date(
    now.getTime() - RECENT_COVERAGE_DAYS * DAY_MS,
  ).toISOString()

  const apiKey = process.env.POSTHOG_PROJECT_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  if (!apiKey || !projectId) {
    return buildUnavailablePostHogCanonicalIntakeFunnelSnapshot({
      days,
      now,
      reason: "PostHog project API is not configured.",
    })
  }

  const host = normalizePostHogHost(
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
  )
  const eventList = CANONICAL_INTAKE_FUNNEL_EVENTS.map(sqlString).join(", ")
  const commonWhere = `
    timestamp >= toDateTime('${dateFrom}')
    AND timestamp <= toDateTime('${observationEnd}')
    AND event IN (${eventList})
    AND (properties.is_e2e IS NULL OR properties.is_e2e != true)
  `
  const cohortQuery = `
    SELECT
      toString(properties.flow_instance_id) AS flow_instance_id,
      minIf(timestamp, event = 'intake_started') AS started_at,
      minIf(timestamp, event = 'checkout_viewed') AS checkout_viewed_at,
      minIf(timestamp, event = 'intake_funnel_payment_initiated') AS payment_initiated_at,
      minIf(timestamp, event = 'purchase_completed_server') AS paid_at
    FROM events
    WHERE ${commonWhere}
      AND notEmpty(toString(properties.flow_instance_id))
    GROUP BY flow_instance_id
    HAVING started_at >= toDateTime('${dateFrom}')
      AND started_at <= toDateTime('${dateTo}')
    LIMIT 50000
  `
  const coverageQuery = `
    SELECT
      event,
      countIf(notEmpty(toString(properties.flow_instance_id))) AS with_flow_id,
      count() AS raw_rows
    FROM events
    WHERE ${commonWhere}
    GROUP BY event
  `
  const recentCoverageQuery = `
    SELECT
      event,
      countIf(notEmpty(toString(properties.flow_instance_id))) AS with_flow_id,
      count() AS raw_rows
    FROM events
    WHERE timestamp >= toDateTime('${recentCoverageFrom}')
      AND timestamp <= toDateTime('${observationEnd}')
      AND event IN (${eventList})
      AND (properties.is_e2e IS NULL OR properties.is_e2e != true)
    GROUP BY event
  `

  try {
    const [cohortResults, coverageResults, recentCoverageResults] = await Promise.all([
      runHogQlQuery({
        apiKey,
        host,
        name: `InstantMed canonical start cohort ${days}d`,
        projectId,
        query: cohortQuery,
      }),
      runHogQlQuery({
        apiKey,
        host,
        name: `InstantMed flow ID coverage ${days}d`,
        projectId,
        query: coverageQuery,
      }),
      runHogQlQuery({
        apiKey,
        host,
        name: `InstantMed flow ID coverage recent ${RECENT_COVERAGE_DAYS}d`,
        projectId,
        query: recentCoverageQuery,
      }).catch(() => null),
    ])

    const flowRows: CanonicalFunnelFlowRow[] = cohortResults.flatMap((row) => {
      const flowInstanceId = parseNullableString(row[0])
      if (!flowInstanceId) return []
      return [{
        checkoutViewedAt: parseNullableString(row[2]),
        flowInstanceId,
        paidAt: parseNullableString(row[4]),
        paymentInitiatedAt: parseNullableString(row[3]),
        startedAt: parseNullableString(row[1]),
      }]
    })
    const coverageRows = parseCoverageRows(coverageResults)
    const recentCoveragePercent = recentCoverageResults === null
      ? null
      : buildCanonicalIntakeFunnel({
          coverageRows: parseCoverageRows(recentCoverageResults),
          dateFrom: recentCoverageFrom,
          dateTo: observationEnd,
          flowRows: [],
        }).coveragePercent

    return {
      ok: true,
      queriedAt: now.toISOString(),
      recentCoverage: {
        coveragePercent: recentCoveragePercent,
        days: RECENT_COVERAGE_DAYS,
      },
      source: "posthog",
      summary: buildCanonicalIntakeFunnel({
        coverageRows,
        dateFrom,
        dateTo,
        flowRows,
      }),
    }
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError"
      ? "PostHog query timed out."
      : error instanceof Error
        ? error.message
        : "PostHog query failed."
    return buildUnavailablePostHogCanonicalIntakeFunnelSnapshot({ days, now, reason })
  }
}
