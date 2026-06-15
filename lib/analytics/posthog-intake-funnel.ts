import "server-only"

import {
  buildIntakeFunnelSummary,
  type IntakeFunnelAggregateRow,
  type IntakeFunnelSummary,
  POSTHOG_INTAKE_FUNNEL_EVENT_NAMES,
} from "@/lib/analytics/intake-funnel-summary"

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_DAYS = 30
const POSTHOG_QUERY_TIMEOUT_MS = 3500

export type PostHogIntakeFunnelSnapshot =
  | {
      ok: true
      reason?: undefined
      skipped?: false
      source: "posthog"
      status: number
      summary: IntakeFunnelSummary
    }
  | {
      ok: false
      reason: string
      skipped: true
      source: "posthog"
      status?: number
      summary: IntakeFunnelSummary
    }

interface GetPostHogIntakeFunnelOptions {
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

function parseCount(value: unknown): number {
  const count = Number(value ?? 0)
  return Number.isFinite(count) ? Math.round(count) : 0
}

function parseNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function parseStepIndex(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function emptySummary({
  dateFrom,
  dateTo,
  days,
}: {
  dateFrom: string
  dateTo: string
  days: number
}) {
  return buildIntakeFunnelSummary({
    dateFrom,
    dateTo,
    days,
    rows: [],
  })
}

function skippedSnapshot({
  dateFrom,
  dateTo,
  days,
  reason,
  status,
}: {
  dateFrom: string
  dateTo: string
  days: number
  reason: string
  status?: number
}): PostHogIntakeFunnelSnapshot {
  return {
    ok: false,
    reason,
    skipped: true,
    source: "posthog",
    status,
    summary: emptySummary({ dateFrom, dateTo, days }),
  }
}

export function buildSkippedPostHogIntakeFunnelSnapshot({
  days = DEFAULT_DAYS,
  now = new Date(),
  reason,
}: {
  days?: number
  now?: Date
  reason: string
}): PostHogIntakeFunnelSnapshot {
  const normalizedDays = Math.min(Math.max(Math.floor(days), 1), 90)
  const since = new Date(now.getTime() - normalizedDays * DAY_MS)

  return skippedSnapshot({
    dateFrom: since.toISOString(),
    dateTo: now.toISOString(),
    days: normalizedDays,
    reason,
  })
}

export async function getPostHogIntakeFunnelSnapshot(
  options: GetPostHogIntakeFunnelOptions = {},
): Promise<PostHogIntakeFunnelSnapshot> {
  const days = Math.min(Math.max(Math.floor(options.days ?? DEFAULT_DAYS), 1), 90)
  const now = options.now ?? new Date()
  const since = new Date(now.getTime() - days * DAY_MS)
  const dateFrom = since.toISOString()
  const dateTo = now.toISOString()

  const apiKey = process.env.POSTHOG_PROJECT_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  if (!apiKey || !projectId) {
    return skippedSnapshot({
      dateFrom,
      dateTo,
      days,
      reason: "PostHog project API is not configured.",
    })
  }

  const eventList = POSTHOG_INTAKE_FUNNEL_EVENT_NAMES.map(sqlString).join(", ")
  const posthogHost = normalizePostHogHost(
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
  )
  const hogql = `
    SELECT
      event,
      coalesce(properties.service_type, properties.service) AS service_type,
      coalesce(properties.subtype, properties.consult_subtype) AS subtype,
      properties.step_id AS step_id,
      properties.step_index AS step_index,
      count() AS count
    FROM events
    WHERE timestamp >= toDateTime('${dateFrom}')
      AND timestamp <= toDateTime('${dateTo}')
      AND event IN (${eventList})
      AND (properties.is_e2e IS NULL OR properties.is_e2e != true)
    GROUP BY event, service_type, subtype, step_id, step_index
    ORDER BY count DESC
  `

  try {
    const response = await fetch(`${posthogHost}/api/projects/${projectId}/query/`, {
      body: JSON.stringify({
        name: `InstantMed intake friction ${days}d`,
        query: {
          kind: "HogQLQuery",
          query: hogql,
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
      return skippedSnapshot({
        dateFrom,
        dateTo,
        days,
        reason: `PostHog query returned ${response.status}.`,
        status: response.status,
      })
    }

    const payload = (await response.json().catch(() => ({}))) as {
      results?: unknown[][]
    }
    const rows: IntakeFunnelAggregateRow[] = []

    for (const row of payload.results ?? []) {
      const [event, serviceType, subtype, stepId, stepIndex, count] = row
      if (typeof event !== "string") continue
      rows.push({
        count: parseCount(count),
        event,
        serviceType: parseNullableString(serviceType),
        stepId: parseNullableString(stepId),
        stepIndex: parseStepIndex(stepIndex),
        subtype: parseNullableString(subtype),
      })
    }

    return {
      ok: true,
      source: "posthog",
      status: response.status,
      summary: buildIntakeFunnelSummary({
        dateFrom,
        dateTo,
        days,
        rows,
      }),
    }
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError"
      ? "PostHog query timed out."
      : "PostHog query failed."

    return skippedSnapshot({
      dateFrom,
      dateTo,
      days,
      reason,
    })
  }
}
