import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  finalizeOutboxSequenceDisposition: vi.fn(),
  from: vi.fn(),
  is: vi.fn(),
  limit: vi.fn(),
  select: vi.fn(),
}))

vi.mock("@/lib/email/outbox-disposition", () => ({
  finalizeOutboxSequenceDisposition:
    mocks.finalizeOutboxSequenceDisposition,
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
      data: [{
        id: "intake-old",
        email_outbox: [{
          id: "outbox-sent",
          email_type: "review_request",
          metadata: null,
        }],
      }],
      error: null,
    })
    mocks.finalizeOutboxSequenceDisposition.mockResolvedValue({
      finalized: true,
    })
  })

  it("heals a missing marker only from durable sent outbox proof", async () => {
    await expect(reconcileSentReviewRequestMarkers()).resolves.toEqual({
      reconciled: 1,
      failed: 0,
    })

    expect(mocks.from).toHaveBeenCalledWith("intakes")
    expect(mocks.is).toHaveBeenCalledWith("review_email_sent_at", null)
    expect(mocks.is).toHaveBeenCalledWith(
      "review_email_suppressed_at",
      null,
    )
    expect(mocks.eq).toHaveBeenCalledWith(
      "email_outbox.email_type",
      "review_request",
    )
    expect(mocks.eq).toHaveBeenCalledWith("email_outbox.status", "sent")
    expect(mocks.finalizeOutboxSequenceDisposition).toHaveBeenCalledWith(
      {
        id: "outbox-sent",
        email_type: "review_request",
        intake_id: "intake-old",
        metadata: null,
      },
      "sent",
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
