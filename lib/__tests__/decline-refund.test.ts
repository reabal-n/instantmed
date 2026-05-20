import { beforeEach, describe, expect, it, vi } from "vitest"

import { processRefund } from "@/app/actions/decline-refund"
import { stripe } from "@/lib/stripe/client"

import { mockSupabaseFrom, resetAllMocks } from "./setup"

function captureSupabaseUpdates() {
  const updates: Record<string, unknown>[] = []

  mockSupabaseFrom.mockImplementation(() => {
    const chain = {
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push(payload)
        return chain
      }),
      eq: vi.fn(() => chain),
    }

    return chain
  })

  return updates
}

describe("processRefund", () => {
  beforeEach(() => {
    resetAllMocks()
    vi.mocked(stripe.refunds.create).mockReset()
  })

  it("keeps full decline refunds marked as fully refunded", async () => {
    const updates = captureSupabaseUpdates()
    vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_full", amount: 2995 } as never)

    await processRefund(
      "intake-full",
      {
        payment_id: "cs_full",
        stripe_payment_intent_id: "pi_full",
        amount_cents: 2995,
        category: "prescription",
      },
      "doctor-1",
      "2026-05-07T00:00:00.000Z",
    )

    expect(updates.at(-1)).toMatchObject({
      payment_status: "refunded",
      refund_status: "succeeded",
      refund_stripe_id: "re_full",
      refund_amount_cents: 2995,
    })
  })

  it("refunds consult declines in full (no partial logic since 2026-05-20)", async () => {
    const updates = captureSupabaseUpdates()
    vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_consult", amount: 4995 } as never)

    await processRefund(
      "intake-consult",
      {
        payment_id: "cs_consult",
        stripe_payment_intent_id: "pi_consult",
        amount_cents: 4995,
        category: "consult",
      },
      "doctor-1",
      "2026-05-07T00:00:00.000Z",
    )

    const [refundParams] = vi.mocked(stripe.refunds.create).mock.calls[0]
    expect(refundParams).not.toHaveProperty("amount")
    expect((refundParams as { metadata: Record<string, string> }).metadata.refund_type).toBe("decline")

    expect(updates.at(-1)).toMatchObject({
      payment_status: "refunded",
      refund_status: "succeeded",
      refund_amount_cents: 4995,
    })
  })
})
