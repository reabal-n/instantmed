import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { getStepsForService, type StepContext } from "@/lib/request/step-registry"
import { validateAnswersServerSide } from "@/lib/request/unified-checkout"

const identity = {
  email: "patient@example.com",
  fullName: "Pat Example",
  dateOfBirth: "1985-04-01",
  phone: "0412345678",
}

describe("medical certificate checkout contract", () => {
  const completeProfileContext: StepContext = {
    isAuthenticated: true,
    hasProfile: true,
    hasCompleteIdentity: true,
    hasMedicare: false,
    hasAddress: false,
    hasPhone: false,
    hasSex: false,
    serviceType: "med-cert",
    answers: {},
  }

  it("keeps med cert intake to certificate, symptoms, and payment when profile details are complete", () => {
    const steps = getStepsForService("med-cert", completeProfileContext).map((step) => step.id)

    expect(steps).toEqual(["certificate", "symptoms", "checkout"])
    expect(steps).not.toContain("review")
  })

  it("accepts completed certificate checkout answers without allergy fields or symptom chips", () => {
    const answers = {
      certType: "work",
      duration: "1",
      startDate: "2026-05-04",
      symptomDetails: "Fever and sore throat since yesterday.",
      symptomDuration: "1 day",
      agreedToTerms: true,
      confirmedAccuracy: true,
    }

    expect(validateAnswersServerSide("med-cert", answers, identity)).toBeNull()
  })

  it("does not render the full certificate preview or redundant symptom chip wall", () => {
    const checkoutStepSource = readFileSync(
      join(process.cwd(), "components/request/steps/checkout-step.tsx"),
      "utf8",
    )
    const certificateStepSource = readFileSync(
      join(process.cwd(), "components/request/steps/certificate-step.tsx"),
      "utf8",
    )
    const symptomsStepSource = readFileSync(
      join(process.cwd(), "components/request/steps/symptoms-step.tsx"),
      "utf8",
    )

    expect(checkoutStepSource).not.toContain("CertPreviewCard")
    expect(checkoutStepSource).not.toContain("Preview of your certificate")
    expect(certificateStepSource).not.toContain("Review my certificate")
    expect(symptomsStepSource).not.toContain("SYMPTOM_GROUPS")
    expect(symptomsStepSource).not.toContain("Previously selected")
  })

  it("keeps the final payment CTA and total row readable without duplicate price text", () => {
    const checkoutStepSource = readFileSync(
      join(process.cwd(), "components/request/steps/checkout-step.tsx"),
      "utf8",
    )

    expect(checkoutStepSource).not.toContain("label={`Pay $")
    expect(checkoutStepSource).toContain('label="Pay"')
    expect(checkoutStepSource).toContain('Total{" "}')
  })
})
