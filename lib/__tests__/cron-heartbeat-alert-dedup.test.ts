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
  last_failure_at?: string | null
  last_failure_status?: string | null
}

function createHeartbeatClient(input: {
  heartbeats: HeartbeatRow[]
  heartbeatReadError?: { message: string } | null
  deploymentStartedAt?: string
  claimed?: unknown
  claimError?: { message: string } | null
}) {
  const heartbeatSelect = vi.fn(async () => ({
    data: input.heartbeats,
    error: input.heartbeatReadError ?? null,
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
  it("uses schedule-aware grace before classifying a job as never run", async () => {
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
    const afterDailyGrace = findCronHeartbeatOutages({
      heartbeats: [],
      nowMs,
      deploymentStartedAtMs: nowMs - 1501 * 60_000,
      deploymentKey: "dpl_current",
    })

    expect(CRON_WATCHDOG_DEPLOYMENT_GRACE_MINUTES).toBe(30)
    expect(duringGrace).toEqual([])
    expect(afterGrace).toContainEqual(expect.objectContaining({
      jobName: "email-dispatcher",
      lastRunAt: null,
      status: "never_run",
      outageKey: "never:dpl_current",
    }))
    expect(afterGrace).not.toContainEqual(expect.objectContaining({
      jobName: "refill-reminders",
    }))
    expect(afterDailyGrace).toContainEqual(expect.objectContaining({
      jobName: "refill-reminders",
      lastRunAt: null,
      minutesOverdue: 1,
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

  it("keeps a neutral skip from masking failure and rearms after durable disable", async () => {
    const { findCronHeartbeatOutages } = await import("@/lib/monitoring/cron-heartbeat")
    const nowMs = Date.parse("2026-08-15T20:00:00.000Z")
    const base = {
      nowMs,
      deploymentStartedAtMs: nowMs - 10 * 60_000,
      deploymentKey: "dpl_current",
    }

    const failedThenSkipped = findCronHeartbeatOutages({
      ...base,
      heartbeats: [{
        job_name: "google-ads-daily-brief",
        last_run_at: "2026-08-15T19:30:00.000Z",
        last_status: "skipped",
        last_success_at: "2026-08-14T23:00:00.000Z",
        last_failure_at: "2026-08-15T19:00:00.000Z",
        last_failure_status: "error",
      }],
    })[0]
    const disabledRecovery = findCronHeartbeatOutages({
      ...base,
      heartbeats: [{
        job_name: "google-ads-daily-brief",
        last_run_at: "2026-08-15T19:40:00.000Z",
        last_status: "disabled",
        last_success_at: "2026-08-15T19:40:00.000Z",
        last_failure_at: "2026-08-15T19:00:00.000Z",
        last_failure_status: "error",
      }],
    })
    const failureAfterDisable = findCronHeartbeatOutages({
      ...base,
      heartbeats: [{
        job_name: "google-ads-daily-brief",
        last_run_at: "2026-08-15T19:50:00.000Z",
        last_status: "error",
        last_success_at: "2026-08-15T19:40:00.000Z",
        last_failure_at: "2026-08-15T19:50:00.000Z",
        last_failure_status: "error",
      }],
    })[0]

    expect(failedThenSkipped).toEqual(expect.objectContaining({
      jobName: "google-ads-daily-brief",
      status: "error",
      outageKey: "failed:2026-08-14T23:00:00.000Z",
    }))
    expect(disabledRecovery).toEqual([])
    expect(failureAfterDisable.outageKey).toBe(
      "failed:2026-08-15T19:40:00.000Z",
    )
    expect(failureAfterDisable.outageKey).not.toBe(failedThenSkipped.outageKey)
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

  it("rearms only completed or deliberately disabled outcomes by default", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }))
    mocks.createServiceRoleClient.mockReturnValue({
      rpc,
    })
    const { recordCronHeartbeat } = await import("@/lib/monitoring/cron-heartbeat")

    await recordCronHeartbeat("posthog-reconciliation", { status: "ok" })
    await recordCronHeartbeat("posthog-reconciliation", { status: "skipped" })
    await recordCronHeartbeat("posthog-reconciliation", { status: "disabled" })
    await recordCronHeartbeat("posthog-reconciliation", {
      status: "configuration_error",
    })

    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "record_cron_heartbeat_outcome",
      expect.objectContaining({ p_status: "ok", p_rearm_outage: true }),
    )
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "record_cron_heartbeat_outcome",
      expect.objectContaining({ p_status: "skipped", p_rearm_outage: false }),
    )
    expect(rpc).toHaveBeenNthCalledWith(
      3,
      "record_cron_heartbeat_outcome",
      expect.objectContaining({ p_status: "disabled", p_rearm_outage: true }),
    )
    expect(rpc).toHaveBeenNthCalledWith(
      4,
      "record_cron_heartbeat_outcome",
      expect.objectContaining({
        p_status: "configuration_error",
        p_rearm_outage: false,
      }),
    )
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

  it("returns unhealthy and emits a stable PHI-free signal when heartbeat state is unreadable", async () => {
    const harness = createHeartbeatClient({
      heartbeats: [],
      heartbeatReadError: { message: "relation unavailable" },
    })
    mocks.createServiceRoleClient.mockReturnValue(harness.client)

    const { checkCronHeartbeats } = await import("@/lib/monitoring/cron-heartbeat")
    const result = await checkCronHeartbeats()

    expect(result).toEqual({ overdue: [], healthy: false })
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Cron heartbeat watchdog cannot read heartbeat state",
      expect.objectContaining({
        fingerprint: ["cron-heartbeat-read-failed"],
        level: "fatal",
        tags: expect.objectContaining({
          watchdog_status: "configuration_error",
        }),
        extra: { heartbeat_state_available: false },
      }),
    )
    expect(JSON.stringify(mocks.captureMessage.mock.calls[0])).not.toMatch(
      /relation unavailable|intake|patient|email|medication/i,
    )
    expect(harness.rpc).not.toHaveBeenCalled()
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

  it("fails open with a stable PHI-free page when the atomic claim fails", async () => {
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
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Cron heartbeat alert claim failed; known outages require attention",
      expect.objectContaining({
        fingerprint: ["cron-heartbeat-alert-claim-failed"],
        level: "fatal",
        tags: expect.objectContaining({
          alert_claim_status: "configuration_error",
          overdue_count: "1",
        }),
        extra: {
          overdue: [expect.objectContaining({
            jobName: "posthog-reconciliation",
            status: "configuration_error",
          })],
        },
      }),
    )
    const sentryPayload = JSON.stringify(mocks.captureMessage.mock.calls[0])
    expect(sentryPayload).not.toMatch(/intake|patient|email|medication/i)
  })

  it("fails open when a successful claim RPC returns a malformed payload", async () => {
    const harness = createHeartbeatClient({
      heartbeats: [{
        job_name: "posthog-reconciliation",
        last_run_at: "2026-08-15T19:00:00.000Z",
        last_status: "configuration_error",
        last_success_at: null,
      }],
      claimed: [{ job_name: "posthog-reconciliation" }],
    })
    mocks.createServiceRoleClient.mockReturnValue(harness.client)

    const { checkCronHeartbeats } = await import("@/lib/monitoring/cron-heartbeat")
    const result = await checkCronHeartbeats()

    expect(result.healthy).toBe(false)
    expect(mocks.logError).toHaveBeenCalledWith(
      "Cron heartbeat alert claim returned malformed payload",
      { overdueCount: 1 },
    )
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Cron heartbeat alert claim failed; known outages require attention",
      expect.objectContaining({
        fingerprint: ["cron-heartbeat-alert-claim-failed"],
        level: "fatal",
        tags: expect.objectContaining({
          alert_claim_status: "configuration_error",
          fail_open_alert_count: "1",
        }),
        extra: {
          overdue: [expect.objectContaining({
            jobName: "posthog-reconciliation",
            status: "configuration_error",
          })],
        },
      }),
    )
    expect(JSON.stringify(mocks.captureMessage.mock.calls[0])).not.toMatch(
      /intake|patient|email|medication/i,
    )
  })
})
