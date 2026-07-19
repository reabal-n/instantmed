import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      update: mocks.update,
    }),
  }),
}))

import { markReviewRequestCommunicationOutcome } from "@/lib/email/review-request-policy"

describe("markReviewRequestCommunicationOutcome", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = {
      eq: mocks.eq,
      is: mocks.is,
      select: mocks.select,
      maybeSingle: mocks.maybeSingle,
    }
    mocks.update.mockReturnValue(chain)
    mocks.eq.mockReturnValue(chain)
    mocks.is.mockReturnValue(chain)
    mocks.select.mockReturnValue(chain)
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
})
