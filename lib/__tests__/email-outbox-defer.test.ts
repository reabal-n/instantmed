import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  eq: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      update: mocks.update,
    }),
  }),
}))

import { deferOutboxRow } from "@/lib/email/send/outbox"

describe("deferOutboxRow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = { eq: mocks.eq }
    mocks.update.mockReturnValue(chain)
    mocks.eq
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ error: null })
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
  })
})
