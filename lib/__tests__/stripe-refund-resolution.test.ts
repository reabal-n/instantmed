import type Stripe from "stripe"
import { describe, expect, it, vi } from "vitest"

import { resolveStripeRefundIntake } from "@/lib/stripe/refund-intake-resolution"

type DatabaseRow = Record<string, unknown>

type ResolverFixture = {
  failure?: {
    column?: string
    message: string
    table: string
  }
  rows?: Record<string, DatabaseRow[]>
}

function createSupabaseMock(input: ResolverFixture = {}) {
  const from = vi.fn((table: string) => {
    const filters = new Map<string, unknown>()
    const query: Record<string, unknown> = {}
    const result = (single: boolean) => {
      const failure = input.failure
      if (
        failure?.table === table &&
        (!failure.column || filters.has(failure.column))
      ) {
        return { data: null, error: { message: failure.message } }
      }

      const matching = (input.rows?.[table] ?? []).filter((row) =>
        [...filters].every(([column, value]) => row[column] === value),
      )
      return {
        data: single ? matching[0] ?? null : matching,
        error: null,
      }
    }

    query.eq = vi.fn((column: string, value: unknown) => {
      filters.set(column, value)
      return query
    })
    query.limit = vi.fn(() => query)
    query.maybeSingle = vi.fn(async () => result(true))
    query.order = vi.fn(() => query)
    query.select = vi.fn(() => query)
    query.single = vi.fn(async () => result(true))
    query.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result(false)).then(onFulfilled, onRejected)

    return query
  })

  return { from, supabase: { from } }
}

function createStripeMock(input?: {
  charges?: Record<string, Partial<Stripe.Charge>>
  paymentIntents?: Record<string, Partial<Stripe.PaymentIntent>>
}) {
  const retrieveCharge = vi.fn(async (id: string) => ({
    id,
    object: "charge",
    payment_intent: null,
    ...input?.charges?.[id],
  }))
  const retrievePaymentIntent = vi.fn(async (id: string) => ({
    id,
    metadata: {},
    object: "payment_intent",
    ...input?.paymentIntents?.[id],
  }))
  return {
    retrieveCharge,
    retrievePaymentIntent,
    stripe: {
      charges: { retrieve: retrieveCharge },
      paymentIntents: { retrieve: retrievePaymentIntent },
    },
  }
}

function refund(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
  return {
    amount: 995,
    balance_transaction: null,
    charge: null,
    created: 1_786_843_200,
    currency: "aud",
    id: "re_test",
    metadata: {},
    object: "refund",
    payment_intent: null,
    reason: "requested_by_customer",
    receipt_number: null,
    source_transfer_reversal: null,
    status: "pending",
    transfer_reversal: null,
    ...overrides,
  } as Stripe.Refund
}

describe("resolveStripeRefundIntake", () => {
  it("resolves the durable refund-attempt metadata before weaker fallbacks", async () => {
    const { from, supabase } = createSupabaseMock({
      rows: {
        intakes: [{ id: "intake-attempt", stripe_payment_intent_id: null }],
        stripe_refund_attempts: [{
          id: "11111111-1111-4111-8111-111111111111",
          intake_id: "intake-attempt",
          payment_intent_id: "pi_attempt",
          stripe_refund_id: "re_attempt",
        }],
      },
    })
    const { stripe } = createStripeMock()

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      {
        eventPaymentIntentId: "pi_attempt",
        refund: refund({
          id: "re_attempt",
          metadata: {
            refund_attempt_id: "11111111-1111-4111-8111-111111111111",
          },
        }),
      },
    )

    expect(result).toEqual({
      error: null,
      intakeId: "intake-attempt",
      paymentIntentId: "pi_attempt",
    })
    expect(from).toHaveBeenCalledWith("stripe_refund_attempts")
  })

  it("resolves an intake directly from the local PaymentIntent binding", async () => {
    const { supabase } = createSupabaseMock({
      rows: {
        intakes: [{ id: "intake-direct", stripe_payment_intent_id: "pi_direct" }],
      },
    })
    const { stripe } = createStripeMock()

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      { refund: refund({ payment_intent: "pi_direct" }) },
    )

    expect(result).toEqual({
      error: null,
      intakeId: "intake-direct",
      paymentIntentId: "pi_direct",
    })
  })

  it("retrieves the Charge to recover a missing PaymentIntent identity", async () => {
    const { supabase } = createSupabaseMock({
      rows: {
        intakes: [{ id: "intake-charge", stripe_payment_intent_id: "pi_charge" }],
      },
    })
    const { retrieveCharge, stripe } = createStripeMock({
      charges: { ch_refund: { payment_intent: "pi_charge" } },
    })

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      { refund: refund({ charge: "ch_refund" }) },
    )

    expect(retrieveCharge).toHaveBeenCalledWith("ch_refund")
    expect(result).toEqual({
      error: null,
      intakeId: "intake-charge",
      paymentIntentId: "pi_charge",
    })
  })

  it("falls back to verified PaymentIntent metadata", async () => {
    const { supabase } = createSupabaseMock({
      rows: {
        intakes: [{ id: "intake-pi-metadata", stripe_payment_intent_id: null }],
      },
    })
    const { stripe } = createStripeMock({
      paymentIntents: {
        pi_metadata: { metadata: { intake_id: "intake-pi-metadata" } },
      },
    })

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      { refund: refund({ payment_intent: "pi_metadata" }) },
    )

    expect(result).toEqual({
      error: null,
      intakeId: "intake-pi-metadata",
      paymentIntentId: "pi_metadata",
    })
  })

  it("falls back to verified Refund metadata", async () => {
    const { supabase } = createSupabaseMock({
      rows: {
        intakes: [{ id: "intake-refund-metadata", stripe_payment_intent_id: null }],
      },
    })
    const { stripe } = createStripeMock()

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      {
        refund: refund({
          metadata: { intake_id: "intake-refund-metadata" },
        }),
      },
    )

    expect(result).toEqual({
      error: null,
      intakeId: "intake-refund-metadata",
      paymentIntentId: null,
    })
  })

  it("falls back to the legacy payments.intake_id binding", async () => {
    const { from, supabase } = createSupabaseMock({
      rows: {
        intakes: [{ id: "intake-payment", stripe_payment_intent_id: null }],
        payments: [{ intake_id: "intake-payment", stripe_payment_intent_id: "pi_payment" }],
      },
    })
    const { stripe } = createStripeMock()

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      { refund: refund({ payment_intent: "pi_payment" }) },
    )

    expect(result).toEqual({
      error: null,
      intakeId: "intake-payment",
      paymentIntentId: "pi_payment",
    })
    expect(from).toHaveBeenCalledWith("payments")
  })

  it("accepts duplicate legacy payment mirrors only when their intake identity agrees", async () => {
    const { supabase } = createSupabaseMock({
      rows: {
        intakes: [{ id: "intake-payment", stripe_payment_intent_id: null }],
        payments: [
          { id: "pay-one", intake_id: "intake-payment", stripe_payment_intent_id: "pi_payment" },
          { id: "pay-two", intake_id: "intake-payment", stripe_payment_intent_id: "pi_payment" },
        ],
      },
    })
    const { stripe } = createStripeMock()

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      { refund: refund({ payment_intent: "pi_payment" }) },
    )

    expect(result).toEqual({
      error: null,
      intakeId: "intake-payment",
      paymentIntentId: "pi_payment",
    })
  })

  it("fails closed when legacy payment mirrors disagree on intake identity", async () => {
    const { supabase } = createSupabaseMock({
      rows: {
        payments: [
          { id: "pay-one", intake_id: "intake-one", stripe_payment_intent_id: "pi_conflict" },
          { id: "pay-two", intake_id: "intake-two", stripe_payment_intent_id: "pi_conflict" },
        ],
      },
    })
    const { stripe } = createStripeMock()

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      { refund: refund({ payment_intent: "pi_conflict" }) },
    )

    expect(result).toEqual({
      error: "Stripe refund legacy payment rows conflict on intake identity",
      intakeId: null,
      paymentIntentId: "pi_conflict",
    })
  })

  it("accepts multiple independent identity sources only when they agree", async () => {
    const attemptId = "22222222-2222-4222-8222-222222222222"
    const { supabase } = createSupabaseMock({
      rows: {
        intakes: [{ id: "intake-agreement", stripe_payment_intent_id: "pi_agreement" }],
        payments: [{ intake_id: "intake-agreement", stripe_payment_intent_id: "pi_agreement" }],
        stripe_refund_attempts: [{
          id: attemptId,
          intake_id: "intake-agreement",
          payment_intent_id: "pi_agreement",
          stripe_refund_id: "re_agreement",
        }],
      },
    })
    const { stripe } = createStripeMock({
      charges: { ch_agreement: { payment_intent: "pi_agreement" } },
      paymentIntents: {
        pi_agreement: { metadata: { intake_id: "intake-agreement" } },
      },
    })

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      {
        eventPaymentIntentId: "pi_agreement",
        refund: refund({
          charge: "ch_agreement",
          id: "re_agreement",
          metadata: { intake_id: "intake-agreement", refund_attempt_id: attemptId },
          payment_intent: "pi_agreement",
        }),
      },
    )

    expect(result).toEqual({
      error: null,
      intakeId: "intake-agreement",
      paymentIntentId: "pi_agreement",
    })
  })

  it("fails closed when durable identity sources name different intakes", async () => {
    const attemptId = "33333333-3333-4333-8333-333333333333"
    const { supabase } = createSupabaseMock({
      rows: {
        intakes: [
          { id: "intake-attempt", stripe_payment_intent_id: "pi_conflict" },
          { id: "intake-refund", stripe_payment_intent_id: null },
        ],
        stripe_refund_attempts: [{
          id: attemptId,
          intake_id: "intake-attempt",
          payment_intent_id: "pi_conflict",
          stripe_refund_id: "re_conflict",
        }],
      },
    })
    const { stripe } = createStripeMock()

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      {
        refund: refund({
          id: "re_conflict",
          metadata: { intake_id: "intake-refund", refund_attempt_id: attemptId },
          payment_intent: "pi_conflict",
        }),
      },
    )

    expect(result.intakeId).toBeNull()
    expect(result.paymentIntentId).toBe("pi_conflict")
    expect(result.error).toMatch(/conflict|mismatch/i)
  })

  it("fails closed when a metadata candidate is bound to another PaymentIntent", async () => {
    const { supabase } = createSupabaseMock({
      rows: {
        intakes: [{ id: "intake-mismatch", stripe_payment_intent_id: "pi_other" }],
      },
    })
    const { stripe } = createStripeMock()

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      {
        eventPaymentIntentId: "pi_current",
        refund: refund({ metadata: { intake_id: "intake-mismatch" } }),
      },
    )

    expect(result.intakeId).toBeNull()
    expect(result.paymentIntentId).toBe("pi_current")
    expect(result.error).toMatch(/conflict|mismatch/i)
  })

  it("returns a retryable error instead of falling through after a transient query failure", async () => {
    const { supabase } = createSupabaseMock({
      failure: {
        column: "stripe_payment_intent_id",
        message: "database temporarily unavailable",
        table: "intakes",
      },
    })
    const { stripe } = createStripeMock({
      paymentIntents: {
        pi_transient: { metadata: { intake_id: "intake-unverified" } },
      },
    })

    const result = await resolveStripeRefundIntake(
      { stripe: stripe as never, supabase: supabase as never },
      { refund: refund({ payment_intent: "pi_transient" }) },
    )

    expect(result).toEqual({
      error: expect.stringContaining("database temporarily unavailable"),
      intakeId: null,
      paymentIntentId: "pi_transient",
    })
  })
})
