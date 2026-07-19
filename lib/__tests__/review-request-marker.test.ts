import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: mocks.from,
  }),
}))

import { finalizeOutboxSequenceDisposition } from "@/lib/email/outbox-disposition"

describe("review request sequence finalization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = {
      eq: mocks.eq,
      is: mocks.is,
      then: (
        resolve: (value: { error: null }) => void,
      ) => resolve({ error: null }),
    }
    mocks.from.mockReturnValue({ update: mocks.update })
    mocks.update.mockReturnValue(chain)
    mocks.eq.mockReturnValue(chain)
    mocks.is.mockReturnValue(chain)
  })

  it.each([
    ["sent", "review_email_sent_at", "review_email_suppressed_at"],
    ["suppressed", "review_email_suppressed_at", "review_email_sent_at"],
  ] as const)(
    "writes only the %s marker with a mutually exclusive CAS",
    async (disposition, marker, oppositeMarker) => {
      await expect(finalizeOutboxSequenceDisposition({
        id: "outbox-1",
        email_type: "review_request",
        intake_id: "intake-1",
        metadata: {},
      }, disposition)).resolves.toEqual({ finalized: true })

      expect(mocks.update).toHaveBeenCalledWith({
        [marker]: expect.any(String),
      })
      expect(mocks.update.mock.calls[0][0]).not.toHaveProperty(oppositeMarker)
      expect(mocks.is).toHaveBeenCalledWith(marker, null)
      expect(mocks.is).toHaveBeenCalledWith(oppositeMarker, null)
    },
  )

  it("reports a marker persistence failure without changing disposition truth", async () => {
    const failingChain = {
      eq: mocks.eq,
      is: mocks.is,
      then: (
        resolve: (value: { error: { message: string } }) => void,
      ) => resolve({ error: { message: "db unavailable" } }),
    }
    mocks.update.mockReturnValue(failingChain)
    mocks.eq.mockReturnValue(failingChain)
    mocks.is.mockReturnValue(failingChain)

    await expect(finalizeOutboxSequenceDisposition({
      id: "outbox-1",
      email_type: "review_request",
      intake_id: "intake-1",
      metadata: {},
    }, "sent")).resolves.toEqual({
      finalized: false,
      reason: "marker_write_failed",
    })
  })
})
