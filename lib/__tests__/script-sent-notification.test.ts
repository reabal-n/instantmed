import { beforeEach, describe, expect, it, vi } from "vitest"

import { ensureScriptSentNotification } from "@/lib/email/script-sent-notification"

const mocks = vi.hoisted(() => ({ claim: vi.fn(), send: vi.fn() }))
vi.mock("@/lib/email/send/outbox", () => ({ claimOutboxRow: mocks.claim }))
vi.mock("@/lib/email/send-email", () => ({ sendFromOutboxRow: mocks.send }))

function db(row: Record<string, unknown> | null, error: unknown = null) {
  const q = { select: () => q, eq: () => q, order: () => q, limit: () => q, maybeSingle: async () => ({ data: row, error }) }
  return { from: () => q } as never
}

describe("script notification delivery truth", () => {
  beforeEach(() => vi.resetAllMocks())
  it("reports a non-throwing provider failure", async () => {
    expect(await ensureScriptSentNotification(db(null), "case", async () => ({ success: false }))).toBe("failed")
  })
  it("retries the failed durable attempt without creating another email", async () => {
    const row = { id: "email", status: "failed", retry_count: 1 }
    mocks.claim.mockResolvedValue({ claimed: true, row })
    mocks.send.mockResolvedValue({ success: true })
    const sendNew = vi.fn()
    expect(await ensureScriptSentNotification(db(row), "case", sendNew)).toBe("sent")
    expect(mocks.claim).toHaveBeenCalledWith("email")
    expect(mocks.send).toHaveBeenCalledWith(row)
    expect(sendNew).not.toHaveBeenCalled()
  })
  it.each(["pending", "sending"])("does not call a %s attempt sent or send it twice", async (status) => {
    const sendNew = vi.fn()
    expect(await ensureScriptSentNotification(db({ id: "email", status }), "case", sendNew)).toBe("queued")
    expect(mocks.claim).not.toHaveBeenCalled()
    expect(sendNew).not.toHaveBeenCalled()
  })
  it.each(["bounced", "complained"])("preserves %s suppression even on a sent row", async (delivery_status) => {
    expect(await ensureScriptSentNotification(db({ id: "email", status: "sent", delivery_status }), "case", vi.fn())).toBe("failed")
    expect(mocks.claim).not.toHaveBeenCalled()
  })
  it("fails closed if the delivery lookup is unavailable", async () => {
    const sendNew = vi.fn()
    expect(await ensureScriptSentNotification(db(null, { code: "57014" }), "case", sendNew)).toBe("failed")
    expect(sendNew).not.toHaveBeenCalled()
  })
})
