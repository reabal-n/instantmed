import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  acquireCronLock: vi.fn(),
  captureCronError: vi.fn(),
  recordCronHeartbeat: vi.fn(),
  releaseCronLock: vi.fn(),
  runStripeRefundRecovery: vi.fn(),
  stripe: { source: "singleton" },
  supabase: { source: "service-role" },
  verifyCronRequest: vi.fn(),
}))

vi.mock("@/lib/api/cron-auth", () => ({
  acquireCronLock: mocks.acquireCronLock,
  releaseCronLock: mocks.releaseCronLock,
  verifyCronRequest: mocks.verifyCronRequest,
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
  captureCronError: mocks.captureCronError,
}))
vi.mock("@/lib/stripe/client", () => ({ stripe: mocks.stripe }))
vi.mock("@/lib/stripe/refund-recovery-runner", () => ({
  runStripeRefundRecovery: mocks.runStripeRefundRecovery,
}))
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => mocks.supabase,
}))

import { GET } from "@/app/api/cron/refund-reconciliation/route"

const request = new NextRequest(
  "https://instantmed.example/api/cron/refund-reconciliation",
)

describe("refund reconciliation cron", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.acquireCronLock.mockResolvedValue({ acquired: true })
    mocks.captureCronError.mockReturnValue("sentry-event")
    mocks.recordCronHeartbeat.mockResolvedValue(undefined)
    mocks.releaseCronLock.mockResolvedValue(undefined)
    mocks.verifyCronRequest.mockReturnValue(null)
    mocks.runStripeRefundRecovery.mockResolvedValue({
      claimed: 2,
      errors: [],
      failed: 0,
      manualReview: 0,
      processed: 2,
    })
  })

  it("stops before locking when cron authentication fails", async () => {
    const authFailure = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    mocks.verifyCronRequest.mockReturnValue(authFailure)

    const response = await GET(request)

    expect(response).toBe(authFailure)
    expect(mocks.acquireCronLock).not.toHaveBeenCalled()
    expect(mocks.runStripeRefundRecovery).not.toHaveBeenCalled()
  })

  it("runs a bounded service-role batch and records success after completion", async () => {
    const response = await GET(request)

    expect(mocks.acquireCronLock).toHaveBeenCalledWith("refund-reconciliation")
    expect(mocks.runStripeRefundRecovery).toHaveBeenCalledWith(
      { stripe: mocks.stripe, supabase: mocks.supabase },
      { limit: 25 },
    )
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "refund-reconciliation",
      expect.objectContaining({ itemsProcessed: 2, status: "ok" }),
    )
    expect(mocks.releaseCronLock).toHaveBeenCalledWith("refund-reconciliation")
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      claimed: 2,
      failed: 0,
      manual_review: 0,
      processed: 2,
      success: true,
    })
  })

  it("returns a failed outcome and truthful heartbeat for partial recovery", async () => {
    mocks.runStripeRefundRecovery.mockResolvedValue({
      claimed: 2,
      errors: [{ attemptId: "redacted-by-route", code: "observation_failed" }],
      failed: 1,
      manualReview: 0,
      processed: 1,
    })

    const response = await GET(request)

    expect(response.status).toBe(500)
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "refund-reconciliation",
      expect.objectContaining({ itemsProcessed: 1, status: "partial_failure" }),
    )
    const payload = await response.json()
    expect(payload).toMatchObject({ failed: 1, processed: 1, success: false })
    expect(JSON.stringify(payload)).not.toContain("redacted-by-route")
    expect(mocks.releaseCronLock).toHaveBeenCalled()
  })

  it.each([
    {
      expectedStatus: 503,
      heartbeatStatus: "configuration_error",
      lock: { acquired: false, reason: "unavailable" },
      success: false,
    },
    {
      expectedStatus: 200,
      heartbeatStatus: "skipped",
      lock: { acquired: false, existingLockAge: 30, reason: "held" },
      success: true,
    },
  ])("distinguishes lock storage failure from overlap", async ({
    expectedStatus,
    heartbeatStatus,
    lock,
    success,
  }) => {
    mocks.acquireCronLock.mockResolvedValue(lock)

    const response = await GET(request)

    expect(response.status).toBe(expectedStatus)
    await expect(response.json()).resolves.toMatchObject({ success })
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "refund-reconciliation",
      expect.objectContaining({ status: heartbeatStatus }),
    )
    expect(mocks.runStripeRefundRecovery).not.toHaveBeenCalled()
    expect(mocks.releaseCronLock).not.toHaveBeenCalled()
  })

  it("records and releases after an unexpected runner failure", async () => {
    mocks.runStripeRefundRecovery.mockRejectedValue(new Error("runner failed"))

    const response = await GET(request)

    expect(response.status).toBe(500)
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "refund-reconciliation",
      expect.objectContaining({ status: "error" }),
    )
    expect(mocks.captureCronError).toHaveBeenCalledWith(
      expect.any(Error),
      { jobName: "refund-reconciliation" },
    )
    expect(mocks.releaseCronLock).toHaveBeenCalledWith("refund-reconciliation")
  })
})
