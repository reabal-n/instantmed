import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  processEmailDispatch: vi.fn(),
  recordCronHeartbeat: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}))

vi.mock("@/lib/email/email-dispatcher", () => ({
  processEmailDispatch: mocks.processEmailDispatch,
}))

vi.mock("@/lib/monitoring/cron-heartbeat", () => ({
  recordCronHeartbeat: mocks.recordCronHeartbeat,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

vi.mock("@/lib/observability/sentry", () => ({
  captureCronError: vi.fn(),
}))

import { GET as runEmailDispatcherCron } from "@/app/api/cron/email-dispatcher/route"

describe("cron timeout outcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-15T20:00:00.000Z"))
    vi.stubEnv("CRON_SECRET", "test-cron-secret")
    vi.stubEnv("VERCEL", "")
    mocks.recordCronHeartbeat.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("records timeout before returning even when dispatcher work ignores abort", async () => {
    const signal: { current?: AbortSignal } = {}
    const heartbeat: { finish?: () => void } = {}
    mocks.recordCronHeartbeat.mockImplementation(() => new Promise<void>((resolve) => {
      heartbeat.finish = resolve
    }))
    mocks.processEmailDispatch.mockImplementation((receivedSignal: AbortSignal) => {
      signal.current = receivedSignal
      return new Promise(() => {})
    })

    const responsePromise = runEmailDispatcherCron(new NextRequest(
      "https://instantmed.example/api/cron/email-dispatcher",
      { headers: { authorization: "Bearer test-cron-secret" } },
    ))

    await vi.advanceTimersByTimeAsync(50_000)
    let responseSettled = false
    void responsePromise.then(() => {
      responseSettled = true
    })

    expect(signal.current?.aborted).toBe(true)
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "email-dispatcher",
      expect.objectContaining({ status: "timeout" }),
    )
    expect(responseSettled).toBe(false)

    heartbeat.finish?.()
    const response = await responsePromise
    await expect(response.json()).resolves.toMatchObject({
      partial: true,
      success: true,
    })
  })
})
