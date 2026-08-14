import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  createServiceRoleClient: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: mocks.logError,
    info: vi.fn(),
    warn: mocks.logWarn,
  }),
}))

interface HeartbeatRow {
  job_name: string
  last_run_at: string | null
  last_status: string
  last_success_at: string | null
}

function createHeartbeatClient(input: {
  heartbeats: HeartbeatRow[]
  deploymentStartedAt?: string
  claimed?: Array<{ job_name: string; outage_key: string }>
  claimError?: { message: string } | null
}) {
  const heartbeatSelect = vi.fn(async () => ({
    data: input.heartbeats,
    error: null,
  }))
  const rpc = vi.fn(async (name: string) => {
    if (name === "get_or_create_cron_watchdog_deployment") {
      return {
        data: input.deploymentStartedAt ?? "2026-08-15T19:50:00.000Z",
        error: null,
      }
    }
    if (name === "claim_cron_heartbeat_alerts") {
      return {
        data: input.claimed ?? [],
        error: input.claimError ?? null,
      }
    }
    throw new Error(`Unexpected RPC: ${name}`)
  })
  const client = {
    from: vi.fn(() => ({ select: heartbeatSelect })),
    rpc,
  }

  return { client, rpc }
}

describe("cron heartbeat outage classification", () => {
  it("includes never-run jobs only after the durable deployment grace", async () => {
    const {
      CRON_WATCHDOG_DEPLOYMENT_GRACE_MINUTES,
      findCronHeartbeatOutages,
    } = await import("@/lib/monitoring/cron-heartbeat")
    const nowMs = Date.parse("2026-08-15T20:00:00.000Z")

    const duringGrace = findCronHeartbeatOutages({
      heartbeats: [],
      nowMs,
      deploymentStartedAtMs: nowMs - 29 * 60_000,
      deploymentKey: "dpl_current",
    })
    const afterGrace = findCronHeartbeatOutages({
      heartbeats: [],
      nowMs,
      deploymentStartedAtMs: nowMs - 31 * 60_000,
      deploymentKey: "dpl_current",
    })

    expect(CRON_WATCHDOG_DEPLOYMENT_GRACE_MINUTES).toBe(30)
    expect(duringGrace).toEqual([])
    expect(afterGrace).toContainEqual(expect.objectContaining({
      jobName: "posthog-reconciliation",
      lastRunAt: null,
      status: "never_run",
      outageKey: "never:dpl_current",
    }))
  })

  it("keeps repeated failed attempts in one outage until a success rearms it", async () => {
    const { findCronHeartbeatOutages } = await import("@/lib/monitoring/cron-heartbeat")
    const nowMs = Date.parse("2026-08-15T20:00:00.000Z")
    const base = {
      nowMs,
      deploymentStartedAtMs: nowMs - 10 * 60_000,
      deploymentKey: "dpl_current",
    }

    const firstFailure = findCronHeartbeatOutages({
      ...base,
      heartbeats: [{
        job_name: "posthog-reconciliation",
        last_run_at: "2026-08-15T19:10:00.000Z",
        last_status: "configuration_error",
        last_success_at: "2026-08-15T18:15:00.000Z",
      }],
    })[0]
    const repeatedFailure = findCronHeartbeatOutages({
      ...base,
      heartbeats: [{
        job_name: "posthog-reconciliation",
        last_run_at: "2026-08-15T19:15:00.000Z",
        last_status: "configuration_error",
        last_success_at: "2026-08-15T18:15:00.000Z",
      }],
    })[0]
    const failureAfterRecovery = findCronHeartbeatOutages({
      ...base,
      heartbeats: [{
        job_name: "posthog-reconciliation",
        last_run_at: "2026-08-15T19:45:00.000Z",
        last_status: "configuration_error",
        last_success_at: "2026-08-15T19:30:00.000Z",
      }],
    })[0]

    expect(firstFailure.outageKey).toBe(repeatedFailure.outageKey)
    expect(failureAfterRecovery.outageKey).not.toBe(firstFailure.outageKey)
  })
})

describe("cron heartbeat outcome recording", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-15T20:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("advances last success only for a successful final outcome", async () => {
    const upsert = vi.fn(async () => ({ error: null }))
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    })
    const { recordCronHeartbeat } = await import("@/lib/monitoring/cron-heartbeat")

    await recordCronHeartbeat("posthog-reconciliation", { status: "ok" })
    await recordCronHeartbeat("posthog-reconciliation", {
      status: "configuration_error",
    })

    expect(upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        last_status: "ok",
        last_success_at: "2026-08-15T20:00:00.000Z",
      }),
      { onConflict: "job_name", defaultToNull: false },
    )
    expect(upsert.mock.calls[1]?.[0]).not.toHaveProperty("last_success_at")
    expect(upsert.mock.calls[1]?.[1]).toEqual({
      onConflict: "job_name",
      defaultToNull: false,
    })
  })
})

describe("cron heartbeat atomic alert claims", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-15T20:00:00.000Z"))
    vi.stubEnv("VERCEL_DEPLOYMENT_ID", "dpl_current")
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("emits only the newly claimed subset under concurrent watchdog runs", async () => {
    const harness = createHeartbeatClient({
      heartbeats: [
        {
          job_name: "google-ads-daily-brief",
          last_run_at: "2026-08-13T00:00:00.000Z",
          last_status: "ok",
          last_success_at: "2026-08-13T00:00:00.000Z",
        },
        {
          job_name: "posthog-reconciliation",
          last_run_at: "2026-08-15T19:00:00.000Z",
          last_status: "configuration_error",
          last_success_at: "2026-08-15T18:15:00.000Z",
        },
      ],
      claimed: [{
        job_name: "posthog-reconciliation",
        outage_key: "failed:2026-08-15T18:15:00.000Z",
      }],
    })
    mocks.createServiceRoleClient.mockReturnValue(harness.client)

    const { checkCronHeartbeats } = await import("@/lib/monitoring/cron-heartbeat")
    const result = await checkCronHeartbeats()

    expect(result.healthy).toBe(false)
    expect(result.overdue).toHaveLength(2)
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "1 critical cron job(s) newly overdue",
      expect.objectContaining({
        level: "error",
        tags: expect.objectContaining({
          overdue_count: "1",
          total_overdue_count: "2",
        }),
        extra: {
          overdue: [expect.objectContaining({
            jobName: "posthog-reconciliation",
            status: "configuration_error",
          })],
        },
      }),
    )
    expect(harness.rpc).toHaveBeenCalledWith(
      "claim_cron_heartbeat_alerts",
      expect.objectContaining({ p_outages: expect.any(Array) }),
    )
  })

  it("does not emit when another invocation already owns the outage", async () => {
    const harness = createHeartbeatClient({
      heartbeats: [{
        job_name: "posthog-reconciliation",
        last_run_at: "2026-08-15T19:00:00.000Z",
        last_status: "configuration_error",
        last_success_at: null,
      }],
      claimed: [],
    })
    mocks.createServiceRoleClient.mockReturnValue(harness.client)

    const { checkCronHeartbeats } = await import("@/lib/monitoring/cron-heartbeat")
    const result = await checkCronHeartbeats()

    expect(result.healthy).toBe(false)
    expect(result.overdue).toEqual([
      expect.objectContaining({ jobName: "posthog-reconciliation" }),
    ])
    expect(mocks.captureMessage).not.toHaveBeenCalled()
    expect(mocks.logError).not.toHaveBeenCalled()
  })

  it("does not guess ownership when the atomic claim fails", async () => {
    const harness = createHeartbeatClient({
      heartbeats: [{
        job_name: "posthog-reconciliation",
        last_run_at: "2026-08-15T19:00:00.000Z",
        last_status: "configuration_error",
        last_success_at: null,
      }],
      claimError: { message: "metrics unavailable" },
    })
    mocks.createServiceRoleClient.mockReturnValue(harness.client)

    const { checkCronHeartbeats } = await import("@/lib/monitoring/cron-heartbeat")
    await checkCronHeartbeats()

    expect(mocks.logError).toHaveBeenCalledWith(
      "Could not atomically claim cron heartbeat alerts",
      { error: "metrics unavailable", overdueCount: 1 },
    )
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })
})
