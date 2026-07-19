import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  is: vi.fn(),
  limit: vi.fn(),
  markReviewRequestCommunicationOutcome: vi.fn(),
  select: vi.fn(),
}))

vi.mock("@/lib/email/review-request-policy", () => ({
  markReviewRequestCommunicationOutcome:
    mocks.markReviewRequestCommunicationOutcome,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: mocks.from,
  }),
}))

import { reconcileSentReviewRequestMarkers } from "@/lib/email/review-request"

describe("reconcileSentReviewRequestMarkers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = {
      eq: mocks.eq,
      is: mocks.is,
      limit: mocks.limit,
      select: mocks.select,
    }
    mocks.from.mockReturnValue(chain)
    mocks.select.mockReturnValue(chain)
    mocks.is.mockReturnValue(chain)
    mocks.eq.mockReturnValue(chain)
    mocks.limit.mockResolvedValue({
      data: [{ id: "intake-old" }],
      error: null,
    })
    mocks.markReviewRequestCommunicationOutcome.mockResolvedValue({
      kind: "sent",
      outboxId: "durable-review-row",
    })
  })

  it("heals missing sent markers from durable sent outbox proof without an age gate", async () => {
    await expect(reconcileSentReviewRequestMarkers()).resolves.toEqual({
      reconciled: 1,
      failed: 0,
    })

    expect(mocks.from).toHaveBeenCalledWith("intakes")
    expect(mocks.select).toHaveBeenCalledWith(
      "id, email_outbox!inner(id)",
    )
    expect(mocks.is).toHaveBeenCalledWith("review_email_sent_at", null)
    expect(mocks.is).toHaveBeenCalledWith("review_email_suppressed_at", null)
    expect(mocks.eq).toHaveBeenCalledWith(
      "email_outbox.email_type",
      "review_request",
    )
    expect(mocks.eq).toHaveBeenCalledWith("email_outbox.status", "sent")
    expect(mocks.markReviewRequestCommunicationOutcome).toHaveBeenCalledWith(
      "intake-old",
      { kind: "sent" },
    )
  })

  it("surfaces a reconciliation query failure instead of treating it as zero work", async () => {
    mocks.limit.mockResolvedValueOnce({
      data: null,
      error: { message: "db unavailable" },
    })

    await expect(reconcileSentReviewRequestMarkers()).rejects.toThrow(
      "Failed to reconcile sent review request markers",
    )
  })
})
