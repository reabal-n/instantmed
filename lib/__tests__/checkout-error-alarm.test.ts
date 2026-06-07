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

  it("never throws even if Sentry is unavailable", async () => {
    captureException.mockImplementationOnce(() => {
      throw new Error("sentry down")
    })
    await expect(
      reportCheckoutSessionFailure("No such price: 'x'", { intakeId: "i-3", category: "med", failedPriceRole: "medcert" }),
    ).resolves.toMatchObject({ isMisconfiguredPrice: true })
  })
})
