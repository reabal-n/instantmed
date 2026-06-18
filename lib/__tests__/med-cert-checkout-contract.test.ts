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
    // Use today's date so the test does not drift past the 7-day backdating
    // limit enforced by validateCertificateDateRange.
    const today = new Date().toISOString().slice(0, 10)
    const answers = {
      certType: "work",
      duration: "1",
      startDate: today,
      symptomDetails: "Fever and sore throat since yesterday.",
      symptomDuration: "1 day",
      agreedToTerms: true,
      confirmedAccuracy: true,
    }

    expect(validateAnswersServerSide("med-cert", answers, identity)).toBeNull()
  })

  it("does not require address, Medicare, sex, or phone for med cert checkout", () => {
    const today = new Date().toISOString().slice(0, 10)
    const answers = {
      certType: "work",
      duration: "1",
      startDate: today,
      symptomDetails: "Fever and sore throat since yesterday.",
      symptomDuration: "1 day",
      agreedToTerms: true,
      confirmedAccuracy: true,
    }

    expect(validateAnswersServerSide("med-cert", answers, {
      email: identity.email,
      fullName: identity.fullName,
      dateOfBirth: identity.dateOfBirth,
    })).toBeNull()
  })

  it("requires date of birth for med cert identity", () => {
    const today = new Date().toISOString().slice(0, 10)
    const answers = {
      certType: "work",
      duration: "1",
      startDate: today,
      symptomDetails: "Fever and sore throat since yesterday.",
      symptomDuration: "1 day",
      agreedToTerms: true,
      confirmedAccuracy: true,
    }

    expect(validateAnswersServerSide("med-cert", answers, {
      email: identity.email,
      fullName: identity.fullName,
    })).toBe("Date of birth is required")
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

  it("keeps checkout trust visible without implying automatic approval", () => {
    const checkoutStepSource = readFileSync(
      join(process.cwd(), "components/request/steps/checkout-step.tsx"),
      "utf8",
    )

    expect(checkoutStepSource).toContain("Before you pay")
    expect(checkoutStepSource).toContain("Approval is clinical, not automatic")
    expect(checkoutStepSource).toContain("Secure Stripe checkout. No subscription.")
    expect(checkoutStepSource).toContain("GUARANTEE")
    expect(checkoutStepSource).not.toContain("guaranteed approval")
    expect(checkoutStepSource).not.toContain("No account required - pay as a guest")
  })
})
