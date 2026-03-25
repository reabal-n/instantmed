import { describe, it, expect } from 'vitest'
import {
  evaluateAutoApprovalEligibility,
  extractSymptomText,
  extractDurationDays,
  extractStartDate,
} from '@/lib/clinical/auto-approval'

// ============================================================================
// HELPERS
// ============================================================================

function makeIntake(overrides?: Partial<{ service_type: string; subtype: string | null }>) {
  return { service_type: "med_certs", subtype: "work", ...overrides }
}

function makeAnswers(overrides?: Record<string, unknown>) {
  return {
    symptoms: ["Cold", "Runny nose"],
    symptomDetails: "I have a cold and runny nose since yesterday",
    symptomDuration: "1-2 days",
    duration: "1",
    start_date: new Date().toISOString().split("T")[0],
    ...overrides,
  }
}

function makeReadyDraft(overrides?: Record<string, unknown>) {
  return {
    clinicalNote: {
      status: "ready",
      content: {
        presentingComplaint: "Cold symptoms",
        historyOfPresentIllness: "1-2 days",
        flags: { requiresReview: false, flagReason: null },
        ...overrides,
      },
    },
  }
}

// ============================================================================
// extractSymptomText
// ============================================================================

describe("extractSymptomText", () => {
  it("concatenates all text fields from answers", () => {
    const text = extractSymptomText({
      symptomDetails: "headache and fatigue",
      symptoms: ["Headache", "Fatigue"],
      symptomDuration: "2 days",
    })
    expect(text).toContain("headache and fatigue")
    expect(text).toContain("Headache Fatigue")
    expect(text).toContain("2 days")
  })

  it("returns empty string for null answers", () => {
    expect(extractSymptomText(null)).toBe("")
  })

  it("handles missing fields gracefully", () => {
    expect(extractSymptomText({})).toBe("")
  })

  it("includes reason_for_visit and additional_info", () => {
    const text = extractSymptomText({
      reason_for_visit: "need time off work",
      additional_info: "for a car accident",
    })
    expect(text).toContain("need time off work")
    expect(text).toContain("for a car accident")
  })
})

// ============================================================================
// extractDurationDays
// ============================================================================

describe("extractDurationDays", () => {
  it("extracts duration from unified flow", () => {
    expect(extractDurationDays({ duration: "1" })).toBe(1)
    expect(extractDurationDays({ duration: "2" })).toBe(2)
    expect(extractDurationDays({ duration: "3" })).toBe(3)
  })

  it("calculates from start_date and end_date", () => {
    expect(extractDurationDays({
      start_date: "2026-03-24",
      end_date: "2026-03-25",
    })).toBe(2)
  })

  it("returns 1 for single_day absence", () => {
    expect(extractDurationDays({ absence_dates: "single_day" })).toBe(1)
  })

  it("returns null for missing answers", () => {
    expect(extractDurationDays(null)).toBeNull()
    expect(extractDurationDays({})).toBeNull()
  })
})

// ============================================================================
// extractStartDate
// ============================================================================

describe("extractStartDate", () => {
  it("returns start_date from answers", () => {
    expect(extractStartDate({ start_date: "2026-03-24" })).toBe("2026-03-24")
  })

  it("returns null for missing start_date", () => {
    expect(extractStartDate(null)).toBeNull()
    expect(extractStartDate({})).toBeNull()
  })
})

// ============================================================================
// evaluateAutoApprovalEligibility
// ============================================================================

describe("evaluateAutoApprovalEligibility", () => {
  // ---- Happy path ----

  it("approves clean 1-day cert for adult patient", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ duration: "1" }),
      makeReadyDraft(),
      { date_of_birth: "1990-01-15" },
    )
    expect(result.eligible).toBe(true)
    expect(result.disqualifyingFlags).toHaveLength(0)
  })

  it("approves clean 3-day cert", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ duration: "3" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(true)
  })

  it("approves when patient info is not provided (backwards compat)", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ duration: "1" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(true)
  })

  // ---- Service type ----

  it("rejects non-med-cert service type", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake({ service_type: "common_scripts" }),
      makeAnswers(),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags).toContain("wrong_service_type")
  })

  // ---- Emergency ----

  it("rejects intake with emergency keyword 'chest pain'", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "I have chest pain and feel dizzy" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("emergency"))).toBe(true)
  })

  // ---- Red flags ----

  it("rejects intake with red flag pattern", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Severe abdominal pain with guarding" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("red_flags"))).toBe(true)
  })

  // ---- Mental health ----

  it("rejects intake with mental health keyword 'depression'", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Feeling very depressed, can't get out of bed" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("mental_health"))).toBe(true)
  })

  it("rejects intake with 'anxiety'", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Severe anxiety making it hard to work" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("mental_health"))).toBe(true)
  })

  // ---- Injury ----

  it("rejects intake with injury keyword 'accident'", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Had a car accident yesterday, back is sore" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("injury"))).toBe(true)
  })

  it("rejects intake with 'workers comp'", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Need for workers comp claim" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("injury"))).toBe(true)
  })

  // ---- Chronic ----

  it("rejects intake with chronic condition keyword", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Chronic back pain flare up" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("chronic"))).toBe(true)
  })

  // ---- Pregnancy ----

  it("rejects intake with pregnancy keyword", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Morning sickness, pregnant 12 weeks" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("pregnancy"))).toBe(true)
  })

  // ---- Duration ----

  it("rejects 4-day cert (too long)", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ duration: "4" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("duration_too_long"))).toBe(true)
  })

  it("rejects when duration is unknown", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ duration: undefined }),
      makeReadyDraft()
    )
    // duration: undefined but absence_dates not set, so falls through to null
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("duration_unknown"))).toBe(true)
  })

  // ---- Backdating ----

  it("rejects start date backdated more than 1 day", () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ start_date: threeDaysAgo.toISOString().split("T")[0] }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags).toContain("backdated_too_far")
  })

  it("allows start date yesterday (1 day back)", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ start_date: yesterday.toISOString().split("T")[0] }),
      makeReadyDraft()
    )
    // Should not be flagged for backdating
    expect(result.disqualifyingFlags).not.toContain("backdated_too_far")
  })

  // ---- AI draft checks ----

  it("rejects when clinical note draft is missing", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers(),
      { clinicalNote: null }
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags).toContain("missing_clinical_note_draft")
  })

  it("rejects when draft status is not ready", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers(),
      { clinicalNote: { status: "failed", content: {} } }
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("draft_not_ready"))).toBe(true)
  })

  it("rejects when draft flags requiresReview=true", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers(),
      makeReadyDraft({ flags: { requiresReview: true, flagReason: "Ambiguous symptoms" } })
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("draft_requires_review"))).toBe(true)
  })

  // ---- Self-harm / suicide (defense-in-depth) ----

  it("rejects intake with 'suicidal' keyword", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Feeling suicidal and hopeless" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    // Caught by both emergency AND mental_health checks
    expect(result.disqualifyingFlags.some(f => f.includes("emergency") || f.includes("mental_health"))).toBe(true)
  })

  it("rejects intake with 'self-harm' keyword", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "History of self-harm, need time off" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
  })

  it("rejects intake with 'overdose' keyword", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Recovering from an overdose" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
  })

  // ---- Additional text fields ----

  it("catches keywords in reason_for_visit field", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "feeling unwell", reason_for_visit: "depression and anxiety" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("mental_health"))).toBe(true)
  })

  it("catches keywords in additional_info field", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "cold", additional_info: "this is for a workers comp claim" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("injury"))).toBe(true)
  })

  // ---- Age check ----

  it("rejects intake for minor (under 18)", () => {
    const minorDob = new Date()
    minorDob.setFullYear(minorDob.getFullYear() - 16)
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers(),
      makeReadyDraft(),
      { date_of_birth: minorDob.toISOString().split("T")[0]! },
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags).toContain("patient_under_18")
  })

  it("allows 18-year-old patient", () => {
    const eighteenDob = new Date()
    eighteenDob.setFullYear(eighteenDob.getFullYear() - 18)
    eighteenDob.setDate(eighteenDob.getDate() - 1) // just turned 18
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers(),
      makeReadyDraft(),
      { date_of_birth: eighteenDob.toISOString().split("T")[0]! },
    )
    expect(result.disqualifyingFlags).not.toContain("patient_under_18")
  })

  it("handles null patient DOB gracefully (no flag)", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers(),
      makeReadyDraft(),
      { date_of_birth: null },
    )
    expect(result.disqualifyingFlags).not.toContain("patient_under_18")
  })

  // ---- Empty symptom text ----

  it("rejects when symptom text is empty", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "", symptoms: [], symptomDuration: "", additional_info: "", reason_for_visit: "" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags).toContain("empty_symptom_text")
  })

  it("rejects when symptom text is too short", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "ab", symptoms: [], symptomDuration: "", additional_info: "", reason_for_visit: "" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags).toContain("empty_symptom_text")
  })

  // ---- Expanded keyword coverage ----

  it("rejects intake with 'anxious' keyword", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Feeling very anxious and can't sleep" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("mental_health"))).toBe(true)
  })

  it("rejects intake with 'selfharm' (no space)", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "History of selfharm" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("mental_health"))).toBe(true)
  })

  it("rejects intake with 'whiplash' keyword", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Neck pain from whiplash" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("injury"))).toBe(true)
  })

  it("rejects intake with 'endometriosis' keyword", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ symptomDetails: "Endometriosis flare up" }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("chronic"))).toBe(true)
  })

  // ---- Multiple flags ----

  it("collects multiple disqualifying flags", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({
        symptomDetails: "Depression and chronic pain after accident",
        duration: "5",
      }),
      makeReadyDraft()
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.length).toBeGreaterThan(1)
  })
})
