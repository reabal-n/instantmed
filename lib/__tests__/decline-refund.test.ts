import { beforeEach, describe, expect, it, vi } from "vitest"

import { processRefund } from "@/app/actions/decline-refund"
import { stripe } from "@/lib/stripe/client"

import { mockSupabaseFrom, resetAllMocks } from "./setup"

const TRIGGER_REWRITTEN_RESERVATION_AT = "2026-05-07T00:00:00.777Z"

function captureSupabaseUpdates(finalMatched = true) {
  const updates: Array<{
    payload: Record<string, unknown>
    filters: Array<[string, unknown]>
  }> = []

  mockSupabaseFrom.mockImplementation(() => {
    const filters: Array<[string, unknown]> = []
    let updateIndex = -1
    const chain: Record<string, unknown> = {
      update: vi.fn((payload: Record<string, unknown>) => {
        updateIndex = updates.push({ payload, filters }) - 1
        return chain
      }),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push([column, value])
        return chain
      }),
      select: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({
        data: updateIndex === 1 && !finalMatched
          ? null
          : updateIndex === 0
            ? { id: "intake-full", updated_at: TRIGGER_REWRITTEN_RESERVATION_AT }
            : { id: "intake-full" },
        error: null,
      })),
      then: (
        onFulfilled?: (value: { error: null }) => unknown,
      ) => Promise.resolve({ error: null }).then(onFulfilled),
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

  it("keeps a full decline refund pending until exact Stripe cash evidence", async () => {
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

    expect(updates.at(-1)?.payload).toMatchObject({
      refund_status: "pending",
      refund_stripe_id: "re_full",
    })
    expect(updates.at(-1)?.payload).not.toHaveProperty("payment_status")
    expect(updates.at(-1)?.payload).not.toHaveProperty("refund_amount_cents")
    expect(updates.at(-1)?.payload).not.toHaveProperty("refunded_at")
    expect(updates.at(-1)?.filters).toContainEqual([
      "updated_at",
      TRIGGER_REWRITTEN_RESERVATION_AT,
    ])
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

    expect(updates.at(-1)?.payload).toMatchObject({
      refund_status: "pending",
      refund_stripe_id: "re_consult",
    })
  })

  it.each(["succeeded", "failed"])(
    "does not overwrite exact %s webhook evidence that lands before create returns",
    async () => {
      const updates = captureSupabaseUpdates(false)
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_fast", amount: 2995 } as never)

      const result = await processRefund(
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

      expect(result).toMatchObject({ status: "pending", stripeRefundId: "re_fast" })
      expect(updates.at(-1)?.filters).toContainEqual(["refund_status", "pending"])
      expect(updates.at(-1)?.filters.some(([column]) => column === "updated_at")).toBe(true)
    },
  )

  it("advances idempotency only after an exact failed Refund id", async () => {
    captureSupabaseUpdates()
    vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_retry", amount: 2995 } as never)

    await processRefund(
      "intake-full",
      {
        payment_id: "cs_full",
        stripe_payment_intent_id: "pi_full",
        amount_cents: 2995,
        refund_status: "failed",
        refund_stripe_id: "re_failed",
        category: "prescription",
      },
      "doctor-1",
      "2026-05-07T00:00:00.000Z",
    )

    expect(vi.mocked(stripe.refunds.create).mock.calls[0]?.[1]).toEqual({
      idempotencyKey: "refund_decline_intake-full_after_re_failed",
    })
  })
})
