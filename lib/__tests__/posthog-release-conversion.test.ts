import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it, vi } from "vitest"

import {
  buildPostHogReleaseConversionSnapshot,
  getPostHogReleaseConversionSnapshot,
} from "@/lib/analytics/posthog-release-conversion"

const FROM = new Date("2026-09-01T00:00:00.000Z")
const TO = new Date("2026-09-08T00:00:00.000Z")
const AS_OF = new Date("2026-09-15T00:00:00.000Z")
const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"
const C = "33333333-3333-4333-8333-333333333333"

const at = (day: number) => new Date(FROM.getTime() + day * 86_400_000).toISOString()

describe("PostHog release conversion", () => {
  it("uses a valid-v4 start cohort, de-duplicates flows, and resolves blockers only after completion", () => {
    const snapshot = buildPostHogReleaseConversionSnapshot({
      asOf: AS_OF,
      coverageResults: [
        ["intake_started", 100, 100],
        ["step_viewed", 40, 40],
        ["step_completed", 35, 35],
        ["checkout_initiated", 30, 30],
        ["purchase_completed_server", 25, 25],
        // A legitimate absence of blocker rows must not reduce coverage.
        ["intake_validation_blocked", 0, 0],
      ],
      flowResults: [
        [A, at(0), at(1), at(2), at(3), at(4), null, null, at(1), at(1), at(2)],
        // A duplicate transport row must not double count the same flow.
        [A, at(0), at(1), at(2), at(3), at(4), null, null, at(1), at(1), at(2)],
        [B, at(1), at(2), null, at(3), null, at(2), null, at(2), at(2), null],
        // Completion precedes the block, so the block remains unresolved.
        [C, at(2), at(2), at(3), null, null, null, at(4), at(4), null, null],
        ["patient@example.com", at(0), at(1), at(2), at(3), at(4), null, null, null, null, null],
        ["11111111-1111-1111-8111-111111111111", at(0), at(1), at(2), at(3), at(4), null, null, null, null, null],
        // Half-open start cohort excludes exactly `to`.
        ["44444444-4444-4444-8444-444444444444", TO.toISOString(), at(4), at(5), at(5), at(5), null, null, null, null, null],
      ],
      from: FROM,
      to: TO,
    })

    expect(snapshot.availability).toBe("available")
    expect(snapshot.flowIdCoveragePercent).toBe(100)
    expect(snapshot.intakeStartedFlows).toBe(3)
    expect(snapshot.checkoutInitiatedFlows).toBe(2)
    expect(snapshot.purchaseCompletedFlows).toBe(1)
    expect(snapshot.repeatRx).toEqual({
      clinicalHardBlockFlows: 1,
      medicationCompletedFlows: 2,
      medicationViewedFlows: 3,
      mobileCompletionPercent: 50,
      serviceSteerFlows: 1,
      unresolvedValidationBlockedFlows: 2,
      validationBlockedFlows: 3,
    })
    expect(JSON.stringify(snapshot)).not.toMatch(/11111111|patient@example|flow_instance_id/i)
  })

  it("ignores downstream events before start or after the independent observation cutoff", () => {
    const snapshot = buildPostHogReleaseConversionSnapshot({
      asOf: AS_OF,
      coverageResults: [["intake_started", 1, 1]],
      flowResults: [[
        A,
        at(2),
        at(1),
        at(20),
        at(1),
        at(20),
        at(1),
        at(20),
        at(20),
        at(1),
        at(20),
      ]],
      from: FROM,
      to: TO,
    })

    expect(snapshot.intakeStartedFlows).toBe(1)
    expect(snapshot.checkoutInitiatedFlows).toBe(0)
    expect(snapshot.purchaseCompletedFlows).toBe(0)
    expect(snapshot.repeatRx).toMatchObject({
      clinicalHardBlockFlows: 0,
      medicationCompletedFlows: 0,
      medicationViewedFlows: 0,
      serviceSteerFlows: 0,
      validationBlockedFlows: 0,
    })
  })

  it("uses the weakest non-empty core event coverage without treating zero blockers as missing", () => {
    const degraded = buildPostHogReleaseConversionSnapshot({
      asOf: AS_OF,
      coverageResults: [
        ["intake_started", 100, 100],
        ["step_viewed", 1_000, 1_000],
        ["checkout_initiated", 10, 0],
        ["intake_validation_blocked", 0, 0],
      ],
      flowResults: [[A, at(0), null, null, null, null, null, null, null, null, null]],
      from: FROM,
      to: TO,
    })
    expect(degraded).toMatchObject({
      availability: "degraded",
      flowIdCoveragePercent: 0,
      reason: "flow_id_coverage_below_90_percent",
    })

    const noEvidence = buildPostHogReleaseConversionSnapshot({
      asOf: AS_OF,
      coverageResults: [["intake_validation_blocked", 0, 0]],
      flowResults: [],
      from: FROM,
      to: TO,
    })
    expect(noEvidence.availability).toBe("unavailable")
    expect(noEvidence.intakeStartedFlows).toBeNull()
  })

  it("withholds a partial cohort until asOf reaches the exact cohort end", () => {
    const input = {
      coverageResults: [["intake_started", 1, 1]],
      flowResults: [[A, at(0), at(1), at(2), at(3), at(4), null, null, null, null, null]],
      from: FROM,
      to: TO,
    }
    const inProgress = buildPostHogReleaseConversionSnapshot({
      ...input,
      asOf: new Date(TO.getTime() - 1),
    })
    expect(inProgress).toMatchObject({
      availability: "degraded",
      cohortStatus: "in_progress",
      intakeStartedFlows: null,
      reason: "cohort_in_progress",
    })
    const complete = buildPostHogReleaseConversionSnapshot({ ...input, asOf: TO })
    expect(complete.cohortStatus).toBe("complete")
    expect(complete.intakeStartedFlows).toBe(1)
  })

  it("fails closed for missing credentials, forbidden, timeout, and malformed responses", async () => {
    const window = { asOf: AS_OF, from: FROM, to: TO }
    const missing = await getPostHogReleaseConversionSnapshot(window, {
      env: {},
      fetchImpl: vi.fn(),
    })
    expect(missing).toMatchObject({
      availability: "unavailable",
      cohortStatus: "unavailable",
      intakeStartedFlows: null,
      reason: "posthog_not_configured",
    })

    const forbidden = await getPostHogReleaseConversionSnapshot(window, {
      env: {
        POSTHOG_PROJECT_API_KEY: "secret",
        POSTHOG_PROJECT_ID: "123",
      },
      fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    })
    expect(forbidden.reason).toBe("posthog_forbidden")

    const timeoutError = Object.assign(new Error("socket detail"), { name: "TimeoutError" })
    const timeout = await getPostHogReleaseConversionSnapshot(window, {
      env: {
        POSTHOG_PROJECT_API_KEY: "secret",
        POSTHOG_PROJECT_ID: "123",
      },
      fetchImpl: vi.fn().mockRejectedValue(timeoutError),
    })
    expect(timeout.reason).toBe("posthog_timeout")

    const malformed = await getPostHogReleaseConversionSnapshot(window, {
      env: {
        POSTHOG_PROJECT_API_KEY: "secret",
        POSTHOG_PROJECT_ID: "123",
      },
      fetchImpl: vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ results: "not rows" }),
        ok: true,
        status: 200,
      }),
    })
    expect(malformed.reason).toBe("posthog_malformed_response")
  })

  it("reduces successful mock transports without returning query rows or credentials", async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)) as { name: string }
      return {
        json: async () => ({
          results: request.name.includes("coverage")
            ? [["intake_started", 1, 1]]
            : request.name.includes("count")
              ? [[1]]
              : [[A, at(0), at(1), at(2), at(3), at(4), null, null, null, at(1), at(2)]],
        }),
        ok: true,
        status: 200,
      }
    })
    const snapshot = await getPostHogReleaseConversionSnapshot(
      { asOf: AS_OF, from: FROM, to: TO },
      {
        env: {
          NEXT_PUBLIC_POSTHOG_HOST: "https://eu.posthog.com/",
          POSTHOG_PROJECT_API_KEY: "secret-project-key",
          POSTHOG_PROJECT_ID: "123",
        },
        fetchImpl,
      },
    )
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(snapshot).toMatchObject({
      availability: "available",
      checkoutInitiatedFlows: 1,
      intakeStartedFlows: 1,
      purchaseCompletedFlows: 1,
    })
    expect(JSON.stringify(snapshot)).not.toMatch(/secret-project-key|11111111|results|query/i)
  })

  it("fails closed when the flow cohort crosses the overflow sentinel", async () => {
    const overflowRows = Array.from({ length: 50_001 }, (_, index) => {
      const suffix = index.toString(16).padStart(12, "0")
      return [
        `aaaaaaaa-aaaa-4aaa-8aaa-${suffix}`,
        at(0),
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        50_001,
      ]
    })
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)) as { name: string }
      return {
        json: async () => ({
          results: request.name.includes("coverage")
            ? [["intake_started", 50_001, 50_001]]
            : request.name.includes("count")
              ? [[50_001]]
              : overflowRows,
        }),
        ok: true,
        status: 200,
      }
    })

    const snapshot = await getPostHogReleaseConversionSnapshot(
      { asOf: AS_OF, from: FROM, to: TO },
      {
        env: {
          POSTHOG_PROJECT_API_KEY: "secret-project-key",
          POSTHOG_PROJECT_ID: "123",
        },
        fetchImpl,
      },
    )

    expect(snapshot).toMatchObject({
      availability: "unavailable",
      intakeStartedFlows: null,
      reason: "posthog_flow_cohort_truncated",
    })
  })

  it("fails closed when PostHog's exact distinct-flow total disagrees with returned flow rows", async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)) as { name: string }
      return {
        json: async () => ({
          results: request.name.includes("coverage")
            ? [["intake_started", 1, 1]]
            : request.name.includes("count")
              ? [[2]]
              : [[A, at(0), null, null, null, null, null, null, null, null, null]],
        }),
        ok: true,
        status: 200,
      }
    })

    const snapshot = await getPostHogReleaseConversionSnapshot(
      { asOf: AS_OF, from: FROM, to: TO },
      {
        env: {
          POSTHOG_PROJECT_API_KEY: "secret-project-key",
          POSTHOG_PROJECT_ID: "123",
        },
        fetchImpl,
      },
    )

    expect(snapshot).toMatchObject({
      availability: "unavailable",
      intakeStartedFlows: null,
      reason: "posthog_flow_count_mismatch",
    })
  })

  it("pins HogQL to uniqExact, valid v4 flow ids, exclusive cohort end, and approved events only", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/analytics/posthog-release-conversion.ts"),
      "utf8",
    )
    expect(source).toContain('import "server-only"')
    expect(source).toContain("uniqExact")
    expect(source).toContain("AS exact_started_flows")
    expect(source).not.toContain("uniqExactIf")
    expect(source).toContain("POSTHOG_FLOW_OVERFLOW_SENTINEL = MAX_POSTHOG_FLOW_ROWS + 1")
    expect(source).toContain("LIMIT ${POSTHOG_FLOW_OVERFLOW_SENTINEL}")
    expect(source).toContain("flow_instance_id")
    expect(source).toContain("timestamp < toDateTime64")
    expect(source).toContain("intake_started")
    expect(source).toContain("step_viewed")
    expect(source).toContain("step_completed")
    expect(source).toContain("checkout_initiated")
    expect(source).toContain("purchase_completed_server")
    expect(source).toContain("intake_validation_blocked")
    expect(source).toContain("resolution")
    expect(source).toContain("shown")
    expect(source).toContain("$device_type")
    expect(source).toContain("Mobile")
    expect(source).not.toContain("distinct_id")
    expect(source).not.toContain("$session_id")
    expect(source).not.toContain("request_id")
    expect(source).not.toContain("intake_id")
    expect(source).not.toContain("event_uuid")
  })
})
