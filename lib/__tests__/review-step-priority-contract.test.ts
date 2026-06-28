import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("review-step priority checkout contract", () => {
  const reviewStepSource = () => readProjectFile("components/request/steps/review-step.tsx")

  it("keeps prescriptions and repeat scripts on the review-step pay surface with Priority review", () => {
    const source = reviewStepSource()

    expect(source).toContain('serviceType === "prescription" || serviceType === "repeat-script"')
    expect(source).toContain("const totalDue = price + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)")
    expect(source).toContain('id="review-priority-review-toggle"')
    expect(source).toContain('Pay ${totalDue.toFixed(2)}')
    expect(source).toContain("isPriority,")
    expect(source).not.toContain("Express Review")
    expect(source).not.toContain("express_review_opted_in")
  })

  it("makes review-step the unified review+pay surface for every service (2026-06-28 unification)", () => {
    const source = reviewStepSource()

    // Consult now pays on review-step (the separate checkout-step was retired), so
    // checkout_viewed fires for every service (no consult double-count guard), and
    // the priority toggle + a single "Pay $X" CTA show for all — no more
    // review-only "Continue to payment" hand-off.
    expect(source).not.toContain("if (!isPrescriptionCheckout) return")
    expect(source).not.toContain('"Continue to payment"')
    expect(source).toContain('id="review-priority-review-toggle"')
    expect(source).toContain('data-intake-primary-label={`Pay $${totalDue.toFixed(2)}`}')
  })

  it("keeps the consent control a large visible checkbox card, not a tiny control", () => {
    const source = reviewStepSource()

    expect(source).toContain('id="safety-consent"')
    expect(source).toContain("Checkbox")
    expect(source).toContain("w-full max-w-none items-start rounded-xl border-2 p-3.5 text-left")
    expect(source).toContain('boxClassName="mt-0.5 h-5 w-5 rounded-lg border-2"')
    expect(source).not.toContain('id="safety-consent" checked={safetyConfirmed} />')
  })

  it("routes pay-step trust through one quiet cluster, not a boxed shared footer", () => {
    const review = reviewStepSource()

    // The boxed CheckoutSecurityFooter was retired in the 2026-06-28 trust dedup.
    // review-step now shows ONE quiet cluster: accepted-card logos + a single
    // muted line (Stripe secure + full refund if declined). No boxed badges, no
    // duplicate Stripe badge, no AHPRA badge at the pay moment.
    expect(review).not.toContain("CheckoutSecurityFooter")
    expect(review).not.toContain("TrustBadgeRow")
    expect(review).toContain("PaymentLogos")
    expect(review).toContain("Full refund if declined")
    expect(review).toContain("Secure Stripe checkout")
  })
})
