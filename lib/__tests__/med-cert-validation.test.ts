import { describe, expect, it } from "vitest"

import { validateAnswersServerSide } from "@/lib/request/unified-checkout"
import { validateCertificateStep } from "@/lib/request/validation"
import { validateMedCertPayload } from "@/lib/validation/med-cert-schema"

const identity = {
  email: "patient@example.com",
  fullName: "Pat Example",
  dateOfBirth: "1985-04-01",
}

const validMedCertAnswers = {
  certType: "work",
  certificate_type: "work",
  duration: "1",
  symptoms: ["cold_flu"],
  symptomDetails: "Cough, sore throat, and fatigue since yesterday.",
  symptom_details: "Cough, sore throat, and fatigue since yesterday.",
  symptomDuration: "1_2_days",
  symptom_duration: "1_2_days",
  telehealthConsentGiven: true,
  telehealth_consent_given: true,
  confirmedAccuracy: true,
  accuracy_confirmed: true,
  agreedToTerms: true,
  terms_agreed: true,
}

describe("medical certificate validation", () => {
  it("rejects future start dates before checkout and certificate creation", () => {
    const futureStartDate = "2099-01-01"

    expect(validateCertificateStep({
      certType: "work",
      duration: "1",
      startDate: futureStartDate,
    }).isValid).toBe(false)

    expect(validateAnswersServerSide("med-cert", {
      ...validMedCertAnswers,
      startDate: futureStartDate,
    }, identity)).toContain("future")

    const payloadValidation = validateMedCertPayload({
      ...validMedCertAnswers,
      start_date: futureStartDate,
    })

    expect(payloadValidation.valid).toBe(false)
    expect(payloadValidation.error).toContain("future")
  })
})
