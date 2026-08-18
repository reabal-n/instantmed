import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { stripe } from "@/lib/stripe/client"

import {
  mockSupabaseFrom,
  mockSupabaseRpc,
  resetAllMocks,
} from "./setup"

const actionMocks = vi.hoisted(() => ({
  checkServerActionRateLimit: vi.fn(),
  logAuditEvent: vi.fn(),
  requireRole: vi.fn(),
  revalidateStaff: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRole: actionMocks.requireRole,
}))
vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidateStaff: actionMocks.revalidateStaff,
}))
vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: actionMocks.checkServerActionRateLimit,
}))
vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: actionMocks.logAuditEvent,
}))

import { processRefundAction } from "@/app/actions/admin-config"

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ATTEMPT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const INTAKE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const LEASE_TOKEN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const PAYMENT_ID = "payment-row-1"
const PAYMENT_INTENT_ID = "pi_admin_refund"

type PaymentRow = {
  amount: number
  intake_id: string | null
  stripe_payment_intent_id: string | null
}

type PaymentChain = {
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

function installPaymentRead(
  data: PaymentRow | null,
  error: { message: string } | null = null,
): PaymentChain {
  const chain = {} as PaymentChain
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.single = vi.fn().mockResolvedValue({ data, error })
  chain.update = vi.fn(() => chain)
  mockSupabaseFrom.mockReturnValue(chain)
  return chain
}

function installDurableAttempt(): void {
  mockSupabaseRpc.mockImplementation(async (name: string) => {
    if (name === "reserve_stripe_refund_attempt") {
      return {
        data: {
          attempt_id: ATTEMPT_ID,
          idempotency_key: `refund-attempt:${ATTEMPT_ID}`,
          lease_token: LEASE_TOKEN,
          requested_amount_cents: 4_995,
          reserved: true,
        },
        error: null,
      }
    }
    if (
      name === "complete_stripe_refund_attempt" ||
      name === "complete_stripe_refund_attempt_error"
    ) {
      return { data: true, error: null }
    }
    return { data: null, error: { message: `Unexpected RPC: ${name}` } }
  })
}

function linkedPayment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    amount: 4_995,
    intake_id: INTAKE_ID,
    stripe_payment_intent_id: PAYMENT_INTENT_ID,
    ...overrides,
  }
}

describe("processRefundAction", () => {
  beforeEach(() => {
    resetAllMocks()
    actionMocks.requireRole.mockResolvedValue({
      profile: { id: ADMIN_ID, role: "admin" },
    })
    actionMocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    actionMocks.logAuditEvent.mockResolvedValue(undefined)
    vi.mocked(stripe.refunds.create).mockReset()
    vi.mocked(stripe.refunds.create).mockImplementation(async (
      params?: Stripe.RefundCreateParams,
    ) => ({
      amount: params?.amount ?? 0,
      id: "re_admin_refund",
      metadata: params?.metadata ?? {},
      payment_intent: params?.payment_intent ?? null,
      status: "pending",
    } as never))
    installDurableAttempt()
  })

  it("enforces the admin rate gate before reading payment truth", async () => {
    actionMocks.checkServerActionRateLimit.mockResolvedValueOnce({
      error: "Slow down",
      success: false,
    })

    await expect(processRefundAction(PAYMENT_ID, 4_995)).rejects.toMatchObject({
      message: "Slow down",
      name: "RateLimitError",
    })

    expect(actionMocks.requireRole).toHaveBeenCalledWith(["admin"])
    expect(actionMocks.checkServerActionRateLimit).toHaveBeenCalledWith(
      `admin:${ADMIN_ID}`,
      "admin",
    )
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })

  it.each([
    linkedPayment({ intake_id: null }),
    linkedPayment({ stripe_payment_intent_id: null }),
    linkedPayment({ amount: 0 }),
  ])("rejects a payment without complete authoritative linkage", async (payment) => {
    installPaymentRead(payment)

    const result = await processRefundAction(PAYMENT_ID, 4_995)

    expect(result).toEqual({
      error: "Payment record is not safely linked to a refundable request",
      success: false,
    })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
    expect(stripe.refunds.create).not.toHaveBeenCalled()
    expect(actionMocks.logAuditEvent).not.toHaveBeenCalled()
    expect(actionMocks.revalidateStaff).not.toHaveBeenCalled()
  })

  it("rejects a client amount that differs from the linked payment", async () => {
    installPaymentRead(linkedPayment())

    const result = await processRefundAction(PAYMENT_ID, 1_995, "forged-intake")

    expect(result).toEqual({
      error: "Refund amount changed. Refresh the payment record and try again.",
      success: false,
    })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
    expect(stripe.refunds.create).not.toHaveBeenCalled()
    expect(actionMocks.logAuditEvent).not.toHaveBeenCalled()
    expect(actionMocks.revalidateStaff).not.toHaveBeenCalled()
  })

  it("uses the linked intake, intent, and amount for one durable refund attempt", async () => {
    const chain = installPaymentRead(linkedPayment())

    const result = await processRefundAction(
      PAYMENT_ID,
      4_995,
      "client-supplied-intake-is-ignored",
    )

    expect(mockSupabaseFrom).toHaveBeenCalledOnce()
    expect(mockSupabaseFrom).toHaveBeenCalledWith("payments")
    expect(chain.select).toHaveBeenCalledWith(
      "intake_id, stripe_payment_intent_id, amount",
    )
    expect(chain.eq).toHaveBeenCalledWith("id", PAYMENT_ID)
    expect(mockSupabaseRpc).toHaveBeenNthCalledWith(
      1,
      "reserve_stripe_refund_attempt",
      {
        p_actor_profile_id: ADMIN_ID,
        p_intake_id: INTAKE_ID,
        p_livemode: false,
        p_payment_intent_id: PAYMENT_INTENT_ID,
        p_refund_type: "admin_manual",
        p_target_total_cents: 4_995,
      },
    )
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      {
        amount: 4_995,
        metadata: {
          intake_id: INTAKE_ID,
          refund_attempt_id: ATTEMPT_ID,
          refund_type: "admin_manual",
        },
        payment_intent: PAYMENT_INTENT_ID,
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
        p_stripe_refund_id: "re_admin_refund",
        p_stripe_status: "pending",
      },
    )
    expect(chain.update).not.toHaveBeenCalled()
    expect(chain.insert).not.toHaveBeenCalled()
    expect(chain.delete).not.toHaveBeenCalled()
    expect(result).toEqual({
      pending: true,
      refundId: "re_admin_refund",
      success: true,
    })

    expect(actionMocks.logAuditEvent).toHaveBeenNthCalledWith(1, {
      action: "refund_attempted",
      actorId: ADMIN_ID,
      actorType: "admin",
      intakeId: INTAKE_ID,
      fromState: "eligible",
      toState: "processing",
      metadata: {
        amount: 4_995,
        paymentId: PAYMENT_ID,
        stripePaymentIntentId: PAYMENT_INTENT_ID,
      },
    })
    expect(actionMocks.logAuditEvent).toHaveBeenNthCalledWith(2, {
      action: "refund_requested",
      actorId: ADMIN_ID,
      actorType: "admin",
      intakeId: INTAKE_ID,
      fromState: "eligible",
      toState: "processing",
      metadata: {
        amount: 4_995,
        attemptId: ATTEMPT_ID,
        outcome: "submitted",
        paymentId: PAYMENT_ID,
        stripeRefundId: "re_admin_refund",
      },
    })
    expect(actionMocks.revalidateStaff).toHaveBeenCalledOnce()
    expect(actionMocks.revalidateStaff).toHaveBeenCalledWith({ content: true })
  })

  it("returns pending and audits an ambiguous Stripe outcome", async () => {
    const chain = installPaymentRead(linkedPayment())
    vi.mocked(stripe.refunds.create).mockRejectedValue(
      new Error("Connection reset after request write"),
    )

    const result = await processRefundAction(PAYMENT_ID, 4_995)

    expect(mockSupabaseRpc).toHaveBeenNthCalledWith(
      2,
      "complete_stripe_refund_attempt_error",
      expect.objectContaining({
        p_attempt_id: ATTEMPT_ID,
        p_lease_token: LEASE_TOKEN,
        p_outcome: "unknown_outcome",
      }),
    )
    expect(result).toEqual({ pending: true, success: true })
    expect(actionMocks.logAuditEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: "refund_requested",
        intakeId: INTAKE_ID,
        metadata: expect.objectContaining({
          attemptId: ATTEMPT_ID,
          outcome: "unknown_outcome",
          stripeRefundId: undefined,
        }),
      }),
    )
    expect(actionMocks.revalidateStaff).toHaveBeenCalledWith({ content: true })
    expect(chain.update).not.toHaveBeenCalled()
  })
})
