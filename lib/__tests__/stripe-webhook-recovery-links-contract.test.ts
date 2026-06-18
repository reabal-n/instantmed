import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const webhookRecoverySources = [
  "app/api/stripe/webhook/handlers/checkout-session-expired.ts",
  "app/api/stripe/webhook/handlers/checkout-session-async-payment-failed.ts",
  "app/api/stripe/webhook/handlers/payment-intent-payment-failed.ts",
].map((file) => readFileSync(join(process.cwd(), file), "utf8"))
const templateSenderSource = readFileSync(
  join(process.cwd(), "lib/email/template-sender.ts"),
  "utf8",
)
const paymentFailureRecoverySource = readFileSync(
  join(process.cwd(), "app/api/stripe/webhook/handlers/payment-failure-recovery.ts"),
  "utf8",
)

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

  it("dedupes payment failure recovery and counts it as the first checkout nudge", () => {
    expect(templateSenderSource).toContain("createPendingOutbox")
    expect(templateSenderSource).toContain("updateOutboxStatus")
    expect(templateSenderSource).toContain("email:payment_failed:${input.intakeId}:${input.checkoutSessionId}")
    expect(templateSenderSource).toContain("Template email suppressed by idempotency guard")
    expect(webhookRecoverySources[1]).toContain("checkoutSessionId: session.id")
    expect(webhookRecoverySources[1]).toContain("markCheckoutRecoveryNudgeSent")
    expect(webhookRecoverySources[2]).toContain("checkoutSessionId")
    expect(webhookRecoverySources[2]).toContain("markCheckoutRecoveryNudgeSent")
    expect(paymentFailureRecoverySource).toContain("abandoned_email_sent_at")
    expect(paymentFailureRecoverySource).toContain("guest_email")
  })
})
