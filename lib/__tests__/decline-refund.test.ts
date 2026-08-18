import { beforeEach, describe, expect, it, vi } from "vitest"

import { processRefund } from "@/app/actions/decline-refund"
import { stripe } from "@/lib/stripe/client"

import {
  mockSupabaseFrom,
  mockSupabaseRpc,
  resetAllMocks,
} from "./setup"

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111"
const LEASE_TOKEN = "22222222-2222-4222-8222-222222222222"

function useAttemptRpc(input?: {
  requestedAmountCents?: number
  reservationError?: { message: string } | null
}) {
  const requestedAmountCents = input?.requestedAmountCents ?? 2_995
  mockSupabaseRpc.mockImplementation(async (name: string) => {
    if (name === "reserve_stripe_refund_attempt") {
      return {
        data: input?.reservationError
          ? null
          : {
              attempt_id: ATTEMPT_ID,
              idempotency_key: `refund-attempt:${ATTEMPT_ID}`,
              lease_token: LEASE_TOKEN,
              requested_amount_cents: requestedAmountCents,
              reserved: true,
            },
        error: input?.reservationError ?? null,
      }
    }
    if (name === "complete_stripe_refund_attempt") {
      return { data: true, error: null }
    }
    if (name === "complete_stripe_refund_attempt_error") {
      return { data: true, error: null }
    }
    return { data: null, error: { message: `Unexpected RPC: ${name}` } }
  })
}

function refundableIntake(overrides?: {
  amount_cents?: number | null
  category?: string | null
  payment_id?: string | null
  stripe_payment_intent_id?: string | null
}) {
  return {
    amount_cents: 2_995,
    category: "prescription",
    payment_id: "cs_decline",
    stripe_payment_intent_id: "pi_decline",
    ...overrides,
  }
}

describe("processRefund", () => {
  beforeEach(() => {
    resetAllMocks()
    vi.mocked(stripe.checkout.sessions.retrieve).mockReset()
    vi.mocked(stripe.refunds.create).mockReset()
  })

  it("routes a full consult decline through the durable attempt lifecycle", async () => {
    useAttemptRpc({ requestedAmountCents: 4_995 })
    vi.mocked(stripe.refunds.create).mockResolvedValue({
      amount: 4_995,
      id: "re_decline",
      metadata: {
        intake_id: "intake-consult",
        refund_attempt_id: ATTEMPT_ID,
        refund_type: "decline",
      },
      payment_intent: "pi_consult",
      status: "pending",
    } as never)

    const result = await processRefund(
      "intake-consult",
      refundableIntake({
        amount_cents: 4_995,
        category: "consult",
        payment_id: "cs_consult",
        stripe_payment_intent_id: "pi_consult",
      }),
      "doctor-1",
      "2026-05-07T00:00:00.000Z",
    )

    expect(mockSupabaseRpc).toHaveBeenNthCalledWith(
      1,
      "reserve_stripe_refund_attempt",
      {
        p_actor_profile_id: "doctor-1",
        p_intake_id: "intake-consult",
        p_livemode: false,
        p_payment_intent_id: "pi_consult",
        p_refund_type: "decline",
        p_target_total_cents: 4_995,
      },
    )
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      {
        amount: 4_995,
        metadata: {
          intake_id: "intake-consult",
          refund_attempt_id: ATTEMPT_ID,
          refund_type: "decline",
        },
        payment_intent: "pi_consult",
        reason: "requested_by_customer",
      },
      { idempotencyKey: `refund-attempt:${ATTEMPT_ID}` },
    )
    expect(mockSupabaseRpc).toHaveBeenNthCalledWith(
      2,
      "complete_stripe_refund_attempt",
      {
        p_attempt_id: ATTEMPT_ID,
        p_lease_token: LEASE_TOKEN,
        p_stripe_refund_id: "re_decline",
        p_stripe_status: "pending",
      },
    )
    expect(mockSupabaseRpc.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(stripe.refunds.create).mock.invocationCallOrder[0],
    )
    expect(vi.mocked(stripe.refunds.create).mock.invocationCallOrder[0]).toBeLessThan(
      mockSupabaseRpc.mock.invocationCallOrder[1],
    )
    expect(result).toEqual({
      amount: 4_995,
      status: "pending",
      stripeRefundId: "re_decline",
    })
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })

  it("resolves a missing PaymentIntent from the Checkout Session before reserving", async () => {
    useAttemptRpc()
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
      payment_intent: { id: "pi_from_session" },
    } as never)
    vi.mocked(stripe.refunds.create).mockResolvedValue({
      amount: 2_995,
      id: "re_fallback",
      metadata: {
        intake_id: "intake-fallback",
        refund_attempt_id: ATTEMPT_ID,
        refund_type: "decline",
      },
      payment_intent: "pi_from_session",
      status: "pending",
    } as never)

    const result = await processRefund(
      "intake-fallback",
      refundableIntake({ stripe_payment_intent_id: null }),
      "doctor-1",
      "2026-05-07T00:00:00.000Z",
    )

    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_decline")
    expect(mockSupabaseRpc).toHaveBeenNthCalledWith(
      1,
      "reserve_stripe_refund_attempt",
      expect.objectContaining({ p_payment_intent_id: "pi_from_session" }),
    )
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_from_session" }),
      expect.anything(),
    )
    expect(result).toEqual({
      amount: 2_995,
      status: "pending",
      stripeRefundId: "re_fallback",
    })
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })

  it("keeps an ambiguous Stripe outcome pending and durably recoverable", async () => {
    useAttemptRpc()
    vi.mocked(stripe.refunds.create).mockRejectedValue(
      new Error("Connection reset after Stripe accepted the request"),
    )

    const result = await processRefund(
      "intake-unknown",
      refundableIntake(),
      "doctor-1",
      "2026-05-07T00:00:00.000Z",
    )

    expect(mockSupabaseRpc).toHaveBeenNthCalledWith(
      2,
      "complete_stripe_refund_attempt_error",
      {
        p_attempt_id: ATTEMPT_ID,
        p_error: "stripe_refund_create_threw",
        p_lease_token: LEASE_TOKEN,
        p_outcome: "unknown_outcome",
      },
    )
    expect(result).toEqual({ amount: 2_995, status: "pending" })
    expect(mockSupabaseRpc).not.toHaveBeenCalledWith(
      "complete_stripe_refund_attempt",
      expect.anything(),
    )
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })

  it("fails before reservation when no PaymentIntent can be resolved", async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValue(
      new Error("Checkout Session unavailable"),
    )

    const result = await processRefund(
      "intake-no-pi",
      refundableIntake({ stripe_payment_intent_id: null }),
      "doctor-1",
      "2026-05-07T00:00:00.000Z",
    )

    expect(result).toEqual({
      error: "No payment intent ID available for refund",
      status: "failed",
    })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
    expect(stripe.refunds.create).not.toHaveBeenCalled()
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })

  it("fails before reservation when the paid amount is invalid", async () => {
    const result = await processRefund(
      "intake-invalid-amount",
      refundableIntake({ amount_cents: 0 }),
      "doctor-1",
      "2026-05-07T00:00:00.000Z",
    )

    expect(result).toEqual({
      error: "No valid paid amount available for refund",
      status: "failed",
    })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
    expect(stripe.refunds.create).not.toHaveBeenCalled()
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })

  it("surfaces a durable-attempt reservation failure without moving money", async () => {
    useAttemptRpc({
      reservationError: { message: "refund attempt lease unavailable" },
    })

    const result = await processRefund(
      "intake-reservation-failed",
      refundableIntake(),
      "doctor-1",
      "2026-05-07T00:00:00.000Z",
    )

    expect(result).toEqual({
      error: "refund_attempt_reservation_failed",
      status: "failed",
    })
    expect(stripe.refunds.create).not.toHaveBeenCalled()
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })
})
