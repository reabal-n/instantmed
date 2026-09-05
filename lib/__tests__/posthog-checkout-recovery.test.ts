import { describe, expect, it, vi } from "vitest"

import {
  buildPostHogCheckoutRecoveryWindow,
  getPostHogCheckoutRecoveryDashboardSnapshot,
} from "@/lib/analytics/posthog-checkout-recovery"
import { CHECKOUT_FAILURE_TAXONOMY_VERSION } from "@/lib/stripe/checkout-failure"

const DAY_MS = 86_400_000
const AS_OF = new Date("2026-09-15T00:00:00.000Z")
const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"
const C = "33333333-3333-4333-8333-333333333333"
const D = "44444444-4444-4444-8444-444444444444"

function failure(
  at: string,
  flow: string,
  category: string | null,
  code: string | null,
  version: string | null = CHECKOUT_FAILURE_TAXONOMY_VERSION,
): unknown[] {
  return ["checkout_failed", at, flow, category, code, version]
}

function purchase(at: string, flow: string): unknown[] {
  return ["purchase_completed_server", at, flow, null, null, null]
}

function iso(daysBeforeAsOf: number, hours = 0): string {
  return new Date(AS_OF.getTime() - daysBeforeAsOf * DAY_MS + hours * 3_600_000)
    .toISOString()
}

describe("PostHog checkout failure recovery", () => {
  it("uses the first failure per valid flow and only a strictly later purchase", () => {
    const snapshot = buildPostHogCheckoutRecoveryWindow({
      asOf: AS_OF,
      days: 30,
      eventResults: [
        failure(iso(14), A, "payment_provider", "payment_provider"),
        purchase(iso(14, 1), A),
        failure(iso(13), B, "persistence", "persistence"),
        purchase(iso(13), B),
        purchase(iso(5), B),
        failure(iso(12), C, "validation", "clinical_or_input_validation"),
        failure(iso(12, 1), C, "payment_provider", "payment_provider"),
        purchase(iso(12, 2), C),
        failure(iso(11), D, "identity_or_session", null, null),
        ["checkout_failed", iso(10), "", null, null, null],
        ["checkout_failed", iso(9), "not-a-v4", "payment_provider", null, null],
      ],
    })

    expect(snapshot).toMatchObject({
      availability: "degraded",
      eligible24hFlows: 4,
      eligible7dFlows: 4,
      failedFlows: 4,
      flowIdCoveragePercent: 71.4,
      legacyUnclassifiedEvents: 1,
      paidWithin24h: 2,
      paidWithin7d: 2,
      taxonomyCoveragePercent: 75,
      typedFailedFlows: 3,
      unjoinableEvents: 1,
      unknownSharePercent: 0,
    })
    expect(snapshot.rows.reduce((sum, row) => sum + row.failedFlows, 0)).toBe(4)
    expect(snapshot.rows).toContainEqual(expect.objectContaining({
      category: "validation",
      failedFlows: 1,
      paidWithin24h: 1,
      taxonomyVersion: CHECKOUT_FAILURE_TAXONOMY_VERSION,
    }))
    expect(snapshot.rows).toContainEqual(expect.objectContaining({
      category: "identity_or_session",
      failedFlows: 1,
      taxonomyVersion: "legacy",
    }))
    expect(JSON.stringify(snapshot)).not.toMatch(/11111111|flow_instance_id|results/i)
  })

  it("keeps horizon-mature denominators separate from in-flight failures", () => {
    const snapshot = buildPostHogCheckoutRecoveryWindow({
      asOf: AS_OF,
      days: 30,
      eventResults: [
        failure(iso(0.5), A, "payment_provider", "payment_provider"),
        purchase(iso(0.5, 1), A),
        failure(iso(2), B, "persistence", "persistence"),
        purchase(iso(2, 2), B),
        failure(iso(8), C, "validation", "clinical_or_input_validation"),
      ],
    })

    expect(snapshot).toMatchObject({
      eligible24hFlows: 2,
      eligible7dFlows: 1,
      failedFlows: 3,
      inFlight24hFlows: 1,
      inFlight7dFlows: 2,
      paidWithin24h: 1,
      paidWithin7d: 0,
      recovery24hPercent: 50,
      recovery7dPercent: 0,
    })
  })

  it("stays degraded before 20 typed failures and requires unknown below five percent", () => {
    const typed = Array.from({ length: 20 }, (_, index) => {
      const suffix = (index + 1).toString(16).padStart(12, "0")
      return failure(
        iso(10),
        `aaaaaaaa-aaaa-4aaa-8aaa-${suffix}`,
        index === 0 ? "unknown" : "payment_provider",
        index === 0 ? "unexpected" : "payment_provider",
      )
    })
    const atFivePercent = buildPostHogCheckoutRecoveryWindow({
      asOf: AS_OF,
      days: 30,
      eventResults: typed,
    })
    expect(atFivePercent).toMatchObject({
      availability: "degraded",
      reason: "unknown_share_not_below_5_percent",
      typedFailedFlows: 20,
      unknownSharePercent: 5,
    })

    const belowFive = buildPostHogCheckoutRecoveryWindow({
      asOf: AS_OF,
      days: 30,
      eventResults: typed.map((row) => [
        row[0],
        row[1],
        row[2],
        "payment_provider",
        "payment_provider",
        row[5],
      ]),
    })
    expect(belowFive).toMatchObject({
      availability: "available",
      reason: null,
      typedFailedFlows: 20,
      unknownSharePercent: 0,
    })

    const immature = buildPostHogCheckoutRecoveryWindow({
      asOf: AS_OF,
      days: 7,
      eventResults: typed.slice(0, 19),
    })
    expect(immature).toMatchObject({
      availability: "degraded",
      reason: "post_release_sample_below_20",
    })
  })

  it("fails closed for malformed provider rows and out-of-window events", () => {
    expect(() => buildPostHogCheckoutRecoveryWindow({
      asOf: AS_OF,
      days: 30,
      eventResults: [["checkout_failed", iso(2), A]],
    })).toThrow("posthog_malformed_response")

    expect(() => buildPostHogCheckoutRecoveryWindow({
      asOf: AS_OF,
      days: 30,
      eventResults: [failure(AS_OF.toISOString(), A, "payment_provider", "payment_provider")],
    })).toThrow("posthog_malformed_response")
  })

  it("emits PHI-free ClickHouse-compatible UTC queries and exact-count reconciliation", async () => {
    const requests: Array<{ name: string; query: { query: string } }> = []
    const rows = [failure(iso(2), A, "payment_provider", "payment_provider")]
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)) as {
        name: string
        query: { query: string }
      }
      requests.push(request)
      return {
        json: async () => ({
          results: request.name.includes("exact event count") ? [[rows.length]] : rows,
        }),
        ok: true,
        status: 200,
      }
    })

    const dashboard = await getPostHogCheckoutRecoveryDashboardSnapshot(
      { now: AS_OF },
      {
        env: {
          POSTHOG_PROJECT_API_KEY: "secret-project-key",
          POSTHOG_PROJECT_ID: "123",
        },
        fetchImpl,
      },
    )

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(dashboard.windows.map(({ days }) => days)).toEqual([7, 30])
    const allQueries = requests.map(({ query }) => query.query).join("\n")
    const utcCalls = [...allQueries.matchAll(
      /toDateTime64\('(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})', 3, 'UTC'\)/g,
    )]
    expect(utcCalls.length).toBeGreaterThan(0)
    expect(allQueries.match(/toDateTime64\(/g)).toHaveLength(utcCalls.length)
    expect(allQueries).not.toMatch(/toDateTime64\('[^']*[TZ][^']*'/)
    expect(allQueries).toContain("LIMIT 50001")
    expect(allQueries).toContain("failure_category")
    expect(allQueries).toContain("failure_code")
    expect(allQueries).toContain("failure_taxonomy_version")
    expect(allQueries).not.toMatch(/patient_id|intake_id|distinct_id|email|phone|error/i)
    expect(JSON.stringify(dashboard)).not.toMatch(/secret-project-key|11111111|query|results/i)
  })

  it("returns unavailable instead of partial data on count mismatch or transport failure", async () => {
    const mismatchFetch = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)) as { name: string }
      return {
        json: async () => ({
          results: request.name.includes("exact event count")
            ? [[2]]
            : [failure(iso(2), A, "payment_provider", "payment_provider")],
        }),
        ok: true,
        status: 200,
      }
    })
    const mismatch = await getPostHogCheckoutRecoveryDashboardSnapshot(
      { now: AS_OF },
      {
        env: {
          POSTHOG_PROJECT_API_KEY: "secret",
          POSTHOG_PROJECT_ID: "123",
        },
        fetchImpl: mismatchFetch,
      },
    )
    expect(mismatch).toMatchObject({
      availability: "unavailable",
      reason: "posthog_event_count_mismatch",
    })
    expect(mismatch.windows).toHaveLength(0)

    const missing = await getPostHogCheckoutRecoveryDashboardSnapshot(
      { now: AS_OF },
      { env: {}, fetchImpl: vi.fn() },
    )
    expect(missing).toMatchObject({
      availability: "unavailable",
      reason: "posthog_not_configured",
      windows: [],
    })
  })

  it("rejects null or otherwise malformed exact-count evidence instead of coercing it to zero", async () => {
    const malformedCountFetch = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)) as { name: string }
      return {
        json: async () => ({
          results: request.name.includes("exact event count") ? [[null]] : [],
        }),
        ok: true,
        status: 200,
      }
    })

    await expect(getPostHogCheckoutRecoveryDashboardSnapshot(
      { now: AS_OF },
      {
        env: {
          POSTHOG_PROJECT_API_KEY: "secret",
          POSTHOG_PROJECT_ID: "123",
        },
        fetchImpl: malformedCountFetch,
      },
    )).resolves.toMatchObject({
      availability: "unavailable",
      reason: "posthog_malformed_response",
      windows: [],
    })
  })
})
