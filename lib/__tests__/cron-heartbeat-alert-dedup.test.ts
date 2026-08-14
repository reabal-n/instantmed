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

interface AlertReceipt {
  dimensions: { job_name: string }
  recorded_at: string
}

function createHeartbeatClient(input: {
  lastRunAt: string
  receipts?: AlertReceipt[]
  receiptReadError?: { message: string } | null
  receiptWriteError?: { message: string } | null
}) {
  const heartbeatSelect = vi.fn(async () => ({
    data: [{
      job_name: "google-ads-daily-brief",
      last_run_at: input.lastRunAt,
      last_status: "ok",
    }],
    error: null,
  }))
  const receiptLimit = vi.fn(async () => ({
    data: input.receipts ?? [],
    error: input.receiptReadError ?? null,
  }))
  const receiptInsert = vi.fn(async () => ({
    error: input.receiptWriteError ?? null,
  }))
  const receiptRead = {
    eq: vi.fn(() => receiptRead),
    limit: receiptLimit,
    order: vi.fn(() => receiptRead),
    select: vi.fn(() => receiptRead),
  }
  const metricsTable = {
    ...receiptRead,
    insert: receiptInsert,
  }
  const client = {
    from: vi.fn((table: string) => (
      table === "cron_heartbeats"
        ? { select: heartbeatSelect }
        : metricsTable
    )),
  }

  return { client, receiptInsert, receiptLimit }
}

describe("cron heartbeat alert receipts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-15T20:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("suppresses an unchanged never-run outage after its first alert receipt", async () => {
    const { shouldAlertCronOutage } = await import("@/lib/monitoring/cron-heartbeat")

    expect(shouldAlertCronOutage(Date.parse("2026-08-15T00:00:00.000Z"), null))
      .toBe(false)
    expect(shouldAlertCronOutage(undefined, null)).toBe(true)
  })

  it("suppresses repeated alerts for the same unchanged outage", async () => {
    const harness = createHeartbeatClient({
      lastRunAt: "2026-08-13T00:00:00.000Z",
      receipts: [{
        dimensions: { job_name: "google-ads-daily-brief" },
        recorded_at: "2026-08-14T02:00:00.000Z",
      }],
    })
    mocks.createServiceRoleClient.mockReturnValue(harness.client)

    const { checkCronHeartbeats } = await import("@/lib/monitoring/cron-heartbeat")
    const result = await checkCronHeartbeats()

    expect(result.healthy).toBe(false)
    expect(result.overdue).toEqual([
      expect.objectContaining({ jobName: "google-ads-daily-brief" }),
    ])
    expect(mocks.captureMessage).not.toHaveBeenCalled()
    expect(mocks.logError).not.toHaveBeenCalled()
    expect(harness.receiptInsert).not.toHaveBeenCalled()
  })

  it("rearms after a later successful heartbeat starts a new outage", async () => {
    const harness = createHeartbeatClient({
      lastRunAt: "2026-08-14T00:30:00.000Z",
      receipts: [{
        dimensions: { job_name: "google-ads-daily-brief" },
        recorded_at: "2026-08-14T00:00:00.000Z",
      }],
    })
    mocks.createServiceRoleClient.mockReturnValue(harness.client)

    const { checkCronHeartbeats } = await import("@/lib/monitoring/cron-heartbeat")
    const result = await checkCronHeartbeats()

    expect(result.healthy).toBe(false)
    expect(mocks.captureMessage).toHaveBeenCalledOnce()
    expect(harness.receiptInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        metric_name: "cron_heartbeat_alert",
        dimensions: { job_name: "google-ads-daily-brief" },
      }),
    ])
  })

  it("fails open when receipt history cannot be read", async () => {
    const harness = createHeartbeatClient({
      lastRunAt: "2026-08-13T00:00:00.000Z",
      receiptReadError: { message: "metrics unavailable" },
    })
    mocks.createServiceRoleClient.mockReturnValue(harness.client)

    const { checkCronHeartbeats } = await import("@/lib/monitoring/cron-heartbeat")
    await checkCronHeartbeats()

    expect(mocks.logWarn).toHaveBeenCalledWith(
      "Could not read cron heartbeat alert receipts",
      { error: "metrics unavailable" },
    )
    expect(mocks.captureMessage).toHaveBeenCalledOnce()
    expect(harness.receiptInsert).toHaveBeenCalledOnce()
  })
})
