import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

/**
 * Contract for the 2026-06-27 checkout price-config failure hardening (Codex review).
 *
 * A broken/missing STRIPE_PRICE_* env makes getPriceIdForRequest throw. Before
 * this fix:
 *  - guest + authed checkout threw out of the action BEFORE the intake was
 *    persisted → no recoverable checkout_failed row AND no Sentry alarm; every
 *    checkout for that tier failed silently (the PR #105 incident class).
 *  - retry-payment's "No such price" branch returned a user message with NO
 *    Sentry trace.
 *
 * Every checkout path that can hit a price-config fault must now route it through
 * reportCheckoutSessionFailure (fatal, fingerprinted) instead of throwing into a
 * generic catch. Pinned here because these orchestrators are E2E-only (excluded
 * from the unit-coverage gate), so a grep contract is the cheap durable guard.
 */
describe("checkout price-config failures always alarm", () => {
  it("guest checkout wraps the early price lookup and alarms on a recoverable intake", () => {
    const src = read("lib/stripe/guest-checkout.ts")
    // Price lookup is wrapped so a config throw becomes a null, not an early throw.
    expect(src).toMatch(/try\s*{[\s\S]*?getPriceIdForRequest\(/)
    expect(src).toContain("priceConfigError")
    // The !priceId guard marks the (already-persisted) intake failed AND alarms.
    expect(src).toContain("markGuestCheckoutFailed")
    expect(src).toContain("reportCheckoutSessionFailure")
  })

  it("authenticated checkout catches a price-config throw and alarms instead of bubbling", () => {
    const src = read("lib/stripe/checkout.ts")
    expect(src).toMatch(/try\s*{[\s\S]*?getPriceIdForRequest\(/)
    expect(src).toContain("reportCheckoutSessionFailure")
  })

  it("retry payment alarms on session-create failure and counts the retry in the funnel", () => {
    const src = read("lib/stripe/checkout/retry-payment.ts")
    expect(src).toContain("reportCheckoutSessionFailure")
    // Retried checkouts must emit the server-side reached-pay event (PR-1a denominator).
    expect(src).toContain('step: "payment_initiated"')
  })

  it("the alarm classifier treats BOTH 'No such price' and a missing STRIPE_PRICE env as fatal config faults", () => {
    const src = read("lib/stripe/checkout-error-alarm.ts")
    expect(src).toContain('errorMessage.includes("No such price")')
    expect(src).toContain("isMissingPriceEnv")
    expect(src).toContain("missing_price_env")
    expect(src).toContain("isInvalidPriceConfiguration")
    expect(src).toContain("invalid_price_config")
  })
})
