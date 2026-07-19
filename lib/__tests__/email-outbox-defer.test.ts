import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  eq: vi.fn(),
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

import {
  deferOutboxRow,
  updateOutboxStatus,
} from "@/lib/email/send/outbox"

describe("deferOutboxRow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = {
      eq: mocks.eq,
      select: mocks.select,
      maybeSingle: mocks.maybeSingle,
    }
    mocks.update.mockReturnValue(chain)
    mocks.eq.mockReturnValue(chain)
    mocks.select.mockReturnValue(chain)
    mocks.maybeSingle.mockResolvedValue({ data: { id: "outbox-1" }, error: null })
  })

  it("keeps the same row pending without changing retry count or frozen metadata", async () => {
    const deferred = await deferOutboxRow(
      "outbox-1",
      "2026-07-20T00:00:00.000Z",
      "patient cooldown",
    )

    expect(deferred).toBe(true)
    expect(mocks.update).toHaveBeenCalledWith({
      status: "pending",
      scheduled_for: "2026-07-20T00:00:00.000Z",
      error_message: "patient cooldown",
      last_attempt_at: expect.any(String),
    })
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("retry_count")
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("metadata")
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "id", "outbox-1")
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "status", "sending")
    expect(mocks.select).toHaveBeenCalledWith("id")
  })

  it("returns false when the sending-row CAS matches no row", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await expect(deferOutboxRow(
      "outbox-1",
      "2026-07-20T00:00:00.000Z",
      "patient cooldown",
    )).resolves.toBe(false)
  })

  it("returns false when a status update matches no durable row", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await expect(updateOutboxStatus(
      "outbox-1",
      "sent",
      { provider_message_id: "msg-1" },
    )).resolves.toBe(false)
  })
})
