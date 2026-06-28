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
    // Med-cert now uses the unified review-step as its review+pay surface
    // (the standalone checkout-step was retired in the 2026-06-28 unification).
    const reviewStepSource = readFileSync(
      join(process.cwd(), "components/request/steps/review-step.tsx"),
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

    expect(reviewStepSource).not.toContain("CertPreviewCard")
    expect(reviewStepSource).not.toContain("Preview of your certificate")
    expect(certificateStepSource).not.toContain("Review my certificate")
    expect(symptomsStepSource).not.toContain("SYMPTOM_GROUPS")
    expect(symptomsStepSource).not.toContain("Previously selected")
  })

  // The pay-surface CTA + trust contracts (single Pay button, one quiet trust
  // cluster, no auto-approval implication) now live in
  // review-step-priority-contract.test.ts, since review-step is the single
  // review+pay step for med-cert / prescription / consult after the unification.
})
