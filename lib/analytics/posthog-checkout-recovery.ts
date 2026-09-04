import "server-only"

import { normalizeFlowInstanceId } from "@/lib/analytics/flow-instance"
import { normalizePostHogApiHost } from "@/lib/analytics/posthog-host"
import type { CheckoutFailureCategory } from "@/lib/analytics/posthog-privacy"
import {
  CHECKOUT_FAILURE_CODES,
  CHECKOUT_FAILURE_TAXONOMY_VERSION,
  type CheckoutFailureCode,
  getCheckoutFailureCategory,
} from "@/lib/stripe/checkout-failure"

const DAY_MS = 24 * 60 * 60 * 1_000
const POSTHOG_QUERY_TIMEOUT_MS = 6_500
const MAX_POSTHOG_EVENT_ROWS = 50_000
const POSTHOG_EVENT_OVERFLOW_SENTINEL = MAX_POSTHOG_EVENT_ROWS + 1
const MINIMUM_TYPED_FAILED_FLOWS = 20
const MINIMUM_FLOW_ID_COVERAGE_PERCENT = 90
const MINIMUM_TAXONOMY_COVERAGE_PERCENT = 95
const MAXIMUM_UNKNOWN_SHARE_PERCENT = 5
const UUID_V4_HOGQL_REGEX =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"

const CHECKOUT_FAILURE_CATEGORIES = [
  "availability_or_capacity",
  "identity_or_session",
  "payment_provider",
  "persistence",
  "pricing_or_configuration",
  "rate_limit",
  "validation",
  "unknown",
] as const satisfies readonly CheckoutFailureCategory[]

const CATEGORY_SET = new Set<string>(CHECKOUT_FAILURE_CATEGORIES)
const CODE_SET = new Set<string>(CHECKOUT_FAILURE_CODES)

export type CheckoutRecoveryAvailability =
  | "available"
  | "degraded"
  | "unavailable"

export type CheckoutRecoveryReason =
  | "flow_id_coverage_below_90_percent"
  | "post_release_sample_below_20"
  | "taxonomy_coverage_below_95_percent"
  | "unknown_share_not_below_5_percent"
  | "posthog_event_cohort_truncated"
  | "posthog_event_count_mismatch"
  | "posthog_forbidden"
  | "posthog_malformed_response"
  | "posthog_not_configured"
  | "posthog_request_failed"
  | "posthog_timeout"

export interface CheckoutRecoveryRow {
  category: CheckoutFailureCategory
  taxonomyVersion: typeof CHECKOUT_FAILURE_TAXONOMY_VERSION | "legacy"
  failedFlows: number
  eligible24hFlows: number
  inFlight24hFlows: number
  paidWithin24h: number
  eligible7dFlows: number
  inFlight7dFlows: number
  paidWithin7d: number
  recovery24hPercent: number | null
  recovery7dPercent: number | null
}

export interface CheckoutRecoveryWindowSnapshot {
  asOf: string
  availability: Exclude<CheckoutRecoveryAvailability, "unavailable">
  days: 7 | 30
  eligible24hFlows: number
  eligible7dFlows: number
  failedFlows: number
  flowIdCoveragePercent: number | null
  from: string
  inFlight24hFlows: number
  inFlight7dFlows: number
  legacyUnclassifiedEvents: number
  paidWithin24h: number
  paidWithin7d: number
  rawFailureEvents: number
  reason: Exclude<CheckoutRecoveryReason,
    | "posthog_event_cohort_truncated"
    | "posthog_event_count_mismatch"
    | "posthog_forbidden"
    | "posthog_malformed_response"
    | "posthog_not_configured"
    | "posthog_request_failed"
    | "posthog_timeout"
  > | null
  recovery24hPercent: number | null
  recovery7dPercent: number | null
  rows: CheckoutRecoveryRow[]
  taxonomyCoveragePercent: number | null
  to: string
  typedFailedFlows: number
  unjoinableEvents: number
  unknownSharePercent: number | null
  validFlowFailureEvents: number
}

export interface CheckoutRecoveryDashboardSnapshot {
  asOf: string
  availability: CheckoutRecoveryAvailability
  reason: CheckoutRecoveryReason | null
  windows: CheckoutRecoveryWindowSnapshot[]
}

interface BuildWindowInput {
  asOf: Date
  days: 7 | 30
  eventResults: unknown[][]
}

type CheckoutRecoveryFetch = (
  input: string,
  init: RequestInit,
) => Promise<{
  json?: () => Promise<unknown>
  ok: boolean
  status: number
}>

interface CheckoutRecoveryDependencies {
  env?: Partial<NodeJS.ProcessEnv>
  fetchImpl?: CheckoutRecoveryFetch
}

interface ParsedEvent {
  category: string | null
  code: string | null
  event: "checkout_failed" | "purchase_completed_server"
  flowInstanceId: string | null
  occurredAt: number
  order: number
  taxonomyVersion: string | null
}

interface FirstFailure {
  category: CheckoutFailureCategory
  flowInstanceId: string
  occurredAt: number
  taxonomyVersion: typeof CHECKOUT_FAILURE_TAXONOMY_VERSION | "legacy"
  typed: boolean
}

class SafePostHogCheckoutRecoveryError extends Error {
  constructor(readonly reason: CheckoutRecoveryReason) {
    super(reason)
  }
}

function percent(numerator: number, denominator: number): number | null {
  return denominator === 0
    ? null
    : Math.round((numerator / denominator) * 1_000) / 10
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null
  const clickHouse = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?$/.exec(value)
  const normalized = clickHouse
    ? `${clickHouse[1]}T${clickHouse[2]}.${(clickHouse[3] ?? "0").padEnd(3, "0").slice(0, 3)}Z`
    : value
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? timestamp : null
}

function parseNullableProviderString(value: unknown): string | null {
  if (value === null || value === "") return null
  if (typeof value !== "string") {
    throw new SafePostHogCheckoutRecoveryError("posthog_malformed_response")
  }
  return value
}

function parseEventRows(
  results: unknown[][],
  asOf: Date,
  earliestAllowed?: Date,
): ParsedEvent[] {
  const asOfMs = asOf.getTime()
  const earliestMs = earliestAllowed?.getTime() ?? Number.NEGATIVE_INFINITY
  if (!Number.isFinite(asOfMs)) {
    throw new Error("Checkout recovery as-of time is invalid")
  }

  return results.map((row, order) => {
    if (!Array.isArray(row) || row.length !== 6) {
      throw new SafePostHogCheckoutRecoveryError("posthog_malformed_response")
    }
    const event = row[0]
    const occurredAt = parseTimestamp(row[1])
    if (
      (event !== "checkout_failed" && event !== "purchase_completed_server") ||
      occurredAt === null ||
      occurredAt < earliestMs ||
      occurredAt >= asOfMs
    ) {
      throw new SafePostHogCheckoutRecoveryError("posthog_malformed_response")
    }
    const rawFlow = parseNullableProviderString(row[2])
    const flowInstanceId = normalizeFlowInstanceId(rawFlow)
    const category = parseNullableProviderString(row[3])
    const code = parseNullableProviderString(row[4])
    const taxonomyVersion = parseNullableProviderString(row[5])
    if (event === "purchase_completed_server" && !flowInstanceId) {
      throw new SafePostHogCheckoutRecoveryError("posthog_malformed_response")
    }
    return {
      category,
      code,
      event,
      flowInstanceId,
      occurredAt,
      order,
      taxonomyVersion,
    }
  })
}

function normalizedFailure(event: ParsedEvent): Omit<FirstFailure, "flowInstanceId" | "occurredAt"> {
  const code = CODE_SET.has(event.code ?? "")
    ? event.code as CheckoutFailureCode
    : null
  const category = CATEGORY_SET.has(event.category ?? "")
    ? event.category as CheckoutFailureCategory
    : "unknown"
  const typed =
    event.taxonomyVersion === CHECKOUT_FAILURE_TAXONOMY_VERSION &&
    code !== null &&
    category === getCheckoutFailureCategory(code)

  return {
    category,
    taxonomyVersion: typed ? CHECKOUT_FAILURE_TAXONOMY_VERSION : "legacy",
    typed,
  }
}

function recoveryReason(input: {
  flowIdCoveragePercent: number | null
  taxonomyCoveragePercent: number | null
  typedFailedFlows: number
  unknownSharePercent: number | null
}): CheckoutRecoveryWindowSnapshot["reason"] {
  if (input.typedFailedFlows < MINIMUM_TYPED_FAILED_FLOWS) {
    return "post_release_sample_below_20"
  }
  if (
    input.flowIdCoveragePercent === null ||
    input.flowIdCoveragePercent < MINIMUM_FLOW_ID_COVERAGE_PERCENT
  ) {
    return "flow_id_coverage_below_90_percent"
  }
  if (
    input.taxonomyCoveragePercent === null ||
    input.taxonomyCoveragePercent < MINIMUM_TAXONOMY_COVERAGE_PERCENT
  ) {
    return "taxonomy_coverage_below_95_percent"
  }
  if (
    input.unknownSharePercent === null ||
    input.unknownSharePercent >= MAXIMUM_UNKNOWN_SHARE_PERCENT
  ) {
    return "unknown_share_not_below_5_percent"
  }
  return null
}

export function buildPostHogCheckoutRecoveryWindow({
  asOf,
  days,
  eventResults,
}: BuildWindowInput): CheckoutRecoveryWindowSnapshot {
  const asOfMs = asOf.getTime()
  if (!Number.isFinite(asOfMs)) {
    throw new Error("Checkout recovery as-of time is invalid")
  }
  const fromMs = asOfMs - days * DAY_MS
  const parsed = parseEventRows(eventResults, asOf)
    .filter((event) => event.occurredAt >= fromMs)
    .sort((left, right) =>
      left.occurredAt - right.occurredAt || left.order - right.order,
    )
  const failures = parsed.filter((event) => event.event === "checkout_failed")
  const rawFailureEvents = failures.length
  const validFlowFailureEvents = failures.filter((event) => event.flowInstanceId).length
  const legacyUnclassifiedEvents = failures.filter((event) =>
    !event.flowInstanceId &&
    !event.category &&
    !event.code &&
    !event.taxonomyVersion,
  ).length
  const unjoinableEvents = failures.filter((event) =>
    !event.flowInstanceId && !(
      !event.category &&
      !event.code &&
      !event.taxonomyVersion
    ),
  ).length

  const firstFailures = new Map<string, FirstFailure>()
  const purchaseTimes = new Map<string, number[]>()
  for (const event of parsed) {
    if (!event.flowInstanceId) continue
    if (event.event === "checkout_failed") {
      if (!firstFailures.has(event.flowInstanceId)) {
        firstFailures.set(event.flowInstanceId, {
          ...normalizedFailure(event),
          flowInstanceId: event.flowInstanceId,
          occurredAt: event.occurredAt,
        })
      }
      continue
    }
    const times = purchaseTimes.get(event.flowInstanceId) ?? []
    times.push(event.occurredAt)
    purchaseTimes.set(event.flowInstanceId, times)
  }

  const rowMap = new Map<string, CheckoutRecoveryRow>()
  let eligible24hFlows = 0
  let eligible7dFlows = 0
  let paidWithin24h = 0
  let paidWithin7d = 0
  let typedFailedFlows = 0
  let unknownTypedFlows = 0

  for (const failure of firstFailures.values()) {
    const key = `${failure.taxonomyVersion}:${failure.category}`
    const row = rowMap.get(key) ?? {
      category: failure.category,
      eligible24hFlows: 0,
      eligible7dFlows: 0,
      failedFlows: 0,
      inFlight24hFlows: 0,
      inFlight7dFlows: 0,
      paidWithin24h: 0,
      paidWithin7d: 0,
      recovery24hPercent: null,
      recovery7dPercent: null,
      taxonomyVersion: failure.taxonomyVersion,
    }
    row.failedFlows += 1
    if (failure.typed) {
      typedFailedFlows += 1
      if (failure.category === "unknown") unknownTypedFlows += 1
    }
    const firstLaterPurchase = (purchaseTimes.get(failure.flowInstanceId) ?? [])
      .find((purchaseAt) => purchaseAt > failure.occurredAt)
    const eligible24h = asOfMs >= failure.occurredAt + DAY_MS
    const eligible7d = asOfMs >= failure.occurredAt + 7 * DAY_MS
    if (eligible24h) {
      eligible24hFlows += 1
      row.eligible24hFlows += 1
      if (
        firstLaterPurchase !== undefined &&
        firstLaterPurchase <= failure.occurredAt + DAY_MS
      ) {
        paidWithin24h += 1
        row.paidWithin24h += 1
      }
    } else {
      row.inFlight24hFlows += 1
    }
    if (eligible7d) {
      eligible7dFlows += 1
      row.eligible7dFlows += 1
      if (
        firstLaterPurchase !== undefined &&
        firstLaterPurchase <= failure.occurredAt + 7 * DAY_MS
      ) {
        paidWithin7d += 1
        row.paidWithin7d += 1
      }
    } else {
      row.inFlight7dFlows += 1
    }
    rowMap.set(key, row)
  }

  const rows = [...rowMap.values()]
    .map((row) => ({
      ...row,
      recovery24hPercent: percent(row.paidWithin24h, row.eligible24hFlows),
      recovery7dPercent: percent(row.paidWithin7d, row.eligible7dFlows),
    }))
    .sort((left, right) =>
      left.taxonomyVersion.localeCompare(right.taxonomyVersion) ||
      left.category.localeCompare(right.category),
    )
  const failedFlows = firstFailures.size
  const flowIdCoveragePercent = percent(validFlowFailureEvents, rawFailureEvents)
  const taxonomyCoveragePercent = percent(typedFailedFlows, failedFlows)
  const unknownSharePercent = percent(unknownTypedFlows, typedFailedFlows)
  const reason = recoveryReason({
    flowIdCoveragePercent,
    taxonomyCoveragePercent,
    typedFailedFlows,
    unknownSharePercent,
  })

  return {
    asOf: asOf.toISOString(),
    availability: reason ? "degraded" : "available",
    days,
    eligible24hFlows,
    eligible7dFlows,
    failedFlows,
    flowIdCoveragePercent,
    from: new Date(fromMs).toISOString(),
    inFlight24hFlows: failedFlows - eligible24hFlows,
    inFlight7dFlows: failedFlows - eligible7dFlows,
    legacyUnclassifiedEvents,
    paidWithin24h,
    paidWithin7d,
    rawFailureEvents,
    reason,
    recovery24hPercent: percent(paidWithin24h, eligible24hFlows),
    recovery7dPercent: percent(paidWithin7d, eligible7dFlows),
    rows,
    taxonomyCoveragePercent,
    to: asOf.toISOString(),
    typedFailedFlows,
    unjoinableEvents,
    unknownSharePercent,
    validFlowFailureEvents,
  }
}

export function buildUnavailablePostHogCheckoutRecoveryDashboardSnapshot(
  now: Date,
  reason: CheckoutRecoveryReason,
): CheckoutRecoveryDashboardSnapshot {
  return {
    asOf: now.toISOString(),
    availability: "unavailable",
    reason,
    windows: [],
  }
}

function sqlDate(value: Date): string {
  return value.toISOString().slice(0, -1).replace("T", " ").replace(/'/g, "''")
}

function utcDateTime64(value: string): string {
  return `toDateTime64('${value}', 3, 'UTC')`
}

function buildQueries(now: Date): { eventCount: string; events: string } {
  const from = utcDateTime64(sqlDate(new Date(now.getTime() - 30 * DAY_MS)))
  const to = utcDateTime64(sqlDate(now))
  const validFlow = `match(toString(properties.flow_instance_id), '${UUID_V4_HOGQL_REGEX}')`
  const where = `
    timestamp >= ${from}
    AND timestamp < ${to}
    AND (
      event = 'checkout_failed'
      OR (event = 'purchase_completed_server' AND ${validFlow})
    )
    AND (properties.is_e2e IS NULL OR properties.is_e2e != true)
  `
  return {
    eventCount: `
      SELECT count() AS exact_event_count
      FROM events
      WHERE ${where}
    `,
    events: `
      SELECT
        event,
        toString(timestamp) AS occurred_at,
        toString(properties.flow_instance_id) AS flow_instance_id,
        toString(properties.failure_category) AS failure_category,
        toString(properties.failure_code) AS failure_code,
        toString(properties.failure_taxonomy_version) AS failure_taxonomy_version
      FROM events
      WHERE ${where}
      ORDER BY timestamp ASC
      LIMIT ${POSTHOG_EVENT_OVERFLOW_SENTINEL}
    `,
  }
}

async function runHogQlQuery(input: {
  apiKey: string
  fetchImpl: CheckoutRecoveryFetch
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
    throw new SafePostHogCheckoutRecoveryError(
      response.status === 403 ? "posthog_forbidden" : "posthog_request_failed",
    )
  }
  if (typeof response.json !== "function") {
    throw new SafePostHogCheckoutRecoveryError("posthog_malformed_response")
  }
  const payload = await response.json().catch(() => null) as { results?: unknown } | null
  if (!payload || !Array.isArray(payload.results)) {
    throw new SafePostHogCheckoutRecoveryError("posthog_malformed_response")
  }
  return payload.results as unknown[][]
}

function validateExactEventEvidence(
  eventResults: unknown[][],
  countResults: unknown[][],
  now: Date,
): void {
  const rawExact = countResults[0]?.[0]
  if (
    countResults.length !== 1 ||
    countResults[0]?.length !== 1 ||
    !(
      typeof rawExact === "number" ||
      (typeof rawExact === "string" && /^\d+$/.test(rawExact))
    )
  ) {
    throw new SafePostHogCheckoutRecoveryError("posthog_malformed_response")
  }
  const exact = Number(rawExact)
  if (
    !Number.isSafeInteger(exact) ||
    exact < 0
  ) {
    throw new SafePostHogCheckoutRecoveryError("posthog_malformed_response")
  }
  if (exact > MAX_POSTHOG_EVENT_ROWS || eventResults.length > MAX_POSTHOG_EVENT_ROWS) {
    throw new SafePostHogCheckoutRecoveryError("posthog_event_cohort_truncated")
  }
  parseEventRows(eventResults, now, new Date(now.getTime() - 30 * DAY_MS))
  if (exact !== eventResults.length) {
    throw new SafePostHogCheckoutRecoveryError("posthog_event_count_mismatch")
  }
}

export async function getPostHogCheckoutRecoveryDashboardSnapshot(
  options: { now?: Date } = {},
  dependencies: CheckoutRecoveryDependencies = {},
): Promise<CheckoutRecoveryDashboardSnapshot> {
  const now = options.now ?? new Date()
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Checkout recovery as-of time is invalid")
  }
  const env = dependencies.env ?? process.env
  const apiKey = env.POSTHOG_PROJECT_API_KEY
  const projectId = env.POSTHOG_PROJECT_ID
  if (!apiKey || !projectId) {
    return buildUnavailablePostHogCheckoutRecoveryDashboardSnapshot(
      now,
      "posthog_not_configured",
    )
  }
  const host = normalizePostHogApiHost(
    env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
  )
  const fetchImpl = dependencies.fetchImpl ?? (fetch as CheckoutRecoveryFetch)
  const queries = buildQueries(now)

  try {
    const [eventResults, countResults] = await Promise.all([
      runHogQlQuery({
        apiKey,
        fetchImpl,
        host,
        name: "InstantMed checkout recovery event cohort",
        projectId,
        query: queries.events,
      }),
      runHogQlQuery({
        apiKey,
        fetchImpl,
        host,
        name: "InstantMed checkout recovery exact event count",
        projectId,
        query: queries.eventCount,
      }),
    ])
    validateExactEventEvidence(eventResults, countResults, now)
    const windows = ([7, 30] as const).map((days) =>
      buildPostHogCheckoutRecoveryWindow({ asOf: now, days, eventResults }),
    )
    const degradedWindow = windows.find(({ availability }) => availability === "degraded")
    return {
      asOf: now.toISOString(),
      availability: degradedWindow ? "degraded" : "available",
      reason: degradedWindow?.reason ?? null,
      windows,
    }
  } catch (error) {
    const reason = error instanceof SafePostHogCheckoutRecoveryError
      ? error.reason
      : error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "posthog_timeout"
        : "posthog_request_failed"
    return buildUnavailablePostHogCheckoutRecoveryDashboardSnapshot(now, reason)
  }
}
