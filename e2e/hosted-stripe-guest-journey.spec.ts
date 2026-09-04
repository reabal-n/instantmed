import { expect, test } from "@playwright/test"

import { writeHostedStripeBrowserEvidenceAtomic } from "../scripts/run-hosted-stripe-e2e"
import {
  completeRealHostedGuestPayment,
  expectNoAuthAccountForPaidGuest,
  followMagicLinkAndExpectOwnedIntake,
  hostedStripeRecipient,
  type PaidIntakeEvidence,
  waitForActualStripePayment,
} from "./helpers/hosted-stripe"

const runId = process.env.HOSTED_STRIPE_E2E_RUN_ID
const browserEvidencePath = process.env.HOSTED_STRIPE_E2E_BROWSER_EVIDENCE_PATH
if (!runId || !browserEvidencePath) {
  throw new Error("Hosted Stripe runner ownership is required")
}

test.describe.serial("real hosted Stripe guest checkout", () => {
  test.setTimeout(180_000)

  let skippedAccount: PaidIntakeEvidence | null = null
  let linkedAccount: PaidIntakeEvidence | null = null
  let skipOutcome = false
  let linkOutcome = false

  test.afterAll(async () => {
    const webhookEvents = new Set(
      [skippedAccount?.eventId, linkedAccount?.eventId].filter(Boolean),
    ).size
    if (
      !skipOutcome ||
      !linkOutcome ||
      !skippedAccount ||
      !linkedAccount ||
      webhookEvents !== 2
    ) return

    await writeHostedStripeBrowserEvidenceAtomic(browserEvidencePath, {
      stripe: {
        eventType: "checkout.session.completed",
        livemode: false,
      },
      assertions: {
        hostedCheckout: true,
        signedWebhook: skippedAccount.signedWebhook && linkedAccount.signedWebhook,
        skippedAccount: skipOutcome,
        linkedAccount: linkOutcome,
      },
      counts: {
        journeys: 2,
        webhookEvents,
      },
    })
  })

  test("guest may pay in hosted Checkout and skip account creation", async ({ page }) => {
    const evidence = await completeRealHostedGuestPayment(page, {
      recipient: hostedStripeRecipient("skip"),
      service: "repeat-script",
    })
    skippedAccount = evidence

    expect(evidence.checkoutHostname).toBe("checkout.stripe.com")
    expect(evidence.livemode).toBe(false)
    expect(evidence.amountCents).toBe(2995)
    expect(evidence.currency).toBe("aud")
    expect(evidence.priorStatus).toBe("pending_payment")
    expect(evidence.priorPaymentStatus).toBe("pending")
    expect(evidence.paymentIntentStatus).toBe("succeeded")
    expect(evidence.exclude_from_reporting).toBe(true)
    expect(evidence.signedWebhook).toBe(true)
    const durableEvidence = await waitForActualStripePayment(evidence.intakeId)
    expect(durableEvidence.checkoutSessionId).toBe(evidence.checkoutSessionId)

    await expect(page).toHaveURL(/\/auth\/complete-account/)
    await page.getByRole("button", { name: "Continue without an account" }).click()
    await expect(page).toHaveURL(/\/request\/confirmed$/)
    await expectNoAuthAccountForPaidGuest(evidence)
    skipOutcome = true
  })

  test("guest may create access by real magic link after payment", async ({ page }) => {
    const evidence = await completeRealHostedGuestPayment(page, {
      recipient: hostedStripeRecipient("link"),
      service: "med-cert",
    })
    linkedAccount = evidence

    expect(evidence.checkoutHostname).toBe("checkout.stripe.com")
    expect(evidence.livemode).toBe(false)
    expect(evidence.amountCents).toBe(2495)
    expect(evidence.exclude_from_reporting).toBe(true)
    expect(evidence.signedWebhook).toBe(true)
    const durableEvidence = await waitForActualStripePayment(evidence.intakeId)
    expect(durableEvidence.checkoutSessionId).toBe(evidence.checkoutSessionId)

    await page.getByRole("button", { name: "Email me a sign-in link" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Check your inbox" })).toBeVisible()
    await followMagicLinkAndExpectOwnedIntake(page, evidence)
    linkOutcome = true
  })
})
