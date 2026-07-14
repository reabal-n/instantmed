import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getOptionalStripePriceEnv: vi.fn(),
  reportCheckoutSessionFailure: vi.fn(),
  stripePriceRetrieve: vi.fn(),
}))

vi.mock("@/lib/stripe/client", () => ({
  getOptionalStripePriceEnv: mocks.getOptionalStripePriceEnv,
  stripe: {
    prices: {
      retrieve: mocks.stripePriceRetrieve,
    },
  },
}))

vi.mock("@/lib/stripe/checkout-error-alarm", () => ({
  reportCheckoutSessionFailure: mocks.reportCheckoutSessionFailure,
}))

import { preflightPriorityPriceForRecovery } from "@/lib/stripe/checkout/priority-price-recovery"

const context = {
  category: "medical_certificate",
  intakeId: "intake-1",
  isPriority: true,
}

function validPriorityPrice(overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    currency: "aud",
    id: "price_priority",
    recurring: null,
    type: "one_time",
    unit_amount: 995,
    ...overrides,
  }
}

describe("preflightPriorityPriceForRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOptionalStripePriceEnv.mockReturnValue("price_priority")
    mocks.reportCheckoutSessionFailure.mockResolvedValue({
      errorMessage: "reported",
      isMisconfiguredPrice: true,
    })
    mocks.stripePriceRetrieve.mockResolvedValue(validPriorityPrice())
  })

  it("fails without retrieving a Price when the Priority env is missing", async () => {
    mocks.getOptionalStripePriceEnv.mockReturnValue(null)

    const result = await preflightPriorityPriceForRecovery(context)

    expect(result).toEqual({ ok: false, reason: "missing_config" })
    expect(mocks.stripePriceRetrieve).not.toHaveBeenCalled()
    expect(mocks.reportCheckoutSessionFailure).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/Missing STRIPE_PRICE_PRIORITY_FEE/) }),
      expect.objectContaining({
        category: "medical_certificate",
        failedPriceRole: "priority_fee",
        intakeId: "intake-1",
      }),
    )
  })

  it("fails and alarms with the Priority role when Stripe cannot retrieve the Price", async () => {
    const stripeError = new Error("Stripe API unavailable")
    mocks.stripePriceRetrieve.mockRejectedValue(stripeError)

    const result = await preflightPriorityPriceForRecovery(context)

    expect(result).toEqual({ ok: false, reason: "retrieve_failed" })
    expect(mocks.reportCheckoutSessionFailure).toHaveBeenCalledWith(
      stripeError,
      expect.objectContaining({ failedPriceRole: "priority_fee" }),
    )
  })

  it.each([
    ["inactive", { active: false }],
    ["recurring", { recurring: { interval: "month" }, type: "recurring" }],
    ["a recurring definition on a one-time Price", { recurring: { interval: "month" } }],
    ["non-AUD", { currency: "usd" }],
    ["wrong-unit-amount", { unit_amount: 1095 }],
    ["malformed", { id: null }],
  ])("fails closed for an %s Priority Price", async (_label, overrides) => {
    mocks.stripePriceRetrieve.mockResolvedValue(validPriorityPrice(overrides))

    const result = await preflightPriorityPriceForRecovery(context)

    expect(result).toEqual({ ok: false, reason: "invalid_config" })
    expect(mocks.reportCheckoutSessionFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/Invalid STRIPE_PRICE_PRIORITY_FEE configuration/),
      }),
      expect.objectContaining({ failedPriceRole: "priority_fee" }),
    )
  })

  it("returns the verified active one-time AUD 995 Price ID", async () => {
    await expect(preflightPriorityPriceForRecovery(context)).resolves.toEqual({
      ok: true,
      priceId: "price_priority",
    })
    expect(mocks.stripePriceRetrieve).toHaveBeenCalledWith("price_priority")
    expect(mocks.reportCheckoutSessionFailure).not.toHaveBeenCalled()
  })

  it("does no Priority env or Stripe lookup for a non-Priority request", async () => {
    await expect(
      preflightPriorityPriceForRecovery({ ...context, isPriority: false }),
    ).resolves.toEqual({ ok: true, priceId: null })
    expect(mocks.getOptionalStripePriceEnv).not.toHaveBeenCalled()
    expect(mocks.stripePriceRetrieve).not.toHaveBeenCalled()
    expect(mocks.reportCheckoutSessionFailure).not.toHaveBeenCalled()
  })
})
