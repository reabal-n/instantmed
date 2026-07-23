import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireRoleOrNull: vi.fn(),
  checkServerActionRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  logAuditEvent: vi.fn(),
  revalidateStaff: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkServerActionRateLimit,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mocks.logAuditEvent,
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidateStaff: mocks.revalidateStaff,
}))

import { recordProductReviewTotalAction } from "@/app/actions/review-reputation"

const ADMIN_ID = "22222222-2222-4222-8222-222222222222"

function stubInsert(error: { message: string } | null = null) {
  const insert = vi.fn(async () => ({ error }))
  const from = vi.fn(() => ({ insert }))
  mocks.createServiceRoleClient.mockReturnValue({ from })
  return { from, insert }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireRoleOrNull.mockResolvedValue({
    user: { id: "auth-admin" },
    profile: { id: ADMIN_ID, role: "admin" },
  })
  mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
  mocks.logAuditEvent.mockResolvedValue(undefined)
})

describe("recordProductReviewTotalAction", () => {
  it("requires admin access before rate limiting or touching storage", async () => {
    mocks.requireRoleOrNull.mockResolvedValueOnce(null)
    const { from } = stubInsert()

    await expect(recordProductReviewTotalAction(5)).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    })
    expect(mocks.checkServerActionRateLimit).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it.each([-1, 1.5, 1_000_001, Number.NaN, "5"]) (
    "rejects a non-integer aggregate %p after the admin rate-limit gate",
    async (value) => {
      const { from } = stubInsert()

      await expect(recordProductReviewTotalAction(value)).resolves.toEqual({
        success: false,
        error: "Enter a whole review total between 0 and 1,000,000.",
      })
      expect(mocks.checkServerActionRateLimit).toHaveBeenCalledWith(
        `admin:${ADMIN_ID}:productreview-total-snapshot`,
        "admin",
      )
      expect(from).not.toHaveBeenCalled()
    },
  )

  it("records only the fixed aggregate metric and fixed dimensions", async () => {
    const { from, insert } = stubInsert()

    await expect(recordProductReviewTotalAction(5)).resolves.toEqual({
      success: true,
      data: { total: 5 },
    })

    expect(from).toHaveBeenCalledWith("operational_metrics")
    expect(insert).toHaveBeenCalledWith({
      metric_name: "productreview_review_total",
      metric_value: 5,
      dimensions: {
        platform: "productreview",
        source: "manual_admin_snapshot",
      },
    })
    expect(mocks.logAuditEvent).toHaveBeenCalledWith({
      action: "admin_action",
      actorId: ADMIN_ID,
      actorType: "admin",
      metadata: {
        action_type: "productreview_review_total_recorded",
        metric_name: "productreview_review_total",
        metric_value: 5,
        status: "recorded",
      },
    })
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({ paths: ["/admin/analytics"] })
  })

  it("fails closed when rate limited", async () => {
    mocks.checkServerActionRateLimit.mockResolvedValueOnce({
      success: false,
      error: "Too many requests.",
    })
    const { from } = stubInsert()

    await expect(recordProductReviewTotalAction(5)).resolves.toEqual({
      success: false,
      error: "Too many requests.",
    })
    expect(from).not.toHaveBeenCalled()
    expect(mocks.logAuditEvent).not.toHaveBeenCalled()
  })

  it("does not expose database details when the aggregate insert fails", async () => {
    stubInsert({ message: "sensitive database detail" })

    await expect(recordProductReviewTotalAction(5)).resolves.toEqual({
      success: false,
      error: "Could not record the external review total. Try again.",
    })
    expect(mocks.logAuditEvent).toHaveBeenCalledWith({
      action: "admin_action",
      actorId: ADMIN_ID,
      actorType: "admin",
      metadata: {
        action_type: "productreview_review_total_recorded",
        metric_name: "productreview_review_total",
        metric_value: 5,
        status: "failed",
        error_code: "operational_metric_insert_failed",
      },
    })
    expect(mocks.revalidateStaff).not.toHaveBeenCalled()
  })

  it("fails generically when the service client or insert throws", async () => {
    mocks.createServiceRoleClient.mockImplementationOnce(() => {
      throw new Error("sensitive client detail")
    })

    await expect(recordProductReviewTotalAction(5)).resolves.toEqual({
      success: false,
      error: "Could not record the external review total. Try again.",
    })
    expect(mocks.logAuditEvent).toHaveBeenCalledWith({
      action: "admin_action",
      actorId: ADMIN_ID,
      actorType: "admin",
      metadata: {
        action_type: "productreview_review_total_recorded",
        metric_name: "productreview_review_total",
        metric_value: 5,
        status: "failed",
        error_code: "operational_metric_insert_failed",
      },
    })
    expect(mocks.revalidateStaff).not.toHaveBeenCalled()
  })
})
