import { beforeEach, describe, expect, it, vi } from "vitest"

import { hashReviewClickKey } from "@/lib/email/review-click-key"

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ rpc: mocks.rpc }),
}))

import { consumeReviewClickKey } from "@/lib/email/review-click-consumption"

describe("review click consumption", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sends only the validated hash to the atomic consume RPC", async () => {
    const rawKey = "A".repeat(43)
    mocks.rpc.mockResolvedValue({ data: true, error: null })

    await expect(consumeReviewClickKey(rawKey)).resolves.toBe(true)
    expect(mocks.rpc).toHaveBeenCalledWith("consume_review_request_click", {
      p_click_key_hash: hashReviewClickKey(rawKey),
    })
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(rawKey)
  })

  it("rejects malformed keys before touching the database", async () => {
    await expect(consumeReviewClickKey("invalid")).resolves.toBe(false)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("returns false when the traversal was already consumed", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null })

    await expect(consumeReviewClickKey(`${"B".repeat(42)}A`)).resolves.toBe(false)
  })
})
