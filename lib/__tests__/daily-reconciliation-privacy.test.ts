import * as Sentry from "@sentry/nextjs"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  acquireCronLock: vi.fn(),
  getReconciliationRecords: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  recordCronHeartbeat: vi.fn(),
  releaseCronLock: vi.fn(),
  trackBusinessMetric: vi.fn(),
  verifyCronRequest: vi.fn(),
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  trackBusinessMetric: mocks.trackBusinessMetric,
}))

vi.mock("@/lib/api/cron-auth", () => ({
  acquireCronLock: mocks.acquireCronLock,
  releaseCronLock: mocks.releaseCronLock,
  verifyCronRequest: mocks.verifyCronRequest,
}))

vi.mock("@/lib/data/reconciliation", () => ({
  getReconciliationRecords: mocks.getReconciliationRecords,
}))

vi.mock("@/lib/monitoring/cron-heartbeat", () => ({
  recordCronHeartbeat: mocks.recordCronHeartbeat,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/observability/sentry", () => ({
  captureCronError: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}))

import { GET } from "@/app/api/cron/daily-reconciliation/route"

describe("daily reconciliation privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyCronRequest.mockReturnValue(null)
    mocks.acquireCronLock.mockResolvedValue({ acquired: true })
    mocks.releaseCronLock.mockResolvedValue(undefined)
    mocks.recordCronHeartbeat.mockResolvedValue(undefined)
  })

  it("does not include patient identifiers in Sentry alert payloads", async () => {
    mocks.getReconciliationRecords.mockResolvedValue({
      data: [{
        age_minutes: 180,
        category: "medical_certificate",
        created_at: new Date().toISOString(),
        delivery_details: "Approved but document not generated",
        delivery_status: "failed",
        intake_id: "intake-1",
        intake_status: "paid",
        is_mismatch: true,
        last_error: "Delivery failed",
        paid_at: new Date().toISOString(),
        patient_email: "patient@example.test",
        patient_name: "Patient Name",
        payment_id: "cs_test",
        payment_issue: null,
        payment_status: "paid",
        reference_number: "REF-123",
        refund_error: "Refund failed for patient@example.test",
        refund_failed: true,
        refund_status: "failed",
        service_type: "medical_certificate",
        stripe_payment_intent_id: "pi_test",
        subtype: "work",
      }],
      error: undefined,
      summary: {
        delivered: 0,
        failed: 1,
        mismatches: 1,
        pending: 0,
        total: 1,
      },
    })

    const response = await GET(new NextRequest("https://instantmed.example/api/cron/daily-reconciliation"))

    expect(response.status).toBe(200)
    expect(Sentry.captureMessage).toHaveBeenCalled()
    const sentryPayload = JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)
    expect(sentryPayload).not.toContain("patient@example.test")
    expect(sentryPayload).not.toContain("Patient Name")
    expect(sentryPayload).not.toContain("REF-123")
    expect(sentryPayload).not.toContain("intake-1")
  })
})
