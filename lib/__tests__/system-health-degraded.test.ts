import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Behavioral contract: a recovery-surface count whose read FAILED is unknown
 * (`null`) and marks the health degraded — never a silent 0. Zero asserts
 * "all clear"; a failed read asserts nothing. The SystemHealthPill self-hides
 * on totalIssues === 0, so a zero-on-failure would hide the fire alarm exactly
 * when the platform is unobservable (the 2026-08 zero-on-failure sweep).
 */

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  countStripePriceConfigIssues: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/data/reporting-filters", () => ({
  // Passthrough: reportability itself is covered by reporting-filters.test.ts
  // and intake-ops-reporting.test.ts. These tests isolate degraded semantics.
  filterReportableIntakes: (query: unknown) => query,
}))

vi.mock("@/lib/stripe/price-config-health", () => ({
  countStripePriceConfigIssues: mocks.countStripePriceConfigIssues,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    error: mocks.logError,
    warn: mocks.logWarn,
    info: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { EMPTY_SYSTEM_HEALTH, getSystemHealth, UNKNOWN_SYSTEM_HEALTH } from "@/lib/data/system-health"

type QueryResult = { count: number | null; error: { message?: string } | null }

/**
 * Self-chaining thenable that mimics the PostgREST builder: every filter
 * method returns the same object; awaiting it settles with the given result.
 */
function makeQuery(outcome: { resolve?: QueryResult; reject?: Error }) {
  const query: Record<string, unknown> = {}
  for (const method of ["select", "eq", "gte", "not", "in", "like"]) {
    query[method] = () => query
  }
  query.then = (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => {
    if (outcome.reject) {
      return Promise.reject(outcome.reject).then(onFulfilled, onRejected)
    }
    return Promise.resolve(outcome.resolve as QueryResult).then(onFulfilled, onRejected)
  }
  return query
}

const ok = (count: number): { resolve: QueryResult } => ({ resolve: { count, error: null } })
const dbError = (message: string): { resolve: QueryResult } => ({
  resolve: { count: null, error: { message } },
})
const rejected = (message: string): { reject: Error } => ({ reject: new Error(message) })

/** Queue the six queries: stuck, webhook, parchment, email, quiet-email, suppressed-email. */
function queueQueries(outcomes: Array<{ resolve?: QueryResult; reject?: Error }>) {
  const queries = outcomes.map((outcome) => makeQuery(outcome))
  let call = 0
  mocks.createServiceRoleClient.mockReturnValue({
    from: () => queries[call++],
  })
}

describe("getSystemHealth degraded semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.countStripePriceConfigIssues.mockReturnValue(0)
  })

  it("returns known counts with degraded=false when every read succeeds", async () => {
    queueQueries([ok(2), ok(1), ok(0), ok(4), ok(1), ok(1)])

    const health = await getSystemHealth()

    expect(health).toEqual({
      stuckIntakes: 2,
      webhookFailures: 1,
      parchmentFailures: 0,
      emailFailures: 2, // 4 failed minus 1 legacy quiet row and 1 intentional suppression
      stripePriceIssues: 0,
      totalIssues: 5,
      degraded: false,
    })
    expect(mocks.logError).not.toHaveBeenCalled()
  })

  it("marks a surface unknown (null, not 0) when its query errors, and excludes it from the total", async () => {
    queueQueries([ok(0), dbError("relation missing"), ok(0), ok(0), ok(0), ok(0)])

    const health = await getSystemHealth()

    expect(health.webhookFailures).toBeNull()
    expect(health.degraded).toBe(true)
    expect(health.totalIssues).toBe(0)
    // The failure must reach Sentry: error level with a real Error.
    expect(mocks.logError).toHaveBeenCalledWith(
      expect.stringContaining("webhook-failures"),
      expect.anything(),
      expect.any(Error),
    )
  })

  it("marks a surface unknown when its query rejects outright", async () => {
    queueQueries([rejected("network down"), ok(0), ok(0), ok(0), ok(0), ok(0)])

    const health = await getSystemHealth()

    expect(health.stuckIntakes).toBeNull()
    expect(health.degraded).toBe(true)
    expect(mocks.logError).toHaveBeenCalledWith(
      expect.stringContaining("stuck-intakes"),
      expect.anything(),
      expect.any(Error),
    )
  })

  it("keeps the raw email count (alarm-safe overcount) when only the quiet-failure discount fails, still degraded", async () => {
    queueQueries([ok(0), ok(0), ok(0), ok(4), rejected("quiet read down"), ok(0)])

    const health = await getSystemHealth()

    expect(health.emailFailures).toBe(4)
    expect(health.degraded).toBe(true)
    expect(health.totalIssues).toBe(4)
  })

  it("keeps the raw email count when the intentional-suppression discount fails", async () => {
    queueQueries([ok(0), ok(0), ok(0), ok(3), ok(0), rejected("suppression read down")])

    const health = await getSystemHealth()

    expect(health.emailFailures).toBe(3)
    expect(health.degraded).toBe(true)
    expect(health.totalIssues).toBe(3)
  })

  it("marks email failures unknown when the primary email read fails", async () => {
    queueQueries([ok(0), ok(0), ok(0), rejected("outbox read down"), ok(0), ok(0)])

    const health = await getSystemHealth()

    expect(health.emailFailures).toBeNull()
    expect(health.degraded).toBe(true)
  })

  it("keeps a degraded health with issues both counting and flagged", async () => {
    mocks.countStripePriceConfigIssues.mockReturnValue(1)
    queueQueries([ok(3), rejected("down"), ok(0), ok(0), ok(0), ok(0)])

    const health = await getSystemHealth()

    // Known issues still count; the unknown surface does not zero them out.
    expect(health.totalIssues).toBe(4)
    expect(health.degraded).toBe(true)
  })

  it("keeps intentional pre-delivery suppressions out of the health alarm", async () => {
    queueQueries([ok(0), ok(0), ok(0), ok(1), ok(0), ok(1)])

    const health = await getSystemHealth()

    expect(health.emailFailures).toBe(0)
    expect(health.totalIssues).toBe(0)
    expect(health.degraded).toBe(false)
  })

  it("pins the fallback shapes: EMPTY asserts a verified all-clear, UNKNOWN asserts nothing", () => {
    expect(EMPTY_SYSTEM_HEALTH.degraded).toBe(false)
    expect(EMPTY_SYSTEM_HEALTH.totalIssues).toBe(0)

    expect(UNKNOWN_SYSTEM_HEALTH.degraded).toBe(true)
    expect(UNKNOWN_SYSTEM_HEALTH.stuckIntakes).toBeNull()
    expect(UNKNOWN_SYSTEM_HEALTH.webhookFailures).toBeNull()
    expect(UNKNOWN_SYSTEM_HEALTH.parchmentFailures).toBeNull()
    expect(UNKNOWN_SYSTEM_HEALTH.emailFailures).toBeNull()
    expect(UNKNOWN_SYSTEM_HEALTH.totalIssues).toBe(0)
  })
})
