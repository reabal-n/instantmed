import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: mocks.from,
  }),
}))

import { markReviewRequestCommunicationOutcome } from "@/lib/email/review-request-policy"

describe("markReviewRequestCommunicationOutcome", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const updateChain = {
      eq: mocks.eq,
      is: mocks.is,
      select: mocks.select,
      maybeSingle: mocks.maybeSingle,
    }
    mocks.from.mockReturnValue({ update: mocks.update })
    mocks.update.mockReturnValue(updateChain)
    mocks.eq.mockReturnValue(updateChain)
    mocks.is.mockReturnValue(updateChain)
    mocks.select.mockReturnValue(updateChain)
    mocks.maybeSingle.mockResolvedValue({ data: { id: "intake-1" }, error: null })
  })

  it.each([
    ["sent", "review_email_sent_at", "review_email_suppressed_at"],
    ["policy_suppressed", "review_email_suppressed_at", "review_email_sent_at"],
  ] as const)(
    "writes only the %s marker with a mutually exclusive CAS",
    async (kind, marker, otherMarker) => {
      const result = await markReviewRequestCommunicationOutcome(
        "intake-1",
        kind === "sent"
          ? { kind }
          : { kind, reason: "opted out" },
      )

      expect(result.kind).toBe(kind)
      expect(mocks.update).toHaveBeenCalledWith({
        [marker]: expect.any(String),
      })
      expect(mocks.update.mock.calls[0][0]).not.toHaveProperty(otherMarker)
      expect(mocks.is).toHaveBeenCalledWith("review_email_sent_at", null)
      expect(mocks.is).toHaveBeenCalledWith("review_email_suppressed_at", null)
    },
  )

  it("keeps a marker write failure transient and retryable", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "db unavailable" },
    })

    await expect(markReviewRequestCommunicationOutcome(
      "intake-1",
      { kind: "sent" },
    )).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "review_marker_write_failed",
    })
  })

  it("treats a zero-match CAS as idempotent when the same marker is already durable", async () => {
    const reread = vi.fn().mockResolvedValue({
      data: {
        id: "intake-1",
        review_email_sent_at: "2026-07-20T00:00:00.000Z",
        review_email_suppressed_at: null,
      },
      error: null,
    })
    const readChain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: reread,
    }
    readChain.select.mockReturnValue(readChain)
    readChain.eq.mockReturnValue(readChain)
    mocks.from
      .mockReturnValueOnce({ update: mocks.update })
      .mockReturnValueOnce(readChain)
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await expect(markReviewRequestCommunicationOutcome(
      "intake-1",
      { kind: "sent", outboxId: "outbox-1" },
    )).resolves.toEqual({
      kind: "sent",
      outboxId: "outbox-1",
    })
    expect(readChain.select).toHaveBeenCalledWith(
      "id, review_email_sent_at, review_email_suppressed_at",
    )
  })

  it("does not alarm when the sent marker already handled a stale retry", async () => {
    const readChain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "intake-1",
          review_email_sent_at: "2026-07-20T00:00:00.000Z",
          review_email_suppressed_at: null,
        },
        error: null,
      }),
    }
    readChain.select.mockReturnValue(readChain)
    readChain.eq.mockReturnValue(readChain)
    mocks.from
      .mockReturnValueOnce({ update: mocks.update })
      .mockReturnValueOnce(readChain)
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await expect(markReviewRequestCommunicationOutcome(
      "intake-1",
      {
        kind: "policy_suppressed",
        reason: "review_request_already_handled",
      },
    )).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "review_request_already_handled",
    })
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it("does not retry forever when a suppressed marker target was deleted", async () => {
    const readChain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    readChain.select.mockReturnValue(readChain)
    readChain.eq.mockReturnValue(readChain)
    mocks.from
      .mockReturnValueOnce({ update: mocks.update })
      .mockReturnValueOnce(readChain)
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await expect(markReviewRequestCommunicationOutcome(
      "missing-intake",
      { kind: "policy_suppressed", reason: "request_missing" },
    )).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "request_missing",
    })
  })

  it("keeps a zero-match reconciliation read error transient", async () => {
    const readChain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "db unavailable" },
      }),
    }
    readChain.select.mockReturnValue(readChain)
    readChain.eq.mockReturnValue(readChain)
    mocks.from
      .mockReturnValueOnce({ update: mocks.update })
      .mockReturnValueOnce(readChain)
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await expect(markReviewRequestCommunicationOutcome(
      "intake-1",
      { kind: "sent" },
    )).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "review_marker_write_failed",
    })
  })
})
