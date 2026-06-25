import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("review-step priority checkout contract", () => {
  const reviewStepSource = () => readProjectFile("components/request/steps/review-step.tsx")
  const checkoutStepSource = () => readProjectFile("components/request/steps/checkout-step.tsx")
  const trustFooterSource = () => readProjectFile("components/checkout/trust-badges.tsx")
  const trustPresetSource = () => readProjectFile("lib/marketing/trust-badges.ts")

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

  it("keeps consult review restrained: no review-step priority upsell or checkout-view double count", () => {
    const source = reviewStepSource()

    expect(source).toContain("if (!isPrescriptionCheckout) return")
    expect(source).toContain("For consult, review-step leads to a")
    expect(source).toMatch(/\{isPrescriptionCheckout && \(\s*<div className="pt-1">[\s\S]*id="review-priority-review-toggle"[\s\S]*<\/div>\s*\)\}/)
    expect(source).toContain('data-intake-primary-label={isPrescriptionCheckout ? `Pay $${totalDue.toFixed(2)}` : "Continue to payment"}')
  })

  it("keeps the consent control a large visible checkbox card, not a tiny control", () => {
    const source = reviewStepSource()

    expect(source).toContain('id="safety-consent"')
    expect(source).toContain("Checkbox")
    expect(source).toContain("w-full max-w-none items-start rounded-xl border-2 p-3.5 text-left")
    expect(source).toContain('boxClassName="mt-0.5 h-5 w-5 rounded-lg border-2"')
    expect(source).not.toContain('id="safety-consent" checked={safetyConfirmed} />')
  })

  it("routes checkout and review trust through the compact shared footer primitive", () => {
    const review = reviewStepSource()
    const checkout = checkoutStepSource()
    const footer = trustFooterSource()
    const presets = trustPresetSource()

    expect(review).toContain("CheckoutSecurityFooter")
    expect(checkout).toContain("CheckoutSecurityFooter")
    expect(review).not.toContain("TrustBadgeRow")
    expect(checkout).not.toContain("TrustBadgeRow")
    expect(footer).toContain('<TrustBadgeRow preset="checkout"')
    expect(footer).toContain('"rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"')
    expect(presets).toMatch(/checkout:\s*\[\s*\{ id: 'stripe', variant: 'styled' \},\s*'ahpra',\s*'refund',\s*\]/)
  })
})
