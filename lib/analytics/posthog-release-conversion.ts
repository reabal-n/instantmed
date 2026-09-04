import "server-only"

import type {
  ReleaseEvidenceAvailability,
  ReleaseMeasurementWindow,
} from "@/lib/admin/guest-account-linkage"
import { normalizeFlowInstanceId } from "@/lib/analytics/flow-instance"
import { normalizePostHogApiHost } from "@/lib/analytics/posthog-host"

const MINIMUM_FLOW_ID_COVERAGE_PERCENT = 90
const POSTHOG_QUERY_TIMEOUT_MS = 6_500
const MAX_POSTHOG_FLOW_ROWS = 50_000
const POSTHOG_FLOW_OVERFLOW_SENTINEL = MAX_POSTHOG_FLOW_ROWS + 1
const UUID_V4_HOGQL_REGEX = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
const CORE_COVERAGE_EVENT_NAMES = [
  "intake_started",
  "step_viewed",
  "step_completed",
  "checkout_initiated",
  "purchase_completed_server",
] as const
const CORE_COVERAGE_EVENTS = new Set<string>(CORE_COVERAGE_EVENT_NAMES)

type CoreCoverageEvent = typeof CORE_COVERAGE_EVENT_NAMES[number]

interface CoreEventCoverage {
  percent: number | null
  rawRows: number
  validV4Rows: number
}

export interface PostHogReleaseConversionSnapshot {
  asOf: string
  availability: ReleaseEvidenceAvailability
  cohortStatus: "complete" | "in_progress" | "unavailable"
  checkoutInitiatedFlows: number | null
  flowIdCoveragePercent: number | null
  from: string
  intakeStartedFlows: number | null
  purchaseCompletedFlows: number | null
  reason: string | null
  repeatRx: {
    clinicalHardBlockFlows: number | null
    medicationCompletedFlows: number | null
    medicationViewedFlows: number | null
    mobileCompletionPercent: number | null
    serviceSteerFlows: number | null
    unresolvedValidationBlockedFlows: number | null
    validationBlockedFlows: number | null
  }
  to: string
}

interface BuildSnapshotInput extends ReleaseMeasurementWindow {
  coverageResults: unknown[][]
  flowResults: unknown[][]
}

interface ParsedFlow {
  checkoutInitiatedAt: number | null
  clinicalHardBlockAt: number | null
  medicationCompletedAt: number | null
  medicationViewedAt: number | null
  mobileMedicationCompletedAt: number | null
  mobileMedicationViewedAt: number | null
  purchaseCompletedAt: number | null
  serviceSteerAt: number | null
  startedAt: number
  validationBlockedAt: number | null
}

type ReleaseConversionFetch = (
  input: string,
  init: RequestInit,
) => Promise<{
  json?: () => Promise<unknown>
  ok: boolean
  status: number
}>

interface PostHogReleaseConversionDependencies {
  env?: Partial<NodeJS.ProcessEnv>
  fetchImpl?: ReleaseConversionFetch
}

function assertValidWindow(window: ReleaseMeasurementWindow): void {
  const from = window.from.getTime()
  const to = window.to.getTime()
  const asOf = window.asOf.getTime()
  if (![from, to, asOf].every(Number.isFinite) || from >= to) {
    throw new Error("Release measurement window is invalid")
  }
}

function nullableRepeatRx() {
  return {
    clinicalHardBlockFlows: null,
    medicationCompletedFlows: null,
    medicationViewedFlows: null,
    mobileCompletionPercent: null,
    serviceSteerFlows: null,
    unresolvedValidationBlockedFlows: null,
    validationBlockedFlows: null,
  }
}

export function buildUnavailablePostHogReleaseConversionSnapshot(
  window: ReleaseMeasurementWindow,
  reason: string,
): PostHogReleaseConversionSnapshot {
  assertValidWindow(window)
  return {
    asOf: window.asOf.toISOString(),
    availability: "unavailable",
    cohortStatus: "unavailable",
    checkoutInitiatedFlows: null,
    flowIdCoveragePercent: null,
    from: window.from.toISOString(),
    intakeStartedFlows: null,
    purchaseCompletedFlows: null,
    reason,
    repeatRx: nullableRepeatRx(),
    to: window.to.toISOString(),
  }
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function observedAt(
  value: unknown,
  startedAt: number,
  asOf: number,
): number | null {
  const timestamp = parseTimestamp(value)
  return timestamp !== null && timestamp >= startedAt && timestamp <= asOf
    ? timestamp
    : null
}

function parseFlowRows(
  results: unknown[][],
  window: ReleaseMeasurementWindow,
): ParsedFlow[] {
  const from = window.from.getTime()
  const to = window.to.getTime()
  const asOf = window.asOf.getTime()
  const flows = new Map<string, ParsedFlow>()

  for (const row of results) {
    if (!Array.isArray(row)) continue
    // PostHog also applies the v4 predicate. Re-validating here prevents a
    // malformed or unexpectedly transformed upstream row becoming a cohort ID.
    const flowInstanceId = normalizeFlowInstanceId(row[0])
    const startedAt = parseTimestamp(row[1])
    if (
      !flowInstanceId ||
      startedAt === null ||
      startedAt < from ||
      startedAt >= to ||
      startedAt > asOf
    ) {
      continue
    }
    if (flows.has(flowInstanceId)) continue
    flows.set(flowInstanceId, {
      checkoutInitiatedAt: observedAt(row[4], startedAt, asOf),
      clinicalHardBlockAt: observedAt(row[7], startedAt, asOf),
      medicationCompletedAt: observedAt(row[3], startedAt, asOf),
      medicationViewedAt: observedAt(row[2], startedAt, asOf),
      mobileMedicationCompletedAt: observedAt(row[10], startedAt, asOf),
      mobileMedicationViewedAt: observedAt(row[9], startedAt, asOf),
      purchaseCompletedAt: observedAt(row[5], startedAt, asOf),
      serviceSteerAt: observedAt(row[6], startedAt, asOf),
      startedAt,
      validationBlockedAt: observedAt(row[8], startedAt, asOf),
    })
  }
  return [...flows.values()]
}

function parseCoverage(results: unknown[][]): {
  byEvent: Record<CoreCoverageEvent, CoreEventCoverage>
  percent: number | null
  rawRows: number
} {
  const byEvent = Object.fromEntries(
    CORE_COVERAGE_EVENT_NAMES.map((event) => [
      event,
      { percent: null, rawRows: 0, validV4Rows: 0 },
    ]),
  ) as Record<CoreCoverageEvent, CoreEventCoverage>

  for (const row of results) {
    const event = String(row?.[0] ?? "")
    if (!Array.isArray(row) || !CORE_COVERAGE_EVENTS.has(event)) {
      continue
    }
    const raw = Number(row[1])
    const valid = Number(row[2])
    if (
      !Number.isSafeInteger(raw) ||
      !Number.isSafeInteger(valid) ||
      raw < 0 ||
      valid < 0 ||
      valid > raw
    ) {
      throw new Error("PostHog coverage result is malformed")
    }
    const aggregate = byEvent[event as CoreCoverageEvent]
    aggregate.rawRows += raw
    aggregate.validV4Rows += valid
  }

  let rawRows = 0
  const observedCoverage: number[] = []
  for (const aggregate of Object.values(byEvent)) {
    rawRows += aggregate.rawRows
    if (aggregate.rawRows === 0) continue
    aggregate.percent = Math.round(
      (aggregate.validV4Rows / aggregate.rawRows) * 1_000,
    ) / 10
    observedCoverage.push(aggregate.percent)
  }

  return {
    byEvent,
    percent: observedCoverage.length === 0 ? null : Math.min(...observedCoverage),
    rawRows,
  }
}

function validateFlowQueryEvidence(
  results: unknown[][],
  countResults: unknown[][],
): void {
  if (results.length > MAX_POSTHOG_FLOW_ROWS) {
    throw new SafePostHogReadError("posthog_flow_cohort_truncated")
  }
  const exact = Number(countResults[0]?.[0])
  if (
    countResults.length !== 1 ||
    countResults[0]?.length !== 1 ||
    !Number.isSafeInteger(exact) ||
    exact < 0
  ) {
    throw new SafePostHogReadError("posthog_malformed_response")
  }
  if (exact > MAX_POSTHOG_FLOW_ROWS) {
    throw new SafePostHogReadError("posthog_flow_cohort_truncated")
  }

  const flowIds = new Set<string>()
  for (const row of results) {
    const flowId = normalizeFlowInstanceId(row?.[0])
    if (!flowId) {
      throw new SafePostHogReadError("posthog_malformed_response")
    }
    flowIds.add(flowId)
  }
  if (exact !== flowIds.size) {
    throw new SafePostHogReadError("posthog_flow_count_mismatch")
  }
}

function percent(numerator: number, denominator: number): number | null {
  return denominator === 0
    ? null
    : Math.round((numerator / denominator) * 1_000) / 10
}

export function buildPostHogReleaseConversionSnapshot(
  input: BuildSnapshotInput,
): PostHogReleaseConversionSnapshot {
  assertValidWindow(input)
  if (input.asOf.getTime() < input.to.getTime()) {
    return {
      asOf: input.asOf.toISOString(),
      availability: "degraded",
      checkoutInitiatedFlows: null,
      cohortStatus: "in_progress",
      flowIdCoveragePercent: null,
      from: input.from.toISOString(),
      intakeStartedFlows: null,
      purchaseCompletedFlows: null,
      reason: "cohort_in_progress",
      repeatRx: nullableRepeatRx(),
      to: input.to.toISOString(),
    }
  }
  const coverage = parseCoverage(input.coverageResults)
  if (coverage.rawRows === 0) {
    return buildUnavailablePostHogReleaseConversionSnapshot(
      input,
      "posthog_no_usable_evidence",
    )
  }

  const flows = parseFlowRows(input.flowResults, input)
  const medicationViewedFlows = flows.filter((flow) => flow.medicationViewedAt !== null).length
  const medicationCompletedFlows = flows.filter((flow) => flow.medicationCompletedAt !== null).length
  const mobileViewedFlows = flows.filter((flow) => flow.mobileMedicationViewedAt !== null).length
  const mobileCompletedFlows = flows.filter((flow) => flow.mobileMedicationCompletedAt !== null).length
  const validationBlockedFlows = flows.filter((flow) => flow.validationBlockedAt !== null).length
  const unresolvedValidationBlockedFlows = flows.filter((flow) => {
    if (flow.validationBlockedAt === null) return false
    return flow.medicationCompletedAt === null || flow.medicationCompletedAt <= flow.validationBlockedAt
  }).length
  const degraded = coverage.percent !== null && coverage.percent < MINIMUM_FLOW_ID_COVERAGE_PERCENT

  return {
    asOf: input.asOf.toISOString(),
    availability: degraded ? "degraded" : "available",
    checkoutInitiatedFlows: flows.filter((flow) => flow.checkoutInitiatedAt !== null).length,
    cohortStatus: "complete",
    flowIdCoveragePercent: coverage.percent,
    from: input.from.toISOString(),
    intakeStartedFlows: flows.length,
    purchaseCompletedFlows: flows.filter((flow) => flow.purchaseCompletedAt !== null).length,
    reason: degraded ? "flow_id_coverage_below_90_percent" : null,
    repeatRx: {
      clinicalHardBlockFlows: flows.filter((flow) => flow.clinicalHardBlockAt !== null).length,
      medicationCompletedFlows,
      medicationViewedFlows,
      mobileCompletionPercent: percent(mobileCompletedFlows, mobileViewedFlows),
      serviceSteerFlows: flows.filter((flow) => flow.serviceSteerAt !== null).length,
      unresolvedValidationBlockedFlows,
      validationBlockedFlows,
    },
    to: input.to.toISOString(),
  }
}

function sqlDate(value: Date): string {
  return value.toISOString().replace(/'/g, "''")
}

function buildQueries(window: ReleaseMeasurementWindow): {
  coverage: string
  flowCount: string
  flows: string
} {
  const from = sqlDate(window.from)
  const to = sqlDate(window.to)
  const asOf = sqlDate(window.asOf)
  const v4 = UUID_V4_HOGQL_REGEX
  const eventFilter = [
    "'intake_started'",
    "'step_viewed'",
    "'step_completed'",
    "'checkout_initiated'",
    "'purchase_completed_server'",
    "'intake_validation_blocked'",
  ].join(", ")
  const validFlow = `match(toString(properties.flow_instance_id), '${v4}')`
  const medicationEvent = "properties.service_type = 'prescription' AND properties.step_id = 'medication'"
  const shownBlock = "event = 'intake_validation_blocked' AND properties.resolution = 'shown'"

  return {
    coverage: `
      SELECT
        event,
        count() AS raw_rows,
        countIf(${validFlow}) AS valid_v4_rows
      FROM events
      WHERE timestamp >= toDateTime64('${from}', 3)
        AND timestamp <= toDateTime64('${asOf}', 3)
        AND event IN (${eventFilter})
        AND (event != 'intake_started' OR timestamp < toDateTime64('${to}', 3))
        AND (properties.is_e2e IS NULL OR properties.is_e2e != true)
      GROUP BY event
    `,
    flowCount: `
      SELECT uniqExact(toString(properties.flow_instance_id)) AS exact_started_flows
      FROM events
      WHERE timestamp >= toDateTime64('${from}', 3)
        AND timestamp < toDateTime64('${to}', 3)
        AND event = 'intake_started'
        AND ${validFlow}
        AND (properties.is_e2e IS NULL OR properties.is_e2e != true)
    `,
    flows: `
      SELECT
        toString(properties.flow_instance_id) AS flow_instance_id,
        minIf(timestamp, event = 'intake_started' AND timestamp >= toDateTime64('${from}', 3) AND timestamp < toDateTime64('${to}', 3)) AS started_at,
        minIf(timestamp, event = 'step_viewed' AND ${medicationEvent}) AS medication_viewed_at,
        maxIf(timestamp, event = 'step_completed' AND ${medicationEvent}) AS medication_completed_at,
        minIf(timestamp, event = 'checkout_initiated') AS checkout_initiated_at,
        minIf(timestamp, event = 'purchase_completed_server') AS purchase_completed_at,
        maxIf(timestamp, ${shownBlock} AND properties.block_type = 'service_steer' AND ${medicationEvent}) AS service_steer_at,
        maxIf(timestamp, ${shownBlock} AND properties.block_type = 'clinical_hard_block' AND ${medicationEvent}) AS clinical_hard_block_at,
        maxIf(timestamp, ${shownBlock} AND properties.block_type = 'validation' AND ${medicationEvent}) AS validation_blocked_at,
        minIf(timestamp, event = 'step_viewed' AND ${medicationEvent} AND properties.$device_type = 'Mobile') AS mobile_medication_viewed_at,
        maxIf(timestamp, event = 'step_completed' AND ${medicationEvent} AND properties.$device_type = 'Mobile') AS mobile_medication_completed_at
      FROM events
      WHERE timestamp >= toDateTime64('${from}', 3)
        AND timestamp <= toDateTime64('${asOf}', 3)
        AND event IN (${eventFilter})
        AND ${validFlow}
        AND (properties.is_e2e IS NULL OR properties.is_e2e != true)
      GROUP BY flow_instance_id
      HAVING started_at >= toDateTime64('${from}', 3)
        AND started_at < toDateTime64('${to}', 3)
      LIMIT ${POSTHOG_FLOW_OVERFLOW_SENTINEL}
    `,
  }
}

class SafePostHogReadError extends Error {
  constructor(readonly reason: string) {
    super(reason)
  }
}

async function runHogQlQuery(input: {
  apiKey: string
  fetchImpl: ReleaseConversionFetch
  host: string
  name: string
  projectId: string
  query: string
}): Promise<unknown[][]> {
  const response = await input.fetchImpl(
    `${input.host}/api/projects/${encodeURIComponent(input.projectId)}/query/`,
    {
      body: JSON.stringify({
        name: input.name,
        query: { kind: "HogQLQuery", query: input.query },
      }),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(POSTHOG_QUERY_TIMEOUT_MS),
    },
  )
  if (!response.ok) {
    throw new SafePostHogReadError(
      response.status === 403 ? "posthog_forbidden" : "posthog_request_failed",
    )
  }
  if (typeof response.json !== "function") {
    throw new SafePostHogReadError("posthog_malformed_response")
  }
  const payload = await response.json().catch(() => null) as { results?: unknown } | null
  if (!payload || !Array.isArray(payload.results)) {
    throw new SafePostHogReadError("posthog_malformed_response")
  }
  return payload.results as unknown[][]
}

export async function getPostHogReleaseConversionSnapshot(
  window: ReleaseMeasurementWindow,
  dependencies: PostHogReleaseConversionDependencies = {},
): Promise<PostHogReleaseConversionSnapshot> {
  assertValidWindow(window)
  const env = dependencies.env ?? process.env
  const apiKey = env.POSTHOG_PROJECT_API_KEY
  const projectId = env.POSTHOG_PROJECT_ID
  if (!apiKey || !projectId) {
    return buildUnavailablePostHogReleaseConversionSnapshot(
      window,
      "posthog_not_configured",
    )
  }
  if (window.asOf.getTime() < window.to.getTime()) {
    return buildPostHogReleaseConversionSnapshot({
      ...window,
      coverageResults: [],
      flowResults: [],
    })
  }
  const host = normalizePostHogApiHost(
    env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
  )
  const fetchImpl = dependencies.fetchImpl ?? (fetch as ReleaseConversionFetch)
  const queries = buildQueries(window)

  try {
    const [flowResults, flowCountResults, coverageResults] = await Promise.all([
      runHogQlQuery({
        apiKey,
        fetchImpl,
        host,
        name: "InstantMed release start cohort",
        projectId,
        query: queries.flows,
      }),
      runHogQlQuery({
        apiKey,
        fetchImpl,
        host,
        name: "InstantMed release exact start cohort count",
        projectId,
        query: queries.flowCount,
      }),
      runHogQlQuery({
        apiKey,
        fetchImpl,
        host,
        name: "InstantMed release valid-v4 coverage",
        projectId,
        query: queries.coverage,
      }),
    ])
    validateFlowQueryEvidence(flowResults, flowCountResults)
    return buildPostHogReleaseConversionSnapshot({
      ...window,
      coverageResults,
      flowResults,
    })
  } catch (error) {
    const reason = error instanceof SafePostHogReadError
      ? error.reason
      : error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "posthog_timeout"
        : "posthog_request_failed"
    return buildUnavailablePostHogReleaseConversionSnapshot(window, reason)
  }
}
