/**
 * Clinical Triage Rules Engine
 * 
 * Server-side, deterministic rules engine for clinical triage.
 * Implements CLINICAL_BOUNDARIES_AND_DECISION_RULES.md
 * 
 * Characteristics:
 * - Logic-based only (no AI/ML)
 * - Server-side execution
 * - Fully logged
 * - Explainable decisions
 * 
 * This is NOT AI and does NOT replace clinician judgment.
 */

import {
  type TriageOutcome,
  type TriageContext,
  type TriageResult,
  type ClinicalFlag,
  type FlagSeverity,
  type AutoRejectCategory,
  type NeverAsyncCategory,
  type RequestType,
  AUTO_REJECT_RULES,
  NEVER_ASYNC_CATEGORIES,
  REQUEST_TYPE_CONFIGS,
} from "./triage-types"

// ============================================================================
// EMERGENCY SYMPTOM KEYWORDS
// ============================================================================

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "can't breathe",
  "cannot breathe",
  "difficulty breathing",
  "severe bleeding",
  "unconscious",
  "stroke",
  "heart attack",
  "seizure",
  "suicidal",
  "suicide",
  "self harm",
  "self-harm",
  "overdose",
  "anaphylaxis",
  "allergic reaction severe",
  "choking",
  "drowning",
  "severe burn",
  "head injury",
  "spinal injury",
  "poisoning",
]

// ============================================================================
// RED FLAG PATTERNS
// ============================================================================

interface RedFlagPattern {
  code: string
  keywords: string[]
  severity: FlagSeverity
  category: string
  description: string
  clinicianGuidance: string
  forcesNeedsCall: boolean
  forcesDecline: boolean
}

const RED_FLAG_PATTERNS: RedFlagPattern[] = [
  // Cardiovascular
  {
    code: "RF_CHEST_PAIN",
    keywords: ["chest pain", "chest tightness", "crushing chest"],
    severity: "emergency",
    category: "cardiovascular",
    description: "Chest pain reported",
    clinicianGuidance: "Potential cardiac event. Requires immediate assessment.",
    forcesNeedsCall: false,
    forcesDecline: true,
  },
  {
    code: "RF_PALPITATIONS_SYNCOPE",
    keywords: ["palpitations with fainting", "blackout", "syncope"],
    severity: "critical",
    category: "cardiovascular",
    description: "Palpitations with syncope",
    clinicianGuidance: "Arrhythmia with hemodynamic compromise. Needs urgent workup.",
    forcesNeedsCall: true,
    forcesDecline: false,
  },
  
  // Neurological
  {
    code: "RF_STROKE_SYMPTOMS",
    keywords: ["sudden weakness", "facial droop", "slurred speech", "sudden confusion"],
    severity: "emergency",
    category: "neurological",
    description: "Stroke-like symptoms",
    clinicianGuidance: "Potential stroke. Time-critical. Redirect to emergency.",
    forcesNeedsCall: false,
    forcesDecline: true,
  },
  {
    code: "RF_SEVERE_HEADACHE",
    keywords: ["worst headache", "thunderclap headache", "sudden severe headache"],
    severity: "critical",
    category: "neurological",
    description: "Sudden severe headache",
    clinicianGuidance: "Possible SAH or other intracranial pathology. Needs urgent assessment.",
    forcesNeedsCall: true,
    forcesDecline: false,
  },
  
  // Respiratory
  {
    code: "RF_BREATHING_DIFFICULTY",
    keywords: ["can't breathe", "severe shortness of breath", "gasping"],
    severity: "emergency",
    category: "respiratory",
    description: "Severe breathing difficulty",
    clinicianGuidance: "Respiratory distress. Redirect to emergency.",
    forcesNeedsCall: false,
    forcesDecline: true,
  },
  
  // Mental Health
  {
    code: "RF_SUICIDAL_IDEATION",
    keywords: ["suicidal", "suicide", "want to die", "end my life", "kill myself"],
    severity: "emergency",
    category: "mental_health",
    description: "Suicidal ideation expressed",
    clinicianGuidance: "Immediate safety risk. Redirect to crisis services.",
    forcesNeedsCall: false,
    forcesDecline: true,
  },
  {
    code: "RF_SELF_HARM",
    keywords: ["self harm", "self-harm", "cutting myself", "hurting myself"],
    severity: "critical",
    category: "mental_health",
    description: "Self-harm reported",
    clinicianGuidance: "Safety risk. Requires synchronous assessment.",
    forcesNeedsCall: true,
    forcesDecline: false,
  },
  
  // Abdominal
  {
    code: "RF_ACUTE_ABDOMEN",
    keywords: ["severe abdominal pain", "rigid abdomen", "abdominal guarding"],
    severity: "critical",
    category: "gastrointestinal",
    description: "Acute abdominal presentation",
    clinicianGuidance: "Potential surgical abdomen. Needs urgent assessment.",
    forcesNeedsCall: true,
    forcesDecline: false,
  },
  
  // Infection
  {
    code: "RF_SEPSIS_SIGNS",
    keywords: ["fever with confusion", "high fever shaking", "mottled skin"],
    severity: "critical",
    category: "infectious",
    description: "Possible sepsis",
    clinicianGuidance: "Sepsis screen required. Time-critical intervention.",
    forcesNeedsCall: false,
    forcesDecline: true,
  },
  
  // Pregnancy
  {
    code: "RF_PREGNANCY_BLEEDING",
    keywords: ["pregnant bleeding", "vaginal bleeding pregnant", "pregnancy bleeding"],
    severity: "critical",
    category: "obstetric",
    description: "Vaginal bleeding in pregnancy",
    clinicianGuidance: "Possible threatened abortion or ectopic. Needs urgent assessment.",
    forcesNeedsCall: false,
    forcesDecline: true,
  },
]

// ============================================================================
// RULE ENGINE FUNCTIONS
// ============================================================================

/**
 * Check for emergency symptoms in free text
 */
export function checkEmergencySymptoms(text: string): { isEmergency: boolean; matchedKeywords: string[] } {
  const lowerText = text.toLowerCase()
  const matchedKeywords: string[] = []
  
  for (const keyword of EMERGENCY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      matchedKeywords.push(keyword)
    }
  }
  
  return {
    isEmergency: matchedKeywords.length > 0,
    matchedKeywords,
  }
}

/**
 * Check for red flag patterns in text
 */
export function checkRedFlagPatterns(text: string): ClinicalFlag[] {
  const lowerText = text.toLowerCase()
  const flags: ClinicalFlag[] = []
  
  for (const pattern of RED_FLAG_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword)) {
        flags.push({
          code: pattern.code,
          severity: pattern.severity,
          category: pattern.category,
          description: pattern.description,
          clinicianGuidance: pattern.clinicianGuidance,
          forcesNeedsCall: pattern.forcesNeedsCall,
          forcesDecline: pattern.forcesDecline,
        })
        break // Only add each pattern once
      }
    }
  }
  
  return flags
}

/**
 * Determine if async completion is blocked
 */
export function checkAsyncBlocked(
  flags: ClinicalFlag[],
  isFirstRequest: boolean,
  requestType: RequestType,
  additionalContext?: {
    isNewDiagnosis?: boolean
    isNewLongTermMed?: boolean
    hasSymptomEscalation?: boolean
    hasAmbiguousHistory?: boolean
  }
): { blocked: boolean; reason?: NeverAsyncCategory; explanation?: string } {
  
  // Check clinical flags that force sync
  const criticalFlags = flags.filter(f => f.severity === "critical" || f.severity === "emergency")
  if (criticalFlags.length > 0) {
    return {
      blocked: true,
      reason: "clinician_discomfort",
      explanation: `Critical clinical flags present: ${criticalFlags.map(f => f.code).join(", ")}`,
    }
  }
  
  // Check explicit context blockers
  if (additionalContext?.isNewDiagnosis) {
    return {
      blocked: true,
      reason: "new_diagnosis",
      explanation: NEVER_ASYNC_CATEGORIES.new_diagnosis,
    }
  }
  
  if (additionalContext?.isNewLongTermMed) {
    return {
      blocked: true,
      reason: "new_long_term_medication",
      explanation: NEVER_ASYNC_CATEGORIES.new_long_term_medication,
    }
  }
  
  if (additionalContext?.hasSymptomEscalation) {
    return {
      blocked: true,
      reason: "symptom_escalation",
      explanation: NEVER_ASYNC_CATEGORIES.symptom_escalation,
    }
  }
  
  if (additionalContext?.hasAmbiguousHistory) {
    return {
      blocked: true,
      reason: "ambiguous_history",
      explanation: NEVER_ASYNC_CATEGORIES.ambiguous_history,
    }
  }
  
  // Check request type default
  const config = REQUEST_TYPE_CONFIGS[requestType]
  if (!config.defaultAsyncEligible) {
    return {
      blocked: true,
      reason: "clinician_discomfort",
      explanation: `${config.displayName} requests require synchronous review by default`,
    }
  }
  
  return { blocked: false }
}

/**
 * Check for auto-reject conditions
 */
export function checkAutoReject(
  flags: ClinicalFlag[],
  emergencyCheck: { isEmergency: boolean; matchedKeywords: string[] },
  isControlledSubstance: boolean,
  isFirstTimeHighRisk: boolean,
  isOutsideScope: boolean
): { shouldReject: boolean; category?: AutoRejectCategory } {
  
  // Emergency symptoms
  if (emergencyCheck.isEmergency) {
    return { shouldReject: true, category: "emergency_symptoms" }
  }
  
  // Red flags that force decline
  const declineFlags = flags.filter(f => f.forcesDecline)
  if (declineFlags.length > 0) {
    return { shouldReject: true, category: "red_flag_presentation" }
  }
  
  // Controlled substance
  if (isControlledSubstance) {
    return { shouldReject: true, category: "controlled_substance" }
  }
  
  // First-time high-risk
  if (isFirstTimeHighRisk) {
    return { shouldReject: true, category: "first_time_high_risk" }
  }
  
  // Outside scope
  if (isOutsideScope) {
    return { shouldReject: true, category: "outside_gp_scope" }
  }
  
  return { shouldReject: false }
}

// ============================================================================
// MAIN TRIAGE FUNCTION
// ============================================================================

export interface TriageInput {
  requestId: string
  requestType: RequestType
  patientId?: string
  freeTextSymptoms?: string
  structuredAnswers?: Record<string, unknown>
  isFirstRequest?: boolean
  isControlledSubstance?: boolean
  isFirstTimeHighRisk?: boolean
  isOutsideScope?: boolean
  additionalContext?: {
    isNewDiagnosis?: boolean
    isNewLongTermMed?: boolean
    hasSymptomEscalation?: boolean
    hasAmbiguousHistory?: boolean
  }
}

/**
 * Main triage evaluation function
 * Returns a deterministic, explainable triage result
 */
export function evaluateTriage(input: TriageInput): TriageResult {
  const {
    requestId,
    requestType,
    patientId,
    freeTextSymptoms = "",
    isFirstRequest = false,
    isControlledSubstance = false,
    isFirstTimeHighRisk = false,
    isOutsideScope = false,
    additionalContext,
  } = input
  
  // Check for emergency symptoms
  const emergencyCheck = checkEmergencySymptoms(freeTextSymptoms)
  
  // Check for red flag patterns
  const flags = checkRedFlagPatterns(freeTextSymptoms)
  
  // Count flags by severity
  const criticalFlagCount = flags.filter(f => 
    f.severity === "critical" || f.severity === "emergency"
  ).length
  
  // Check auto-reject
  const autoRejectCheck = checkAutoReject(
    flags,
    emergencyCheck,
    isControlledSubstance,
    isFirstTimeHighRisk,
    isOutsideScope
  )
  
  // Check async blocked
  const asyncCheck = checkAsyncBlocked(
    flags,
    isFirstRequest,
    requestType,
    additionalContext
  )
  
  // Build context
  const context: TriageContext = {
    requestId,
    requestType,
    patientId,
    isFirstRequest,
    hasRedFlags: flags.length > 0,
    redFlagCount: flags.length,
    criticalFlagCount,
    isAsyncEligible: !asyncCheck.blocked,
    blockedAsyncReason: asyncCheck.reason,
    autoRejectCategory: autoRejectCheck.category,
  }
  
  // Determine suggested outcome
  let suggestedOutcome: TriageOutcome
  let reasoning: string
  
  if (autoRejectCheck.shouldReject && autoRejectCheck.category) {
    suggestedOutcome = "declined"
    const rule = AUTO_REJECT_RULES[autoRejectCheck.category]
    reasoning = rule.clinicianNote
  } else if (asyncCheck.blocked) {
    suggestedOutcome = "needs_call"
    reasoning = asyncCheck.explanation || "Synchronous clinician contact required"
  } else if (flags.some(f => f.forcesNeedsCall)) {
    suggestedOutcome = "needs_call"
    const needsCallFlags = flags.filter(f => f.forcesNeedsCall)
    reasoning = `Flags requiring call: ${needsCallFlags.map(f => f.description).join("; ")}`
  } else if (flags.length > 0) {
    // Has flags but none force specific outcome - needs call for safety
    suggestedOutcome = "needs_call"
    reasoning = "Clinical flags present require clinician review before approval"
  } else {
    // Clean - may be approved (clinician still decides)
    suggestedOutcome = "approved"
    reasoning = "No red flags detected. Eligible for async approval pending clinician review."
  }
  
  return {
    context,
    suggestedOutcome,
    reasoning,
    flags,
    isAutoRejected: autoRejectCheck.shouldReject,
    autoRejectRule: autoRejectCheck.category 
      ? AUTO_REJECT_RULES[autoRejectCheck.category] 
      : undefined,
    asyncBlocked: asyncCheck.blocked,
    asyncBlockedReason: asyncCheck.explanation,
  }
}

// ============================================================================
// CLINICIAN DECISION VALIDATION
// ============================================================================

/**
 * Validates that a clinician decision is appropriate given the triage result
 * Returns warnings (not blocks) - clinician always has final authority
 */
export function validateClinicianDecision(
  decision: TriageOutcome,
  triageResult: TriageResult
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []
  
  // Warn if approving despite critical flags
  if (decision === "approved" && triageResult.context.criticalFlagCount > 0) {
    warnings.push(
      `Approving despite ${triageResult.context.criticalFlagCount} critical flag(s). ` +
      `Ensure documented clinical reasoning.`
    )
  }
  
  // Warn if approving when async is blocked
  if (decision === "approved" && triageResult.asyncBlocked) {
    warnings.push(
      `Approving async when system suggests synchronous contact. ` +
      `Reason: ${triageResult.asyncBlockedReason}`
    )
  }
  
  // Warn if approving auto-rejected request
  if (decision === "approved" && triageResult.isAutoRejected) {
    warnings.push(
      `Overriding auto-reject. Category: ${triageResult.context.autoRejectCategory}. ` +
      `Document clinical justification.`
    )
  }
  
  return {
    valid: true, // Clinician always has authority
    warnings,
  }
}

// ============================================================================
// FINAL SAFETY RULE
// ============================================================================

/**
 * The final safety rule: If unsure, the answer is Needs Call.
 * Speed is never a clinical justification.
 */
export function applyFinalSafetyRule(
  outcome: TriageOutcome,
  isClinicianUnsure: boolean
): TriageOutcome {
  if (isClinicianUnsure) {
    return "needs_call"
  }
  return outcome
}
