import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  finalizeOutboxSequenceDisposition: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock("@/lib/email/outbox-disposition", () => ({
  finalizeOutboxSequenceDisposition:
    mocks.finalizeOutboxSequenceDisposition,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    rpc: mocks.rpc,
  }),
}))

import {
  reconcileSentPartialIntakeRecoveryMarkers,
} from "@/lib/email/partial-intake-recovery-reconciliation"

describe("partial-intake recovery sent-marker reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rpc.mockResolvedValue({ data: [], error: null })
    mocks.finalizeOutboxSequenceDisposition.mockResolvedValue({
      finalized: true,
    })
  })

  it("heals markers only from the schema RPC's sent-status proof", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [
        { recovery_tracking_id: "tracking-sent-1" },
        { recovery_tracking_id: "tracking-sent-2" },
      ],
      error: null,
    })
    mocks.finalizeOutboxSequenceDisposition
      .mockResolvedValueOnce({ finalized: true })
      .mockResolvedValueOnce({
        finalized: false,
        reason: "marker_write_failed",
      })

    await expect(
      reconcileSentPartialIntakeRecoveryMarkers(500),
    ).resolves.toEqual({
      reconciled: 1,
      failed: 1,
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      "get_unmarked_sent_partial_recoveries",
      { p_limit: 50 },
    )
    expect(mocks.finalizeOutboxSequenceDisposition).toHaveBeenNthCalledWith(
      1,
      {
        id: "partial-recovery:tracking-sent-1:policy",
        email_type: "partial_intake_recovery",
        intake_id: null,
        metadata: {
          recovery_tracking_id: "tracking-sent-1",
        },
      },
      "sent",
    )
  })

  it("does not treat malformed proof rows as sent", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [
        { recovery_tracking_id: null },
        { recovery_tracking_id: "" },
      ],
      error: null,
    })

    await expect(
      reconcileSentPartialIntakeRecoveryMarkers(),
    ).resolves.toEqual({
      reconciled: 0,
      failed: 2,
    })
    expect(mocks.finalizeOutboxSequenceDisposition).not.toHaveBeenCalled()
  })

  it("surfaces an RPC failure instead of inferring sent state", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "database unavailable" },
    })

    await expect(
      reconcileSentPartialIntakeRecoveryMarkers(),
    ).rejects.toThrow(
      "Failed to fetch sent partial recovery outbox proof",
    )
    expect(mocks.finalizeOutboxSequenceDisposition).not.toHaveBeenCalled()
  })
})
