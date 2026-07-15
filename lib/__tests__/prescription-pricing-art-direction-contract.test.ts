import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function expectInOrder(source: string, labels: readonly string[]) {
  let cursor = -1

  for (const label of labels) {
    const next = source.indexOf(label, cursor + 1)
    expect(next, `Expected ${label} after source offset ${cursor}`).toBeGreaterThan(cursor)
    cursor = next
  }
}

describe("prescription and pricing art direction", () => {
  it("renders the repeat-prescription path as an ordered responsive lifecycle", () => {
    const source = read("components/marketing/prescriptions-landing.tsx")

    expect(source).toContain('data-prescription-lifecycle="escript"')
    expect(source).toContain("<ol")
    expect(source).toContain("lg:grid-cols-5")
    expect(source).toContain("divide-y")
    expect(source).toContain("lg:divide-x")
    expect(source).toContain('<Heading id="prescription-lifecycle-title" level="h2"')
    expect(source).toContain("Brief call if needed")
    expect(source).toContain("an eScript is sent only if approved")

    expectInOrder(source, [
      'title: "Medication details"',
      'title: "Identity and safety review"',
      'title: "Doctor decision"',
      'title: "Token to your phone"',
      'title: "Your pharmacy"',
    ])

    expectInOrder(source, [
      "<RepeatEligibilitySection />",
      "<PrescriptionLifecycleGraphic />",
      "<PrescriptionFeePanel />",
    ])
  })

  it("retires generic photography and superseded prescription-only text sections", () => {
    const source = read("components/marketing/prescriptions-landing.tsx")

    expect(source).not.toContain("/images/rx-1.webp")
    expect(source).not.toContain("/images/rx-2.webp")
    expect(source).not.toContain('from "next/image"')
    expect(source).not.toContain("SupportedMedicationsSection")
    expect(source).not.toContain("backdrop-blur")

    for (const retiredPath of [
      "components/marketing/sections/escript-explainer-section.tsx",
      "components/marketing/sections/prescription-limitations-section.tsx",
    ]) {
      expect(existsSync(join(root, retiredPath)), retiredPath).toBe(false)
    }
  })

  it("itemises included and separate costs in a semantic fee ledger", () => {
    const source = read("app/pricing/pricing-content.tsx")

    expect(source).toContain('data-fee-coverage-ledger="request-fee"')
    expect(source).toContain('<Heading id="fee-coverage-title" level="h2"')
    expect(source).toContain("<dl")
    expect(source).toContain("lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)]")
    expect(source).toContain("PRICING_DISPLAY.PRIORITY_FEE")
    expect(source).toContain("CLINICAL_REVIEW_SEQUENCE")
    expect(source).toContain("REFUND_PAYMENT_PROCESS")

    expectInOrder(source, [
      '"Secure service-specific form"',
      '"Clinical assessment and decision"',
      '"Follow-up questions needed for the decision"',
      '"Digital document or eScript delivery, if approved"',
    ])

    const decisionBoard = source.indexOf('<ServiceDecisionBoard id="pricing-cards"')
    const ledger = source.indexOf("<FeeCoverageLedger />")
    const settingComparison = source.indexOf("<ComparisonTable")

    expect(decisionBoard).toBeGreaterThan(-1)
    expect(ledger).toBeGreaterThan(decisionBoard)
    expect(settingComparison).toBeGreaterThan(ledger)
    expect(source).not.toContain("GoogleReviewsBadge")
    expect(source).not.toContain("linear-gradient")
    expect(source).not.toContain("backdrop-blur")
  })
})
