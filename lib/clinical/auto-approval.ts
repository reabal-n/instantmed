/**
 * AI Auto-Approval Eligibility Engine
 *
 * Deterministic evaluation of whether a med cert intake is safe for auto-approval.
 * Uses existing triage rules + additional safety keyword checks.
 * Returns eligible=true ONLY when ALL checks pass.
 */

import { checkEmergencySymptoms, checkRedFlagPatterns } from "./triage-rules-engine"

// ============================================================================
// TYPES
// ============================================================================

export interface AutoApprovalEligibility {
  eligible: boolean
  reason: string
  disqualifyingFlags: string[]
  softFlags: string[]
}

interface DraftInfo {
  status: string
  content: Record<string, unknown>
}

interface PatientInfo {
  date_of_birth: string | null
}

// ============================================================================
// HARD-BLOCK KEYWORD LISTS
// Always block auto-approval regardless of co-symptoms.
// ============================================================================

const MENTAL_HEALTH_KEYWORDS = [
  "depression", "depressed", "mental health", "stress leave",
  "psychiatric", "ptsd", "bipolar", "psychosis", "eating disorder",
  "mental breakdown", "nervous breakdown", "ocd",
  // Defense-in-depth: also caught by checkEmergencySymptoms, but listed here
  // so they're caught even if the check order changes
  "suicidal", "suicide", "self harm", "self-harm", "selfharm", "overdose",
  "want to die", "kill myself", "hurting myself", "harming myself",
]

const INJURY_KEYWORDS = [
  "injury", "injured", "workers comp", "workers compensation",
  "work cover", "workcover", "broken", "fracture", "fractured",
  "collision", "assault", "surgery", "surgical", "post-operative",
  "post-op", "wound", "laceration", "concussion",
  "whiplash", "dislocation", "dislocated", "burns", "burn injury", "severe burn", "stitches",
]

const CHRONIC_CONDITION_KEYWORDS = [
  "chronic", "ongoing condition", "relapse",
  "long-term", "long term", "recurring", "fibromyalgia", "crohn",
  "lupus", "multiple sclerosis", "ms flare", "rheumatoid",
  "endometriosis", "celiac",
]

const PREGNANCY_KEYWORDS = [
  "pregnant", "pregnancy", "morning sickness", "miscarriage",
  "hyperemesis", "prenatal", "antenatal", "gestational",
  "trimester", "maternity",
]

// ============================================================================
// SOFT-BLOCK KEYWORD LISTS
// Only block when the keyword is the patient's sole symptom (no co-symptoms).
// If the patient has 2+ structured symptoms, these are recorded as soft flags
// for doctor batch review but do NOT prevent auto-approval.
// ============================================================================

const SOFT_BLOCK_MENTAL_HEALTH = [
  "anxiety", "anxious", "panic", "panic attack", "burnout", "stress",
]

const SOFT_BLOCK_INJURY = [
  "accident", "fall", "sprain",
]

const SOFT_BLOCK_CHRONIC = [
  "flare up", "flare-up", "flareup", "ibs", "irritable bowel",
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract all symptom/reason text from intake answers for safety scanning.
 * Concatenates relevant text fields into a single string.
 */
export function extractSymptomText(answers: Record<string, unknown> | null): string {
  if (!answers) return ""

  const parts: string[] = []

  // Free-text symptom description
  if (typeof answers.symptomDetails === "string") {
    parts.push(answers.symptomDetails)
  }

  // Structured symptom selections
  if (Array.isArray(answers.symptoms)) {
    parts.push(answers.symptoms.filter((s): s is string => typeof s === "string").join(" "))
  }

  // Duration context
  if (typeof answers.symptomDuration === "string") {
    parts.push(answers.symptomDuration)
  }

  // Additional info / notes
  if (typeof answers.additional_info === "string") {
    parts.push(answers.additional_info)
  }

  // Reason for visit
  if (typeof answers.reason_for_visit === "string") {
    parts.push(answers.reason_for_visit)
  }

  return parts.join(" ").trim()
}

/**
 * Check if text contains any keywords from a list (case-insensitive).
 */
function containsKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase()
  return keywords.filter(keyword => lower.includes(keyword))
}

/**
 * Extract duration days from intake answers.
 * Returns null if duration cannot be determined.
 */
export function extractDurationDays(answers: Record<string, unknown> | null): number | null {
  if (!answers) return null

  // Unified flow uses 'duration' directly as "1", "2", or "3"
  const duration = answers.duration as string | undefined
  if (duration) {
    const parsed = parseInt(duration, 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }

  // Legacy flow with start_date / end_date
  const startDate = answers.start_date as string | undefined
  const endDate = answers.end_date as string | undefined
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }
  }

  // Single day default (absence_dates === "single_day")
  if (answers.absence_dates === "single_day") return 1

  return null
}

/**
 * Extract start date from answers. Returns ISO date string or null.
 */
export function extractStartDate(answers: Record<string, unknown> | null): string | null {
  if (!answers) return null

  if (typeof answers.start_date === "string" && answers.start_date) {
    return answers.start_date
  }

  // For single-day certs, start date is often today
  return null
}

// ============================================================================
// MAIN EVALUATION
// ============================================================================

/**
 * Evaluate whether a med cert intake is eligible for AI auto-approval.
 *
 * Checks (ALL must pass):
 * 1. Service type is med_certs
 * 2. Patient is 18+ (minors never auto-approved)
 * 3. No emergency symptoms in text
 * 4. No red flag patterns in text
 * 5. No mental health keywords
 * 6. No injury keywords
 * 7. No chronic condition keywords
 * 8. No pregnancy keywords
 * 9. Duration is 1-N days (N configurable, default 3)
 * 10. Start date not backdated > 1 day
 * 11. Symptom text is not empty (must have actual medical reason)
 * 12. AI clinical note draft exists with status "ready"
 * 13. AI draft flags.requiresReview === false
 */
export function evaluateAutoApprovalEligibility(
  intake: { service_type: string; subtype: string | null },
  answers: Record<string, unknown> | null,
  drafts: { clinicalNote: DraftInfo | null },
  patient?: PatientInfo | null,
  options?: { maxDurationDays?: number },
): AutoApprovalEligibility {
  const flags: string[] = []
  const softFlags: string[] = []

  // 1. Service type check
  if (intake.service_type !== "med_certs") {
    return { eligible: false, reason: "Not a medical certificate service", disqualifyingFlags: ["wrong_service_type"], softFlags: [] }
  }

  // 2. Age check — minors (under 18) always require doctor review
  if (patient?.date_of_birth) {
    const dob = new Date(patient.date_of_birth)
    if (!isNaN(dob.getTime())) {
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }
      if (age < 18) {
        flags.push("patient_under_18")
      }
    }
  }

  // Extract symptom text for all keyword checks
  const symptomText = extractSymptomText(answers)

  // Co-symptom detection: if patient selected 2+ structured symptoms,
  // soft-block keywords are recorded as soft flags instead of hard blocks
  const symptomCount = Array.isArray(answers?.symptoms) ? (answers.symptoms as unknown[]).length : 0
  const hasCoSymptoms = symptomCount >= 2

  // 3. Emergency symptoms (always hard-block)
  const emergencyResult = checkEmergencySymptoms(symptomText)
  if (emergencyResult.isEmergency) {
    flags.push(`emergency: ${emergencyResult.matchedKeywords.join(", ")}`)
  }

  // 4. Red flag patterns (always hard-block)
  const redFlags = checkRedFlagPatterns(symptomText)
  if (redFlags.length > 0) {
    flags.push(`red_flags: ${redFlags.map(f => f.code).join(", ")}`)
  }

  // 5. Mental health keywords — hard-block list (always block)
  const mentalHealthMatches = containsKeywords(symptomText, MENTAL_HEALTH_KEYWORDS)
  if (mentalHealthMatches.length > 0) {
    flags.push(`mental_health: ${mentalHealthMatches.join(", ")}`)
  }

  // 5b. Mental health soft-block keywords (co-symptom aware)
  const softMentalHealthMatches = containsKeywords(symptomText, SOFT_BLOCK_MENTAL_HEALTH)
  if (softMentalHealthMatches.length > 0) {
    if (hasCoSymptoms) {
      softFlags.push(...softMentalHealthMatches.map(k => `${k}_co_symptom`))
    } else {
      flags.push(`mental_health: ${softMentalHealthMatches.join(", ")}`)
    }
  }

  // 6. Injury keywords — hard-block list (always block)
  const injuryMatches = containsKeywords(symptomText, INJURY_KEYWORDS)
  if (injuryMatches.length > 0) {
    flags.push(`injury: ${injuryMatches.join(", ")}`)
  }

  // 6b. Injury soft-block keywords (co-symptom aware)
  const softInjuryMatches = containsKeywords(symptomText, SOFT_BLOCK_INJURY)
  if (softInjuryMatches.length > 0) {
    if (hasCoSymptoms) {
      softFlags.push(...softInjuryMatches.map(k => `${k}_co_symptom`))
    } else {
      flags.push(`injury: ${softInjuryMatches.join(", ")}`)
    }
  }

  // 7. Chronic condition keywords — hard-block list (always block)
  const chronicMatches = containsKeywords(symptomText, CHRONIC_CONDITION_KEYWORDS)
  if (chronicMatches.length > 0) {
    flags.push(`chronic: ${chronicMatches.join(", ")}`)
  }

  // 7b. Chronic soft-block keywords (co-symptom aware)
  const softChronicMatches = containsKeywords(symptomText, SOFT_BLOCK_CHRONIC)
  if (softChronicMatches.length > 0) {
    if (hasCoSymptoms) {
      softFlags.push(...softChronicMatches.map(k => `${k}_co_symptom`))
    } else {
      flags.push(`chronic: ${softChronicMatches.join(", ")}`)
    }
  }

  // 8. Pregnancy keywords (always hard-block)
  const pregnancyMatches = containsKeywords(symptomText, PREGNANCY_KEYWORDS)
  if (pregnancyMatches.length > 0) {
    flags.push(`pregnancy: ${pregnancyMatches.join(", ")}`)
  }

  // 9. Duration check (1-N days, configurable via admin dashboard, hard-capped at 3)
  const maxDuration = Math.min(options?.maxDurationDays ?? 3, 3)
  const durationDays = extractDurationDays(answers)
  if (durationDays === null) {
    flags.push("duration_unknown")
  } else if (durationDays > maxDuration) {
    flags.push(`duration_too_long: ${durationDays} days (max ${maxDuration})`)
  } else if (durationDays < 1) {
    flags.push("duration_invalid")
  }

  // 10. Backdating check (start date should not be > 1 day in the past)
  const startDateStr = extractStartDate(answers)
  if (startDateStr) {
    const startDate = new Date(startDateStr)
    const todayUtc = new Date()
    const todayDateStr = todayUtc.toISOString().split("T")[0]
    const oneDayAgoUtc = new Date(todayDateStr)
    oneDayAgoUtc.setUTCDate(oneDayAgoUtc.getUTCDate() - 1)

    if (startDate < oneDayAgoUtc) {
      flags.push("backdated_too_far")
    }
  }

  // 11. Symptom text must be substantive (not empty/generic)
  if (!symptomText || symptomText.trim().length < 5) {
    flags.push("empty_symptom_text")
  }

  // 12. AI draft exists and is ready
  if (!drafts.clinicalNote) {
    flags.push("missing_clinical_note_draft")
  } else if (drafts.clinicalNote.status !== "ready") {
    flags.push(`draft_not_ready: ${drafts.clinicalNote.status}`)
  } else {
    // 13. AI draft doesn't require review
    const draftFlags = drafts.clinicalNote.content?.flags as { requiresReview?: boolean; flagReason?: string | null } | undefined
    if (draftFlags?.requiresReview) {
      flags.push(`draft_requires_review: ${draftFlags.flagReason || "unspecified"}`)
    }
  }

  // Final decision
  if (flags.length > 0) {
    return {
      eligible: false,
      reason: `Disqualified: ${flags[0]}`,
      disqualifyingFlags: flags,
      softFlags,
    }
  }

  return {
    eligible: true,
    reason: "All checks passed — standard med cert, no flags, clean draft",
    disqualifyingFlags: [],
    softFlags,
  }
}
