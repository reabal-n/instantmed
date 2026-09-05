import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  CHECKOUT_FAILURE_CODES,
  CHECKOUT_FAILURE_TAXONOMY_VERSION,
  checkoutFailure,
  getCheckoutFailureCategory,
} from "@/lib/stripe/checkout-failure"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

describe("server-owned checkout failure taxonomy", () => {
  it("maps every fixed code onto the existing stable category vocabulary", () => {
    expect(CHECKOUT_FAILURE_CODES).toEqual([
      "availability",
      "auth_handoff",
      "auth_or_session",
      "clinical_or_input_validation",
      "payment_provider",
      "persistence",
      "pricing_or_configuration",
      "rate_limit",
      "unexpected",
    ])
    expect(Object.fromEntries(
      CHECKOUT_FAILURE_CODES.map((code) => [code, getCheckoutFailureCategory(code)]),
    )).toEqual({
      availability: "availability_or_capacity",
      auth_handoff: "identity_or_session",
      auth_or_session: "identity_or_session",
      clinical_or_input_validation: "validation",
      payment_provider: "payment_provider",
      persistence: "persistence",
      pricing_or_configuration: "pricing_or_configuration",
      rate_limit: "rate_limit",
      unexpected: "unknown",
    })
  })

  it("keeps patient copy separate from the immutable analytics dimensions", () => {
    expect(checkoutFailure(
      "persistence",
      "We could not save this request. Please try again.",
      { requiresFreshRequest: true },
    )).toEqual({
      success: false,
      error: "We could not save this request. Please try again.",
      failureCategory: "persistence",
      failureCode: "persistence",
      failureTaxonomyVersion: CHECKOUT_FAILURE_TAXONOMY_VERSION,
      requiresFreshRequest: true,
    })
  })

  it("routes every public checkout failure producer through the typed factory", () => {
    const producers = [
      "app/actions/unified-checkout.ts",
      "lib/stripe/checkout.ts",
      "lib/stripe/guest-checkout.ts",
      "lib/stripe/checkout/retry-payment.ts",
    ].map(read)
    const combined = producers.join("\n")

    expect(combined).not.toMatch(/interface CheckoutResult/)
    expect(combined).not.toMatch(/return\s*\{\s*success:\s*false/)
    for (const code of [
      "availability",
      "auth_or_session",
      "clinical_or_input_validation",
      "payment_provider",
      "persistence",
      "pricing_or_configuration",
      "rate_limit",
      "unexpected",
    ]) {
      expect(combined).toMatch(new RegExp(`checkoutFailure\\(\\s*"${code}"`))
    }
    // Reserved for Task 9's verified handoff. It must not be inferred from
    // account existence or public error copy in this task.
    expect(combined).not.toMatch(/checkoutFailure\(\s*"auth_handoff"/)
  })

  it("never lets the browser classify raw checkout error strings", () => {
    const reviewStep = read("components/request/steps/review-step.tsx")

    expect(reviewStep).not.toContain("classifyCheckoutFailure")
    expect(reviewStep.match(/capture\("checkout_failed"/g)).toHaveLength(2)
    expect(reviewStep).not.toContain('posthog?.capture("checkout_failed"')
    expect(reviewStep).toContain("failure_category: result.failureCategory")
    expect(reviewStep).toContain("failure_code: result.failureCode")
    expect(reviewStep).toContain(
      "failure_taxonomy_version: result.failureTaxonomyVersion",
    )
    expect(reviewStep).not.toMatch(/failure_category:\s*[^,]*(?:error|message)/i)
  })
})
