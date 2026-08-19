import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  captureCronError: vi.fn(),
  captureException: vi.fn(),
  isSydneyReviewRequestHour: vi.fn(),
  processReviewRequests: vi.fn(),
  recordCronHeartbeat: vi.fn(),
  verifyCronRequest: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}))

vi.mock("@/lib/api/cron-auth", () => ({
  verifyCronRequest: mocks.verifyCronRequest,
}))

vi.mock("@/lib/email/review-request", () => ({
  processReviewRequests: mocks.processReviewRequests,
}))

vi.mock("@/lib/email/review-request-timing", () => ({
  isSydneyReviewRequestHour: mocks.isSydneyReviewRequestHour,
}))

vi.mock("@/lib/monitoring/cron-heartbeat", () => ({
  recordCronHeartbeat: mocks.recordCronHeartbeat,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

vi.mock("@/lib/observability/sentry", () => ({
  captureCronError: mocks.captureCronError,
}))

import { GET } from "@/app/api/cron/review-request/route"

const SUCCESS_RESULT = {
  requestReconciled: 1,
  requestReconciliationFailed: 0,
  requestSent: 2,
  requestPolicySuppressed: 1,
  requestTransientlyBlocked: 0,
  requestPending: 1,
  requestProviderFailed: 0,
}

function request(): Request {
  return new Request("https://instantmed.com.au/api/cron/review-request", {
    headers: { authorization: "Bearer test" },
  })
}

describe("review request cron outcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyCronRequest.mockReturnValue(null)
    mocks.recordCronHeartbeat.mockResolvedValue(undefined)
    mocks.processReviewRequests.mockResolvedValue(SUCCESS_RESULT)
    mocks.isSydneyReviewRequestHour.mockReturnValue(true)
  })

  it("records a successful actual Sydney send run", async () => {
    const response = await GET(request() as never)

    expect(response.status).toBe(200)
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "review-request",
      expect.objectContaining({
        itemsProcessed: 5,
        status: "ok",
      }),
    )
  })

  it("records provider or reconciliation problems as a partial failure", async () => {
    mocks.processReviewRequests.mockResolvedValue({
      ...SUCCESS_RESULT,
      requestReconciliationFailed: 1,
      requestTransientlyBlocked: 1,
      requestProviderFailed: 1,
    })

    const response = await GET(request() as never)

    expect(response.status).toBe(200)
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "review-request",
      expect.objectContaining({
        itemsProcessed: 8,
        status: "partial_failure",
      }),
    )
  })

  it("does not let the daylight-saving safety slot mask a missed send run", async () => {
    mocks.isSydneyReviewRequestHour.mockReturnValue(false)

    const response = await GET(request() as never)

    expect(response.status).toBe(200)
    expect(mocks.processReviewRequests).not.toHaveBeenCalled()
    expect(mocks.recordCronHeartbeat).not.toHaveBeenCalled()
  })

  it("records an error outcome when processing throws", async () => {
    mocks.processReviewRequests.mockRejectedValue(new Error("provider unavailable"))

    const response = await GET(request() as never)

    expect(response.status).toBe(500)
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "review-request",
      expect.objectContaining({ status: "error" }),
    )
  })
})
