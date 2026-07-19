import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  }),
}))

import { isEmailSendDeliveryConfirmed } from "@/lib/email/outbox-delivery"

describe("isEmailSendDeliveryConfirmed", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("confirms only a durable sent row", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { status: "sent" },
      error: null,
    })

    await expect(isEmailSendDeliveryConfirmed({
      success: true,
      outboxId: "outbox-1",
    })).resolves.toBe(true)
  })

  it("does not treat skipped_e2e as provider delivery", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { status: "skipped_e2e" },
      error: null,
    })

    await expect(isEmailSendDeliveryConfirmed({
      success: true,
      outboxId: "outbox-1",
      skipped: true,
    })).resolves.toBe(false)
  })
})
