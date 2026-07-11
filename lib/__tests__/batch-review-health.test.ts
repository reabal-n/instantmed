import { describe, expect, it } from "vitest"

import {
  type BatchReviewHealth,
  buildBatchReviewOverdueAlert,
} from "@/lib/monitoring/batch-review-health"

const healthy: BatchReviewHealth = {
  pending: 2,
  overdue: 0,
  oldestApprovedAt: "2026-07-11T04:00:00.000Z",
  queryFailed: false,
}

const NOW = new Date("2026-07-11T06:00:00.000Z")

describe("batch review health", () => {
  it("does not alert while every pending certificate is inside the governance window", () => {
    expect(buildBatchReviewOverdueAlert(healthy, NOW)).toBeNull()
  })

  it("builds an aggregate-only critical alert for overdue reviews", () => {
    expect(buildBatchReviewOverdueAlert({
      pending: 4,
      overdue: 2,
      oldestApprovedAt: "2026-07-10T01:00:00.000Z",
      queryFailed: false,
    }, NOW)).toEqual({
      metric: "med_cert_batch_review_overdue",
      severity: "critical",
      count: 2,
      detail: "2 auto-approved medical certificates are past the 24h doctor-review window; oldest pending for 29h. Review them in /dashboard.",
    })
  })

  it("uses singular copy without exposing a certificate identifier", () => {
    const alert = buildBatchReviewOverdueAlert({
      pending: 1,
      overdue: 1,
      oldestApprovedAt: "2026-07-10T05:00:00.000Z",
      queryFailed: false,
    }, NOW)
    expect(alert?.detail).toContain("1 auto-approved medical certificate is past")
    expect(alert?.detail).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27,}/i)
  })

  it("does not turn a failed aggregate query into a trusted empty queue", () => {
    expect(buildBatchReviewOverdueAlert({
      pending: 0,
      overdue: 0,
      oldestApprovedAt: null,
      queryFailed: true,
    }, NOW)).toBeNull()
  })
})
