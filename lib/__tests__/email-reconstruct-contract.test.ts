import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("email reconstruction contract", () => {
  const dispatcherSource = readFileSync(
    join(process.cwd(), "lib/email/email-dispatcher.ts"),
    "utf8",
  )
  const reconstructSource = readFileSync(
    join(process.cwd(), "lib/email/send/reconstruct.ts"),
    "utf8",
  )
  const retryPaymentRouteSource = readFileSync(
    join(process.cwd(), "app/api/patient/retry-payment/route.ts"),
    "utf8",
  )

  it("keeps stale-queue and payment-retry emails reconstructable for outbox retries", () => {
    for (const emailType of ["still_reviewing", "payment_retry"]) {
      expect(dispatcherSource).toContain(`"${emailType}"`)
      expect(reconstructSource).toContain(`row.email_type === "${emailType}"`)
    }
  })

  it("returns patients to the owned checkout retry path without sending a second email", () => {
    expect(retryPaymentRouteSource).toContain("getRetryablePaymentIntakeId")
    expect(retryPaymentRouteSource).toContain("paymentUrl: `${env.appUrl}/patient/intakes/${intakeId}?retry=true`")
    expect(retryPaymentRouteSource).not.toContain("emailType: \"payment_retry\"")
    expect(retryPaymentRouteSource).not.toContain("PaymentRetryEmail")
    expect(retryPaymentRouteSource).not.toContain("payment_url: paymentUrl")
    expect(retryPaymentRouteSource).not.toContain("sendEmail")
  })

  it("reconstructs payment-failed emails with a direct checkout recovery URL", () => {
    expect(reconstructSource).toContain("buildCheckoutPaymentRecoveryUrl")
    expect(reconstructSource).toContain('campaign: "payment_failed"')
    expect(reconstructSource).toContain("isGuest: Boolean(ctx.intake.guest_email)")
    expect(reconstructSource).not.toContain("const retryUrl = `${env.appUrl}/patient/intakes/${ctx.intake.id}`")
  })
})
