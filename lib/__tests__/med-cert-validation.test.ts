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

  it("rejects an empty symptom description but accepts brief real input (no length gate)", () => {
    const base = {
      certType: "work",
      duration: "1",
      symptomDuration: "1_2_days",
      startDate: new Date().toISOString().slice(0, 10),
      telehealthConsentGiven: true,
      confirmedAccuracy: true,
      agreedToTerms: true,
    }
    // Empty / whitespace is rejected — a med cert needs a stated reason.
    const empty = validateMedCertPayload({ ...base, symptomDetails: "   " })
    expect(empty.valid).toBe(false)
    expect(empty.error).toMatch(/describe your symptoms|plain English/)
    // Brief real input now passes: no character/word-count floor (2026-05-29).
    const brief = validateMedCertPayload({ ...base, symptomDetails: "Cough." })
    expect(brief.valid).toBe(true)
  })

  // P1.1 (2026-07-10): symptomDuration is doctor/AI context, not a safety
  // gate — a tapped chip alone must be a complete answer. It stays validated
  // against the known option set WHEN present.
  it("accepts a payload with no symptomDuration at all (optional since P1.1)", () => {
    const noDuration = {
      certType: "work",
      duration: "1",
      symptomDetails: "Cough, sore throat, and fatigue since yesterday.",
      startDate: new Date().toISOString().slice(0, 10),
      telehealthConsentGiven: true,
      confirmedAccuracy: true,
      agreedToTerms: true,
    }
    const result = validateMedCertPayload(noDuration)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()

    const serverError = validateAnswersServerSide("med-cert", { ...noDuration, symptoms: undefined }, identity)
    expect(serverError).toBeNull()
  })

  it("still rejects an unknown symptomDuration value when one is provided", () => {
    const badDuration = {
      certType: "work",
      duration: "1",
      symptomDetails: "Cough and fatigue.",
      symptomDuration: "forever_and_a_day",
      startDate: new Date().toISOString().slice(0, 10),
      telehealthConsentGiven: true,
      confirmedAccuracy: true,
      agreedToTerms: true,
    }
    const result = validateMedCertPayload(badDuration)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Invalid symptom duration")
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
