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
  // Regression for the 2026-05-12 prod bug where every med cert checkout
  // failed with "Please select at least one symptom." The symptoms-step UI
  // collects a free-text description + duration only — it never wrote a
  // `symptoms` array. The validator's `Array.isArray(symptoms)` requirement
  // was dead code from a retired multi-select UI. The textarea content
  // (`symptomDetails`, with aliases for older payloads) is the clinically
  // meaningful field and is validated for length.
  it("accepts the symptoms-step shape (textarea + duration, no array) at checkout", () => {
    const realUiAnswers = {
      certType: "work",
      duration: "1",
      // No `symptoms` key whatsoever — the UI never sets one.
      symptomDetails: "Cough, sore throat, and fatigue since yesterday.",
      symptomDuration: "1_2_days",
      startDate: new Date().toISOString().slice(0, 10),
      telehealthConsentGiven: true,
      confirmedAccuracy: true,
      agreedToTerms: true,
    }
    const result = validateMedCertPayload(realUiAnswers)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it("still rejects when the symptom description is shorter than 20 characters", () => {
    const tooShort = {
      certType: "work",
      duration: "1",
      symptomDetails: "Cough.",
      symptomDuration: "1_2_days",
      startDate: new Date().toISOString().slice(0, 10),
      telehealthConsentGiven: true,
      confirmedAccuracy: true,
      agreedToTerms: true,
    }
    const result = validateMedCertPayload(tooShort)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("20 characters")
  })

  it("does not block checkout on the absence of a legacy symptoms array", () => {
    // The exact failure mode the user hit on 2026-05-12: the "Pay $19.95"
    // button surfaced "Please select at least one symptom." even though
    // the Symptoms step was green-checked. That string MUST NOT appear
    // anywhere in the validator's error output for a well-formed payload.
    const realUiAnswers = {
      certType: "work",
      duration: "1",
      symptomDetails: "Cough, sore throat, headache and fatigue.",
      symptomDuration: "1_2_days",
      startDate: new Date().toISOString().slice(0, 10),
      telehealthConsentGiven: true,
      confirmedAccuracy: true,
      agreedToTerms: true,
    }
    const result = validateMedCertPayload(realUiAnswers)
    expect(result.error ?? "").not.toContain("select at least one symptom")
  })

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
