import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: mocks.from,
  }),
}))

import { finalizeOutboxSequenceDisposition } from "@/lib/email/outbox-disposition"

describe("lifecycle sequence finalization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = {
      eq: mocks.eq,
      is: mocks.is,
      select: mocks.select,
      maybeSingle: mocks.maybeSingle,
    }
    mocks.from.mockReturnValue({
      update: mocks.update,
      select: mocks.select,
    })
    mocks.update.mockReturnValue(chain)
    mocks.eq.mockReturnValue(chain)
    mocks.is.mockReturnValue(chain)
    mocks.select.mockReturnValue(chain)
    mocks.maybeSingle.mockResolvedValue({
      data: { id: "intake-1" },
      error: null,
    })
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
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "db unavailable" },
    })

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

  it("treats an already-written same marker as idempotently finalized", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          review_email_sent_at: "2026-07-19T00:00:00.000Z",
          review_email_suppressed_at: null,
        },
        error: null,
      })

    await expect(finalizeOutboxSequenceDisposition({
      id: "outbox-1",
      email_type: "review_request",
      intake_id: "intake-1",
      metadata: {},
    }, "sent")).resolves.toEqual({ finalized: true })
  })

  it("reports when the opposite terminal marker won the CAS", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          review_email_sent_at: null,
          review_email_suppressed_at: "2026-07-19T00:00:00.000Z",
        },
        error: null,
      })

    await expect(finalizeOutboxSequenceDisposition({
      id: "outbox-1",
      email_type: "review_request",
      intake_id: "intake-1",
      metadata: {},
    }, "sent")).resolves.toEqual({
      finalized: false,
      reason: "marker_conflict",
    })
  })

  it("reports a missing source record after a zero-row marker write", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    await expect(finalizeOutboxSequenceDisposition({
      id: "outbox-1",
      email_type: "review_request",
      intake_id: "intake-1",
      metadata: {},
    }, "sent")).resolves.toEqual({
      finalized: false,
      reason: "record_missing",
    })
  })

  it.each([
    ["sent", "recovery_email_sent_at", "recovery_email_suppressed_at"],
    [
      "suppressed",
      "recovery_email_suppressed_at",
      "recovery_email_sent_at",
    ],
  ] as const)(
    "writes only the partial-recovery %s marker by non-bearer tracking ID",
    async (disposition, marker, oppositeMarker) => {
      await expect(finalizeOutboxSequenceDisposition({
        id: "outbox-recovery",
        email_type: "partial_intake_recovery",
        intake_id: null,
        metadata: {
          recovery_tracking_id: "tracking-1",
        },
      }, disposition)).resolves.toEqual({ finalized: true })

      expect(mocks.from).toHaveBeenCalledWith("partial_intakes")
      expect(mocks.update).toHaveBeenCalledWith({
        [marker]: expect.any(String),
      })
      expect(mocks.eq).toHaveBeenCalledWith(
        "recovery_tracking_id",
        "tracking-1",
      )
      expect(mocks.is).toHaveBeenCalledWith(marker, null)
      expect(mocks.is).toHaveBeenCalledWith(oppositeMarker, null)
    },
  )
})
