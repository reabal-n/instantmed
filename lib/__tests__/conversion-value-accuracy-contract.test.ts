import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("Google Ads conversion-value accuracy contract", () => {
  // Background: prior to 2026-05-12, both /patient/intakes/success and
  // /auth/complete-account would default the Google Ads PURCHASE conversion
  // value to $1 when `amount_cents` was not yet present in props (e.g. when
  // the Stripe webhook had not yet updated the intake row at server render
  // time). Smart Bidding then trained on a fake low-value $1 purchase
  // instead of the real $19.95-$89.95 transaction, dragging campaign
  // optimization toward cheap low-intent clicks.

  it("success-client never fires trackPurchase with a $1 fallback", () => {
    const source = read("app/patient/intakes/success/success-client.tsx")

    // The legacy fallback expression must not be reintroduced anywhere.
    expect(source).not.toMatch(/amountCents != null \? amountCents \/ 100 : 1/)
    expect(source).not.toMatch(/amountCents != null \? amountCents \/ 100 : 1\.0/)

    // The conversion fire is gated on `resolvedAmountCents == null` so
    // it skips entirely when the amount isn't known yet.
    expect(source).toContain("if (resolvedAmountCents == null) return")

    // resolvedAmountCents is also threaded into the useEffect dep array so
    // re-renders triggered by polling re-evaluate the gate.
    expect(source).toMatch(/resolvedAmountCents, patientEmail/)
  })

  it("success-client refreshes resolvedAmountCents from the polling endpoint", () => {
    const source = read("app/patient/intakes/success/success-client.tsx")
    expect(source).toContain("derivePatientSuccessVerificationState")
    expect(source).toContain("setVerificationState((current)")
    expect(source).toMatch(/typeof data\?\.amount_cents === ['"]number['"]/)
  })

  it("keeps payment draft cleanup retryable until payment is truly paid", () => {
    const source = read("app/patient/intakes/success/success-client.tsx")
    const paidGate = source.indexOf('paymentStatus !== "paid"')
    const cleanupLatch = source.indexOf("draftClearedRef.current = true")

    expect(paidGate).toBeGreaterThanOrEqual(0)
    expect(cleanupLatch).toBeGreaterThan(paidGate)
  })

  it("intake-status API returns payment and conversion fields alongside status", () => {
    const source = read("app/api/patient/intake-status/route.ts")
    // The select clause must include amount_cents so the polling client
    // can update its conversion-value source.
    expect(source).toMatch(
      /\.select\("status, payment_status, amount_cents, is_priority"\)/,
    )
    // Response payload exposes the new fields.
    expect(source).toContain("payment_status: intake.payment_status")
    expect(source).toContain("amount_cents: intake.amount_cents")
    expect(source).toContain("is_priority: intake.is_priority")
  })

  it("keeps guest complete-account capabilities out of browser conversion telemetry", () => {
    const source = read("app/auth/complete-account/complete-account-form.tsx")
    const serverFinalization = read("lib/stripe/confirmed-payment-finalization.ts")

    expect(source).not.toContain("trackPurchase")
    expect(source).not.toContain("purchase_completed")
    expect(serverFinalization).toContain('event: "purchase_completed_server"')
    expect(serverFinalization).toContain("runGoogleAdsPostPaymentAttribution")
  })

  it("browser PostHog purchase events are deduped on the authenticated success surface", () => {
    const successSource = read("app/patient/intakes/success/success-client.tsx")
    const completeAccountSource = read("app/auth/complete-account/complete-account-form.tsx")

    expect(successSource).toContain("claimBrowserPurchaseCompleted")
    expect(successSource).toContain("$insert_id: getBrowserPurchaseCompletedInsertId()")
    expect(completeAccountSource).not.toContain("claimBrowserPurchaseCompleted")
  })

  it("advertising docs make the offline purchase import primary and funnel actions secondary", () => {
    const source = read("docs/ADVERTISING_COMPLIANCE.md")

    expect(source).toContain("canonical Primary purchase conversion")
    expect(source).toContain("Funnel milestones and page/intake/checkout actions must stay Secondary")
    expect(source).not.toContain("Keep the offline import action secondary")
  })
})
