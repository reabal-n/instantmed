/**
 * AI Auto-Approval Eligibility Engine
 *
 * Deterministic evaluation of whether a med cert intake is safe for auto-approval.
 * Uses existing triage rules + additional safety keyword checks.
 * Returns eligible=true ONLY when ALL checks pass.
 *
 * IMPORTANT: Increment ELIGIBILITY_ENGINE_VERSION when modifying check logic,
 * keyword lists, or thresholds. This version is recorded in the audit trail
 * so compliance reviews can identify which clinical criteria were applied.
 */

import { normalizeMedicalCertificateType } from "@/lib/validation/med-cert-schema"

import { checkEmergencySymptoms, checkRedFlagPatterns } from "./triage-rules-engine"

/**
 * Eligibility engine version - increment on ANY change to:
 * - Check logic (adding/removing/modifying checks)
 * - Keyword lists (MENTAL_HEALTH_KEYWORDS, INJURY_KEYWORDS, etc.)
 * - Thresholds (backdating window, duration limits, cooldown periods)
 * - Soft-block / hard-block classification
 *
 * Format: MAJOR.MINOR (major = structural changes, minor = keyword/threshold updates)
 */
export const ELIGIBILITY_ENGINE_VERSION = "3.2"

/**
 * Human-readable manifest of all checks the engine applies.
 * Recorded in audit logs for medicolegal compliance.
 */
export const ELIGIBILITY_CHECK_MANIFEST = [
  "service_type_is_med_cert",
  "certificate_type_is_supported_standard_absence",
  "repeat_request_7d_cooldown",
  "overlapping_cert_date_check",
  "patient_age_18_plus",
  "emergency_symptom_screening",
  "red_flag_pattern_screening",
  "mental_health_keyword_hard_block",
  "mental_health_keyword_soft_block",
  "injury_keyword_hard_block",
  "injury_keyword_soft_block",
  "chronic_condition_hard_block",
  "chronic_condition_soft_block",
  "pregnancy_keyword_block",
  "duration_within_limit",
  "high_stakes_use_case_hard_block",
  "symptom_text_substantive",
  "ai_clinical_note_exists_and_ready",
  "ai_draft_review_flag_pre_issue_block",
  "code_owned_soft_flag_rollout_policy",
] as const

// ============================================================================
// TYPES
// ============================================================================

export interface AutoApprovalEligibility {
  eligible: boolean
  reason: string
  disqualifyingFlags: string[]
  softFlags: string[]
  /** Version of the eligibility engine that made this decision */
  engineVersion: string
  /** List of all checks that were evaluated */
  checksApplied: readonly string[]
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
  "depression", "depressed",
  "psychiatric", "ptsd", "bipolar", "psychosis", "eating disorder",
  "mental breakdown", "nervous breakdown", "ocd",
  // Defense-in-depth: also caught by checkEmergencySymptoms, but listed here
  // so they're caught even if the check order changes
  "suicidal", "suicide", "self harm", "self-harm", "selfharm", "overdose",
  "want to die", "kill myself", "hurting myself", "harming myself",
]

const INJURY_KEYWORDS = [
  "workers comp", "workers compensation",
  "work cover", "workcover", "fracture", "fractured",
  "collision", "assault", "surgery", "surgical", "post-operative",
  "post-op", "laceration", "concussion",
  "whiplash", "dislocation", "dislocated", "burns", "burn injury", "severe burn", "stitches",
]

const CHRONIC_CONDITION_KEYWORDS = [
  "chronic", "relapse",
  "long-term", "long term", "recurring",
  // Named chronic / structural conditions (added 2026-06-14). The symptom-text
  // gate now accepts these plain-language condition names so patients aren't
  // blocked at the symptoms step; auto-approval must therefore route them to a
  // doctor rather than auto-issuing a cert for an ongoing condition. Matched on
  // word boundaries, so "eczema" matches "eczema flare" but not substrings.
  "eczema", "psoriasis", "sciatica", "gout", "hernia",
]

const PREGNANCY_KEYWORDS = [
  "pregnant", "pregnancy", "morning sickness", "miscarriage",
  "hyperemesis", "prenatal", "antenatal", "gestational",
  "trimester", "maternity",
]

// High-stakes use cases that must NEVER auto-approve. These require a doctor
// to read the request, decide whether the cert is appropriate, and reject if
// not. They are also the categories that produce verification phone calls and
// AHPRA complaints when a third party (uni, court, employer's insurer, RTA,
// firearms registry, family lawyer) follows up. We do not make fitness-for-X
// determinations from a structured form.
//
// Canonical list lives in `lib/clinical/high-stakes-keywords.ts` so the
// intake-time hard block and the auto-approval gate can't drift.
// (note: "workers comp" / "workcover" / "work injury" already in INJURY_KEYWORDS)
import { HIGH_STAKES_USE_CASE_KEYWORDS } from "./high-stakes-keywords"

// ============================================================================
// SOFT-BLOCK KEYWORD LISTS
// Only hard-block when the keyword is the patient's sole symptom (no
// co-symptoms). With 2+ structured symptoms, the engine records a soft flag.
// The active rollout requires zero soft flags, so these requests still route to
// a doctor before issue. The flags are also persisted to intakes.risk_flags for
// durable operator context (lib/clinical/soft-flag-persistence.ts).
// ============================================================================

const SOFT_BLOCK_MENTAL_HEALTH = [
  "panic", "panic attack", "burnout",
]

const SOFT_BLOCK_INJURY = [
  "accident", "fall", "wound",
]

const SOFT_BLOCK_CHRONIC: string[] = []

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

  // Free-text symptom description. Scan every current + legacy alias because
  // the checkout gate accepts all of them and the issuance backstop must never
  // have a narrower view of the same patient statement.
  const textAnswerKeys = [
    "symptomDetails",
    "symptom_details",
    "symptomsDescription",
    "symptoms_description",
    "additional_info",
    "additionalInfo",
    "additional_information",
    "reason_for_visit",
  ] as const
  for (const key of textAnswerKeys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) parts.push(value)
  }

  // Structured symptom selections
  if (Array.isArray(answers.symptoms)) {
    parts.push(answers.symptoms.filter((s): s is string => typeof s === "string").join(" "))
  }

  // Duration context
  if (typeof answers.symptomDuration === "string") {
    parts.push(answers.symptomDuration)
  }

  return parts.join(" ").trim()
}

/**
 * Normalize the only certificate purposes the protocol may issue. Legacy
 * aliases remain accepted for already-stored requests; every other value is a
 * pre-issuance block even when the symptom text itself looks routine.
 */
function getSupportedCertificateType(
  intakeSubtype: string | null | undefined,
  answers: Record<string, unknown> | null,
): "work" | "study" | "carer" | null {
  const raw = answers?.certType ?? answers?.certificate_type ?? intakeSubtype
  return normalizeMedicalCertificateType(raw)
}

/**
 * Check if text contains any keywords from a list (case-insensitive,
 * word-boundary aware).
 *
 * Substring matching was producing aggressive false positives that pushed
 * legitimately auto-approvable intakes into manual review (and delayed
 * revenue):
 *   - "burns" matched "sunburns" (a common cold-symptom phrasing)
 *   - "chronic" matched "not chronic, first time" (patient explicitly
 *     ruling it out)
 *   - "maternity" matched "on maternity leave already, just sick today"
 *     (patient is not pregnant, just stating their employment status)
 *   - "surgery" matched "had minor surgery last week, feeling unwell from
 *     recovery" (the surgery itself is past, this is a cold today)
 *
 * Word-boundary regex (`\b...\b`) restores the original intent: match the
 * keyword as a discrete word, not as a substring inside another word. The
 * "not chronic" / "feeling unwell post-surgery" false-positives still
 * trigger because the keyword IS present as a word — those require
 * negation handling at the rule level, not at the matcher level. Out of
 * scope here; tracked separately.
 */
const KEYWORD_BOUNDARY_CACHE = new Map<string, RegExp>()
function keywordBoundaryRegex(keyword: string): RegExp {
  const cached = KEYWORD_BOUNDARY_CACHE.get(keyword)
  if (cached) return cached
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`\\b${escaped}\\b`, "i")
  KEYWORD_BOUNDARY_CACHE.set(keyword, re)
  return re
}

function containsKeywords(text: string, keywords: ReadonlyArray<string>): string[] {
  if (!text) return []
  return keywords.filter(keyword => keywordBoundaryRegex(keyword).test(text))
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
 * Checks both camelCase (unified flow) and snake_case (legacy flow).
 */
export function extractStartDate(answers: Record<string, unknown> | null): string | null {
  if (!answers) return null

  // Unified flow uses camelCase
  if (typeof answers.startDate === "string" && answers.startDate) {
    return answers.startDate
  }

  // Legacy flow uses snake_case
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
 * 2. Purpose normalizes to work, study, or carer
 * 3. Patient is 18+ (minors never auto-approved)
 * 4. No emergency, red-flag, high-stakes, or excluded clinical signals
 * 5. Duration is within the code-owned 1-3 day boundary
 * 6. Symptom text is substantive
 * 7. AI clinical note draft exists with status "ready"
 * 8. AI draft flags.requiresReview === false
 * 9. Active rollout contains no soft signals
 */
export function evaluateAutoApprovalEligibility(
  intake: { service_type: string; subtype?: string | null },
  answers: Record<string, unknown> | null,
  drafts: { clinicalNote: DraftInfo | null },
  patient?: PatientInfo | null,
  options?: {
    maxDurationDays?: number
    previousApprovalCount?: number
    /** Number of approved certs for this patient in the last 7 days */
    recentCertCount?: number
    /** Whether the requested dates overlap with an existing approved cert */
    hasOverlappingCert?: boolean
    /**
     * Attention-severity intake flag codes (from `intakes.risk_flags`). Any
     * present means a human must review — a flagged cert must NEVER auto-issue.
     * Info-severity stored flags are not passed here; current engine soft
     * signals are evaluated separately by `requireNoSoftFlags`.
     */
    attentionFlagCodes?: string[]
    /** Route every engine soft signal to a doctor during a bounded rollout. */
    requireNoSoftFlags?: boolean
  },
): AutoApprovalEligibility {
  const flags: string[] = []
  const softFlags: string[] = []

  // Helper: stamp every return with engine version and checks manifest
  const result = (r: Omit<AutoApprovalEligibility, "engineVersion" | "checksApplied">): AutoApprovalEligibility => ({
    ...r,
    engineVersion: ELIGIBILITY_ENGINE_VERSION,
    checksApplied: ELIGIBILITY_CHECK_MANIFEST,
  })

  // Service-type mismatch: only med certs are eligible for auto-approval
  if (intake.service_type !== "med_certs") {
    return result({
      eligible: false,
      reason: `Service type ${intake.service_type} is not eligible for auto-approval`,
      disqualifyingFlags: ["service_type_mismatch"],
      softFlags: [],
    })
  }

  // 1. Supported purpose boundary. The public flow currently offers routine
  // work, study, and carer's-leave certificates only. Never infer a routine
  // certificate from mild symptoms when the stored purpose is Centrelink,
  // return-to-work, capacity, or another unsupported document request.
  const certificateType = getSupportedCertificateType(intake.subtype, answers)
  if (!certificateType) {
    const rawType = answers?.certType ?? answers?.certificate_type ?? intake.subtype
    const displayType = typeof rawType === "string"
      ? rawType.trim().toLowerCase().replace(/[-_]+/g, " ")
      : "missing"
    flags.push(`unsupported_certificate_type: ${displayType}`)
  }

  // 1a. Doctor-attention intake flags — a flagged cert must NEVER auto-issue.
  // Sourced from softened intake gaps the doctor must review. Routed
  // deterministically to needs_doctor (`intake_attention_flags:` is pinned in
  // DETERMINISTIC_FAILURE_PREFIXES). Info-severity flags are not passed in, so
  // the 1–2 day fast path below is unaffected.
  if (options?.attentionFlagCodes && options.attentionFlagCodes.length > 0) {
    flags.push(`intake_attention_flags: ${options.attentionFlagCodes.join(", ")}`)
  }

  // 1b. Repeat request cooldown - block if patient got 3+ certs in the last 7 days
  // Prevents abuse patterns that would trigger AHPRA scrutiny
  if (options?.recentCertCount !== undefined && options.recentCertCount >= 3) {
    flags.push(`repeat_request_within_7d: ${options.recentCertCount} recent cert(s)`)
  }

  // 1c. Overlapping date detection - block if dates overlap an existing approved cert
  // Two valid certificates covering the same dates from the same doctor is a medicolegal red flag
  if (options?.hasOverlappingCert) {
    flags.push("overlapping_cert_dates")
  }

  // 2. Age check - minors (under 18) always require doctor review.
  // Missing or unparseable DOB is treated as disqualifying: cannot confirm 18+.
  if (!patient?.date_of_birth) {
    flags.push("patient_dob_missing")
  } else {
    const dob = new Date(patient.date_of_birth)
    if (isNaN(dob.getTime())) {
      flags.push("patient_dob_invalid")
    } else {
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

  // Track which entries in flags[] originated from soft-block keyword lists
  // (as opposed to hard-block lists or structural checks like empty_symptom_text).
  // Used below to determine whether ALL flags are soft-origin (enabling fast-paths).
  const softOriginFlags = new Set<string>()

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

  // 5. Mental health keywords - hard-block list (always block)
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
      const f = `mental_health: ${softMentalHealthMatches.join(", ")}`
      flags.push(f)
      softOriginFlags.add(f)
    }
  }

  // 6. Injury keywords - hard-block list (always block)
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
      // Intentionally NOT added to softOriginFlags - injury soft-flags always
      // require doctor review even for 1-day certs (workers comp risk)
      flags.push(`injury: ${softInjuryMatches.join(", ")}`)
    }
  }

  // 7. Chronic condition keywords - hard-block list (always block)
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
      const f = `chronic: ${softChronicMatches.join(", ")}`
      flags.push(f)
      softOriginFlags.add(f)
    }
  }

  // 8. Pregnancy keywords (always hard-block)
  const pregnancyMatches = containsKeywords(symptomText, PREGNANCY_KEYWORDS)
  if (pregnancyMatches.length > 0) {
    flags.push(`pregnancy: ${pregnancyMatches.join(", ")}`)
  }

  // 8b. High-stakes use cases — exam deferral, court, fitness-to-drive,
  // firearms, custody, insurance claims. Doctor must review; never auto-approve.
  const highStakesMatches = containsKeywords(symptomText, HIGH_STAKES_USE_CASE_KEYWORDS)
  if (highStakesMatches.length > 0) {
    flags.push(`high_stakes_use_case: ${highStakesMatches.join(", ")}`)
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

  // 10. Symptom text must be substantive (not empty/generic)
  if (!symptomText || symptomText.trim().length < 5) {
    flags.push("empty_symptom_text")
  }

  // 11. AI draft exists and is ready
  if (!drafts.clinicalNote) {
    flags.push("missing_clinical_note_draft")
  } else if (drafts.clinicalNote.status !== "ready") {
    flags.push(`draft_not_ready: ${drafts.clinicalNote.status}`)
  } else {
    // 12. AI draft review flag — PRE-ISSUANCE BLOCK (operator decision
    // 2026-08-07, promoted from soft). 90 days of production: 8 of 109
    // auto-approvals carried this flag and every one was the draft lane —
    // among them a fever/photophobia/vomiting/difficulty-walking cluster the
    // draft itself called "potential red-flag symptoms", auto-issued because
    // the flag was soft and its only reader (batch review) had been removed.
    // The keyword gates never fired on any of them. Cost of blocking: ~one
    // extra manual review per 11 days. The AI still decides nothing — an
    // uncertain draft now routes to a DOCTOR before any certificate exists.
    // Deterministic: the draft is generated once per intake, so the verdict
    // cannot change on retry (draft_not_ready / missing_clinical_note_draft
    // above stay transient because an ABSENT draft can still be generated).
    const draftFlags = drafts.clinicalNote.content?.flags as { requiresReview?: boolean; flagReason?: string | null } | undefined
    if (draftFlags?.requiresReview) {
      flags.push(`draft_review_flag: ${draftFlags.flagReason || "unspecified"}`)
    }
  }

  // The engine keeps tuned soft-signal behaviour available for analysis and
  // future reviewed protocols, while the initial reactivation policy permits
  // only a completely clean lane. This is deliberately code-owned: a database
  // setting cannot make a soft-flagged certificate eligible.
  if (options?.requireNoSoftFlags && softFlags.length > 0) {
    flags.push(`rollout_requires_no_soft_flags: ${softFlags.join(", ")}`)
  }

  // Historical tuning retained behind the policy seam. It is unreachable while
  // the active rollout sets `requireNoSoftFlags: true`; another reviewed code
  // decision would be required before a soft-flagged request could use it.
  //
  // hasOnlySoftFlags: every flag in flags[] originated from a soft-block keyword list
  // (tracked via softOriginFlags). Hard-block lists, emergency checks, and structural
  // checks (empty_symptom_text, duration_unknown) are never soft-origin, and
  // that invariant is what makes this fast path medico-legally safe.
  const hasOnlySoftFlags = flags.length > 0 && flags.every(f => softOriginFlags.has(f))
  if (hasOnlySoftFlags && durationDays !== null && durationDays <= 2) {
    return result({
      eligible: true,
      reason: `${durationDays}-day certificate with mild symptoms - auto-approved`,
      disqualifyingFlags: [],
      softFlags: flags,
    })
  }

  // TRUST: Returning patients with prior successful auto-approvals get relaxed thresholds
  const previousApprovals = options?.previousApprovalCount ?? 0
  if (previousApprovals >= 2 && hasOnlySoftFlags) {
    return result({
      eligible: true,
      reason: `Returning patient (${previousApprovals} prior approvals) with soft flags only`,
      disqualifyingFlags: [],
      softFlags: flags,
    })
  }

  // Final decision
  if (flags.length > 0) {
    return result({
      eligible: false,
      reason: `Disqualified: ${flags[0]}`,
      disqualifyingFlags: flags,
      softFlags,
    })
  }

  return result({
    eligible: true,
    reason: "All checks passed - standard med cert, no flags, clean draft",
    disqualifyingFlags: [],
    softFlags,
  })
}
