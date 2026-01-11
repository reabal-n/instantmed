/**
 * Clinical Triage Types
 * 
 * Defines the core triage outcome types and clinical boundary types
 * as specified in CLINICAL_BOUNDARIES_AND_DECISION_RULES.md
 * 
 * Platform Role: Lumen Health is NOT a prescribing system.
 * It is an intake, triage, and documentation platform.
 */

// ============================================================================
// TRIAGE OUTCOMES
// ============================================================================

/**
 * The three mandatory clinician decision outcomes.
 * Every request MUST end in one of these - no defaults, no silent automation.
 */
export type TriageOutcome = "approved" | "needs_call" | "declined"

/**
 * Maps legacy decision values to standard triage outcomes
 */
export const LEGACY_TO_TRIAGE_OUTCOME: Record<string, TriageOutcome> = {
  approved: "approved",
  approve: "approved",
  requires_consult: "needs_call",
  consult: "needs_call",
  declined: "declined",
  decline: "declined",
  rejected: "declined",
  reject: "declined",
}

/**
 * Normalizes any decision value to a standard TriageOutcome
 */
export function normalizeToTriageOutcome(decision: string): TriageOutcome {
  const normalized = LEGACY_TO_TRIAGE_OUTCOME[decision.toLowerCase()]
  if (!normalized) {
    throw new Error(`Invalid decision value: ${decision}. Must be approved, needs_call, or declined.`)
  }
  return normalized
}

// ============================================================================
// OUTCOME DEFINITIONS
// ============================================================================

export interface OutcomeDefinition {
  outcome: TriageOutcome
  description: string
  requiresRationale: boolean
  allowsAsyncCompletion: boolean
}

export const OUTCOME_DEFINITIONS: Record<TriageOutcome, OutcomeDefinition> = {
  approved: {
    outcome: "approved",
    description: "Clinician is satisfied the request is clinically appropriate. No synchronous contact required.",
    requiresRationale: false,
    allowsAsyncCompletion: true,
  },
  needs_call: {
    outcome: "needs_call",
    description: "New, unclear, or escalating presentation. Conflicting or incomplete information. Any clinician uncertainty.",
    requiresRationale: true,
    allowsAsyncCompletion: false,
  },
  declined: {
    outcome: "declined",
    description: "Outside scope, unsafe, inappropriate for online care, red-flag presentation, or repeated misuse.",
    requiresRationale: true,
    allowsAsyncCompletion: true,
  },
}

// ============================================================================
// AUTO-REJECT CATEGORIES
// ============================================================================

/**
 * Categories that trigger automatic system-level decline
 */
export type AutoRejectCategory =
  | "emergency_symptoms"
  | "red_flag_presentation"
  | "controlled_substance"
  | "first_time_high_risk"
  | "outside_gp_scope"

export interface AutoRejectRule {
  category: AutoRejectCategory
  description: string
  userMessage: string
  clinicianNote: string
  redirectAdvice: string
}

export const AUTO_REJECT_RULES: Record<AutoRejectCategory, AutoRejectRule> = {
  emergency_symptoms: {
    category: "emergency_symptoms",
    description: "Emergency or urgent symptoms requiring immediate care",
    userMessage: "Your symptoms may require urgent medical attention. Please call 000 or visit your nearest emergency department.",
    clinicianNote: "Auto-declined: Emergency/urgent symptoms detected",
    redirectAdvice: "Call 000 for emergencies, or visit your nearest emergency department",
  },
  red_flag_presentation: {
    category: "red_flag_presentation",
    description: "Red-flag clinical presentation requiring in-person assessment",
    userMessage: "Based on your symptoms, we recommend an in-person consultation with your GP or urgent care clinic.",
    clinicianNote: "Auto-declined: Red-flag presentation requiring physical examination",
    redirectAdvice: "See your regular GP or visit an urgent care clinic",
  },
  controlled_substance: {
    category: "controlled_substance",
    description: "Request for controlled or restricted substances",
    userMessage: "This medication isn't available through our service. Please see your regular prescriber for this medication.",
    clinicianNote: "Auto-declined: Controlled/restricted substance request",
    redirectAdvice: "Continue with your regular prescriber",
  },
  first_time_high_risk: {
    category: "first_time_high_risk",
    description: "First-time request for high-risk treatment",
    userMessage: "For first-time prescriptions of this medication, we recommend a consultation with your GP.",
    clinicianNote: "Auto-declined: First-time high-risk treatment request",
    redirectAdvice: "Book a consultation with your regular GP",
  },
  outside_gp_scope: {
    category: "outside_gp_scope",
    description: "Request clearly outside GP scope",
    userMessage: "This request is outside the scope of our service. Please consult an appropriate specialist.",
    clinicianNote: "Auto-declined: Outside GP scope",
    redirectAdvice: "Consult with an appropriate specialist",
  },
}

// ============================================================================
// ASYNC/SYNC BOUNDARIES
// ============================================================================

/**
 * Categories that NEVER allow asynchronous completion
 * These always require synchronous clinician contact (Needs Call)
 */
export type NeverAsyncCategory =
  | "new_diagnosis"
  | "new_long_term_medication"
  | "symptom_escalation"
  | "ambiguous_history"
  | "clinician_discomfort"

export const NEVER_ASYNC_CATEGORIES: Record<NeverAsyncCategory, string> = {
  new_diagnosis: "New diagnoses require synchronous clinical assessment",
  new_long_term_medication: "New long-term medications require clinician discussion",
  symptom_escalation: "Symptom escalation requires immediate clinician review",
  ambiguous_history: "Ambiguous or conflicting histories require clarification",
  clinician_discomfort: "Clinician uncertainty always requires synchronous contact",
}

/**
 * Categories that MAY allow asynchronous completion (clinician discretion)
 */
export type MayBeAsyncCategory =
  | "administrative_documentation"
  | "repeat_stable_treatment"
  | "low_risk_defined_presentation"

export const MAY_BE_ASYNC_CATEGORIES: Record<MayBeAsyncCategory, string> = {
  administrative_documentation: "Administrative documentation (med certs, referral letters)",
  repeat_stable_treatment: "Repeat treatment requests with reported stability",
  low_risk_defined_presentation: "Low-risk, clearly defined presentations",
}

// ============================================================================
// REQUEST TYPE CLASSIFICATION
// ============================================================================

export type RequestType = "med_cert" | "repeat_rx" | "general_consult" | "referral"

export interface RequestTypeConfig {
  type: RequestType
  displayName: string
  defaultAsyncEligible: boolean
  requiresPrescribing: boolean
}

export const REQUEST_TYPE_CONFIGS: Record<RequestType, RequestTypeConfig> = {
  med_cert: {
    type: "med_cert",
    displayName: "Medical Certificate",
    defaultAsyncEligible: true,
    requiresPrescribing: false,
  },
  repeat_rx: {
    type: "repeat_rx",
    displayName: "Repeat Prescription",
    defaultAsyncEligible: true,
    requiresPrescribing: true, // External prescribing via Parchment
  },
  general_consult: {
    type: "general_consult",
    displayName: "General Consultation",
    defaultAsyncEligible: false,
    requiresPrescribing: false,
  },
  referral: {
    type: "referral",
    displayName: "Referral Letter",
    defaultAsyncEligible: true,
    requiresPrescribing: false,
  },
}

// ============================================================================
// CLINICAL FLAG TYPES
// ============================================================================

export type FlagSeverity = "info" | "warning" | "critical" | "emergency"

export interface ClinicalFlag {
  code: string
  severity: FlagSeverity
  category: string
  description: string
  clinicianGuidance: string
  forcesNeedsCall: boolean
  forcesDecline: boolean
}

// ============================================================================
// TRIAGE CONTEXT
// ============================================================================

export interface TriageContext {
  requestId: string
  requestType: RequestType
  patientId?: string
  isFirstRequest: boolean
  hasRedFlags: boolean
  redFlagCount: number
  criticalFlagCount: number
  isAsyncEligible: boolean
  blockedAsyncReason?: NeverAsyncCategory
  autoRejectCategory?: AutoRejectCategory
}

export interface TriageResult {
  context: TriageContext
  suggestedOutcome: TriageOutcome
  reasoning: string
  flags: ClinicalFlag[]
  isAutoRejected: boolean
  autoRejectRule?: AutoRejectRule
  asyncBlocked: boolean
  asyncBlockedReason?: string
}
