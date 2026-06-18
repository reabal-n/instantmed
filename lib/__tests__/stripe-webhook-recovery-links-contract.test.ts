import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const webhookRecoverySources = [
  "app/api/stripe/webhook/handlers/checkout-session-expired.ts",
  "app/api/stripe/webhook/handlers/checkout-session-async-payment-failed.ts",
  "app/api/stripe/webhook/handlers/payment-intent-payment-failed.ts",
].map((file) => readFileSync(join(process.cwd(), file), "utf8"))

describe("Stripe webhook recovery links", () => {
  it("does not send stale raw-intake resume URLs from payment recovery emails", () => {
    for (const source of webhookRecoverySources) {
      expect(source).not.toContain("/request?resume=")
    }
  })

  it("uses retryable payment links for failed payments and fresh start links for expired sessions", () => {
    expect(webhookRecoverySources[0]).toContain("buildExpiredCheckoutStartUrl")
    expect(webhookRecoverySources[0]).toContain('campaign: "checkout_expired"')
    expect(webhookRecoverySources[1]).toContain("buildCheckoutPaymentRecoveryUrl")
    expect(webhookRecoverySources[1]).toContain('campaign: "async_payment_failed"')
    expect(webhookRecoverySources[2]).toContain("buildCheckoutPaymentRecoveryUrl")
    expect(webhookRecoverySources[2]).toContain('campaign: "payment_failed"')
  })
})
