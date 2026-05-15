import { describe, expect, it } from "vitest"

import {
  getStripePriceConfigIssues,
  STRIPE_PRICE_ENV_KEYS,
} from "@/lib/stripe/price-config-health"

function completeStripePriceEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...Object.fromEntries(
      STRIPE_PRICE_ENV_KEYS.map((key) => [key, `price_${key.toLowerCase()}`]),
    ),
    ...overrides,
  }
}

describe("Stripe price config health", () => {
  it("returns no issues for populated price IDs", () => {
    expect(getStripePriceConfigIssues(completeStripePriceEnv())).toEqual([])
  })

  it("flags missing, whitespace-padded, and malformed price IDs", () => {
    const env = {
      ...completeStripePriceEnv(),
      STRIPE_PRICE_CONSULT: "price_consult\n",
      STRIPE_PRICE_MEDCERT: "",
      STRIPE_PRICE_PRIORITY_FEE: "not_a_price",
    }

    expect(getStripePriceConfigIssues(env)).toEqual(
      expect.arrayContaining([
        { key: "STRIPE_PRICE_CONSULT", issue: "has_whitespace" },
        { key: "STRIPE_PRICE_MEDCERT", issue: "missing" },
        { key: "STRIPE_PRICE_PRIORITY_FEE", issue: "invalid_format" },
      ]),
    )
  })
})
