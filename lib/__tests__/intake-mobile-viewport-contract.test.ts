import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8")
}

const requestFlowSource = readProjectFile("components/request/request-flow.tsx")
const rootLayoutSource = readProjectFile("app/layout.tsx")
const intakePrimitivesSource = readProjectFile("components/request/shared/intake-step-primitives.tsx")

const intakeStepFiles = [
  "components/request/steps/certificate-step.tsx",
  "components/request/steps/symptoms-step.tsx",
  "components/request/steps/medication-step.tsx",
  "components/request/steps/medication-history-step.tsx",
  "components/request/steps/medical-history-step.tsx",
  "components/request/steps/consult-reason-step.tsx",
  "components/request/steps/patient-details-step.tsx",
  "components/request/steps/review-step.tsx",
  "components/request/steps/ed-goals-step.tsx",
  "components/request/steps/ed-assessment-step.tsx",
  "components/request/steps/ed-health-step.tsx",
  "components/request/steps/ed-preferences-step.tsx",
  "components/request/steps/hair-loss-goals-step.tsx",
  "components/request/steps/hair-loss-assessment-step.tsx",
  "components/request/steps/hair-loss-health-step.tsx",
  "components/request/steps/hair-loss-preferences-step.tsx",
  "components/request/steps/weight-loss-assessment-step.tsx",
  "components/request/steps/weight-loss-call-step.tsx",
  "components/request/steps/womens-health-type-step.tsx",
  "components/request/steps/womens-health-assessment-step.tsx",
]

describe("intake mobile viewport contract", () => {
  it("uses a real mobile primary-action bar instead of making users scroll to continue", () => {
    expect(requestFlowSource).toContain('data-intake-mobile-action-bar="true"')
    expect(requestFlowSource).toContain("[data-intake-primary-action='true']")
    expect(requestFlowSource).toContain("MutationObserver")
    expect(requestFlowSource).toContain("handleMobilePrimaryAction")
    expect(requestFlowSource).toContain("currentStepId !== 'checkout'")
    expect(requestFlowSource).not.toContain("hidden on checkout/review which have their own CTAs")
  })

  it("keeps the mobile intake chrome compact enough for one-screen question steps", () => {
    expect(requestFlowSource).toContain("h-12 sm:h-14")
    expect(requestFlowSource).toContain("hidden sm:flex")
    expect(requestFlowSource).toContain("py-4 sm:py-6")
    expect(requestFlowSource).toContain("pb-[calc(4.25rem+env(safe-area-inset-bottom))]")
  })

  it.each(intakeStepFiles)("%s exposes one mobile shell primary action", (path) => {
    const source = readProjectFile(path)
    expect(source).toContain('data-intake-primary-action="true"')
    expect(source).toContain("max-sm:hidden")
  })

  it("leaves checkout on its dedicated sticky payment control", () => {
    const checkoutSource = readProjectFile("components/request/steps/checkout-step.tsx")
    expect(checkoutSource).toContain("fixed bottom-0")
    expect(checkoutSource).toContain("CheckoutButton")
    expect(checkoutSource).not.toContain('data-intake-primary-action="true"')
  })

  it("declares intentional smooth scrolling on the root html element", () => {
    expect(rootLayoutSource).toContain('data-scroll-behavior="smooth"')
  })

  it("uses explicit question primitives for sensitive intake answers", () => {
    expect(intakePrimitivesSource).toContain('data-intake-question-card="true"')
    expect(intakePrimitivesSource).toContain('data-intake-binary-choice="true"')

    const edHealthSource = readProjectFile("components/request/steps/ed-health-step.tsx")
    const hairHealthSource = readProjectFile("components/request/steps/hair-loss-health-step.tsx")
    expect(edHealthSource).toContain("BinaryChoice")
    expect(hairHealthSource).toContain("BinaryChoice")
    expect(edHealthSource).not.toContain("SwitchField")
    expect(hairHealthSource).not.toContain("SwitchField")
  })

  it("keeps the ED assessment to one visible IIEF question at a time", () => {
    const source = readProjectFile("components/request/steps/ed-assessment-step.tsx")
    expect(source).toContain("activeQuestionIndex")
    expect(source).toContain("Question {activeQuestionIndex + 1} of")
    expect(source).toContain("handleScaleChange")
  })

  it("keeps active ED and hair preference copy away from named prescription medicines", () => {
    const preferenceCopy = [
      readProjectFile("components/request/steps/ed-preferences-step.tsx"),
      readProjectFile("components/request/steps/hair-loss-preferences-step.tsx"),
      readProjectFile("components/request/steps/hair-loss-health-step.tsx"),
    ].join("\n").toLowerCase()

    expect(preferenceCopy).not.toContain("finasteride")
    expect(preferenceCopy).not.toContain("sildenafil")
    expect(preferenceCopy).not.toContain("tadalafil")
  })
})
