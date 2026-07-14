import { beforeEach, describe, expect, it, vi } from "vitest"

const captureException = vi.fn()
vi.mock("@sentry/nextjs", () => ({ captureException: (...args: unknown[]) => captureException(...args) }))
vi.mock("@/lib/observability/logger", () => ({ createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }) }))

import { reportCheckoutSessionFailure } from "@/lib/stripe/checkout-error-alarm"

describe("reportCheckoutSessionFailure", () => {
  beforeEach(() => {
    captureException.mockClear()
  })

  it("escalates a 'No such price' as a fatal, fingerprinted config alarm", async () => {
    const result = await reportCheckoutSessionFailure(
      new Error("No such price: 'price_wrong'"),
      { intakeId: "i-1", category: "medical_certificate", failedPriceRole: "medcert" },
    )

    expect(result.isMisconfiguredPrice).toBe(true)
    expect(captureException).toHaveBeenCalledTimes(1)
    const [, opts] = captureException.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts.level).toBe("fatal")
    expect((opts.tags as Record<string, string>).checkout_error).toBe("no_such_price")
    expect((opts.tags as Record<string, string>).price_role).toBe("medcert")
    // Stable fingerprint per price role so one alert fires, not one per failed checkout.
    expect(opts.fingerprint).toEqual(["stripe-no-such-price", "medcert"])
  })

  it("escalates a missing STRIPE_PRICE_* env as a fatal alarm with its own fingerprint", async () => {
    const result = await reportCheckoutSessionFailure(
      new Error("Missing STRIPE_PRICE_CONSULT_WOMENS_HEALTH environment variable"),
      { intakeId: "i-4", category: "consult", failedPriceRole: "base" },
    )

    expect(result.isMisconfiguredPrice).toBe(true)
    expect(captureException).toHaveBeenCalledTimes(1)
    const [, opts] = captureException.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts.level).toBe("fatal")
    expect((opts.tags as Record<string, string>).checkout_error).toBe("missing_price_env")
    // Distinct fingerprint from "No such price" so the two config faults group separately.
    expect(opts.fingerprint).toEqual(["stripe-missing-price-env", "base"])
  })

  it("reports a generic session-create failure at error level, not fatal", async () => {
    const result = await reportCheckoutSessionFailure(
      new Error("Stripe API timeout"),
      { intakeId: "i-2", category: "consult", failedPriceRole: null },
    )

    expect(result.isMisconfiguredPrice).toBe(false)
    expect(captureException).toHaveBeenCalledTimes(1)
    const [, opts] = captureException.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts.level).toBe("error")
    expect((opts.tags as Record<string, string>).checkout_error).toBe("session_create_failed")
  })

  it("escalates an invalid Priority Price object as a stable fatal configuration alarm", async () => {
    const result = await reportCheckoutSessionFailure(
      new Error("Invalid STRIPE_PRICE_PRIORITY_FEE configuration: inactive"),
      {
        intakeId: "i-priority",
        category: "medical_certificate",
        failedPriceRole: "priority_fee",
      },
    )

    expect(result.isMisconfiguredPrice).toBe(true)
    expect(captureException).toHaveBeenCalledTimes(1)
    const [, opts] = captureException.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts.level).toBe("fatal")
    expect((opts.tags as Record<string, string>).checkout_error).toBe(
      "invalid_price_config",
    )
    expect((opts.tags as Record<string, string>).price_role).toBe("priority_fee")
    expect(opts.fingerprint).toEqual([
      "stripe-invalid-price-config",
      "priority_fee",
    ])
  })

  it("never throws even if Sentry is unavailable", async () => {
    captureException.mockImplementationOnce(() => {
      throw new Error("sentry down")
    })
    await expect(
      reportCheckoutSessionFailure("No such price: 'x'", { intakeId: "i-3", category: "med", failedPriceRole: "medcert" }),
    ).resolves.toMatchObject({ isMisconfiguredPrice: true })
  })
})
