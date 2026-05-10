/**
 * Repeat Prescription Type Definitions
 * Audit-safe, type-safe models for the repeat prescription system
 */

// ============================================================================
// REQUEST STATUS & ENUMS
// ============================================================================

export type RepeatRxStatus =
  | "pending"
  | "approved"
  | "declined"
  | "requires_consult"
  | "expired"
  | "cancelled"

export type AuditEventType =
  | "request_created"
  | "step_completed"
  | "answer_submitted"
  | "consent_given"
  | "eligibility_checked"
  | "request_submitted"
  | "clinician_viewed"
  | "clinician_decision"
  | "prescription_generated"
  | "notification_sent"
  | "request_expired"
  | "request_cancelled"

export type ActorType = "patient" | "guest" | "clinician" | "system"

export type ClinicianDecision = "approved" | "declined" | "requires_consult" | "needs_call"

/**
 * Maps ClinicianDecision to standard triage terminology
 * Per CLINICAL_BOUNDARIES_AND_DECISION_RULES.md:
 * - approved -> Approved
 * - needs_call / requires_consult -> Needs Call
 * - declined -> Declined
 */
export function toTriageOutcome(decision: ClinicianDecision): "approved" | "needs_call" | "declined" {
  if (decision === "requires_consult" || decision === "needs_call") {
    return "needs_call"
  }
  return decision as "approved" | "declined"
}

// ============================================================================
// MEDICATION DATA
// ============================================================================

export interface MedicationSelection {
  amt_code: string
  display: string
  medication_name: string
  strength: string
  form: string
}

// ============================================================================
// INTAKE ANSWERS
// ============================================================================

export interface RepeatRxIntakeAnswers {
  // Medication
  medication: MedicationSelection
  strengthConfirmed: boolean
  
  // Prescription history
  lastPrescribedTimeframe: "less_3_months" | "3_6_months" | "6_12_months" | "over_12_months"
  stabilityDuration: "less_3_months" | "3_6_months" | "6_months_plus"
  prescribingDoctor: string // Name of original prescriber
  
  // Clinical
  indication: string // Why they take it
  currentDose: string
  doseChangedRecently: boolean
  
  // Safety screening
  sideEffects: "none" | "mild" | "significant"
  sideEffectsDetails?: string
  pregnantOrBreastfeeding: boolean
  allergies: string[]
  allergyDetails?: string
  
  // Medical history flags
  pmhxFlags: {
    heartDisease: boolean
    kidneyDisease: boolean
    liverDisease: boolean
    diabetes: boolean
    mentalHealthCondition: boolean
    otherSignificant: boolean
    otherDetails?: string
  }
  
  // Other medications
  otherMedications: string[]
  
  // Attestations
  gpAttestationAccepted: boolean // Will see GP in 1-3 months
  emergencyDisclaimerAccepted: boolean
}

// ============================================================================
// ELIGIBILITY
// ============================================================================

export interface EligibilityResult {
  passed: boolean
  canProceed: boolean // Can still proceed with consult even if not passed
  
  // Rejection info
  rejectionReason?: string
  rejectionUserMessage?: string
  rejectionClinicianReason?: string
  
  // Red flags (require clinician call)
  redFlags: RedFlag[]
  requiresConsult: boolean
  
  // Rule outcomes
  ruleOutcomes: RuleOutcome[]
}

export interface RedFlag {
  code: string
  severity: "warning" | "critical"
  description: string
  clinicianNote: string
}

export interface RuleOutcome {
  ruleId: string
  ruleName: string
  passed: boolean
  reason?: string
}

// Excluded medication categories
export type ExcludedCategory =
  | "s8_opioid"
  | "s8_stimulant"
  | "benzodiazepine"
  | "z_drug"
  | "cannabis"
  | "testosterone"
  | "mental_health"

// ============================================================================
// CLINICAL SUMMARY
// ============================================================================

export interface ClinicalSummary {
  // Patient identifiers
  patient: {
    id?: string
    name: string
    dob: string
    email: string
    phone?: string
    isGuest: boolean
  }
  
  // Request info
  intakeId: string
  requestedAt: string
  
  // Medication
  medication: MedicationSelection
  
  // Clinical data
  clinicalData: {
    indication: string
    currentDose: string
    lastPrescribed: string
    stabilityDuration: string
    prescribingDoctor: string
  }
  
  // Safety screening
  safetyScreening: {
    sideEffects: string
    sideEffectsDetails?: string
    pregnantOrBreastfeeding: boolean
    allergies: string[]
    allergyDetails?: string
  }
  
  // Medical history
  medicalHistory: {
    flags: string[]
    otherMedications: string[]
  }
  
  // Eligibility
  eligibility: EligibilityResult
  
  // Attestations
  attestations: {
    emergencyDisclaimer: { accepted: boolean; timestamp: string }
    gpAttestation: { accepted: boolean; timestamp: string }
  }
  
  // Suggested decision
  suggestedDecision: {
    recommendation: "approve" | "decline" | "consult"
    reasoning: string
    suggestedRepeats: number
  }
}

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface RepeatRxRequest {
  id: string
  patient_id: string | null
  
  // Guest info
  guest_email: string | null
  guest_name: string | null
  guest_phone: string | null
  guest_dob: string | null
  
  // Status
  status: RepeatRxStatus
  
  // Eligibility
  eligibility_result: EligibilityResult
  eligibility_passed: boolean
  red_flags: string[]
  
  // Clinical summary
  clinical_summary: ClinicalSummary
  
  // Consent
  emergency_disclaimer_accepted: boolean
  emergency_disclaimer_timestamp: string | null
  gp_attestation_accepted: boolean
  gp_attestation_timestamp: string | null
  terms_accepted: boolean
  terms_timestamp: string | null
  
  // Metadata
  ip_address: string | null
  user_agent: string | null
  device_fingerprint: string | null
  payment_id: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
  submitted_at: string | null
  reviewed_at: string | null
  completed_at: string | null
}

export interface RepeatRxAnswer {
  id: string
  intake_id: string
  question_key: string
  question_text: string
  answer_value: unknown
  answer_display: string | null
  answered_at: string
  step_number: number | null
  ip_address: string | null
  is_current: boolean
  superseded_by: string | null
}

export interface AuditEvent {
  id: string
  event_type: AuditEventType
  intake_id: string | null
  patient_id: string | null
  clinician_id: string | null
  event_data: Record<string, unknown>
  actor_type: ActorType
  actor_id: string | null
  ip_address: string | null
  user_agent: string | null
  session_id: string | null
  created_at: string
}

export interface ClinicianDecisionRecord {
  id: string
  intake_id: string
  clinician_id: string
  decision: ClinicianDecision
  decision_reason: string
  medication_selected: MedicationSelection | null
  pbs_schedule: string | null
  pack_quantity: number | null
  dose_instructions: string | null
  frequency: string | null
  repeats_granted: number
  clinical_notes: string | null
  red_flag_review: string | null
  created_at: string
  prescription_sent_at: string | null
}

// ============================================================================
// INTAKE FLOW STATE
// ============================================================================

export interface RepeatRxFlowState {
  // Auth
  isAuthenticated: boolean
  isGuest: boolean
  patientId: string | null
  
  // Prefilled data (for logged-in users)
  prefill: {
    name: string
    email: string
    phone: string
    dob: string
    address: string
    preferredPharmacy: {
      name: string
      address: string
      phone: string
    } | null
  } | null
  
  // Current step
  currentStep: RepeatRxStep
  completedSteps: RepeatRxStep[]
  
  // Answers
  answers: Partial<RepeatRxIntakeAnswers>
  
  // Request
  intakeId: string | null

  // Consent timestamps
  emergencyDisclaimerTimestamp: string | null
  gpAttestationTimestamp: string | null
}

export type RepeatRxStep =
  | "auth"
  | "medication"
  | "history"
  | "safety"
  | "medical_history"
  | "attestation"
  | "review"
  | "payment"
  | "confirmation"

// ============================================================================
// API PAYLOADS
// ============================================================================

export interface SubmitRepeatRxPayload {
  answers: RepeatRxIntakeAnswers
  patientId: string | null
  guestInfo?: {
    name: string
    email: string
    phone: string
    dob: string
  }
  consentTimestamps: {
    emergencyDisclaimer: string
    gpAttestation: string
    terms: string
  }
  metadata: {
    ipAddress?: string
    userAgent?: string
  }
}

// Alternative submit payload (for API route)
export interface RepeatRxSubmitPayload {
  medication: MedicationSelection
  answers: Partial<RepeatRxIntakeAnswers>
  consentTimestamps: {
    emergencyDisclaimer: string
    gpAttestation: string
    terms?: string
  }
  pharmacyDetails?: {
    name: string
    address: string
    phone: string
  }
  guestEmail?: string
}

export interface EligibilityCheckPayload {
  medication: MedicationSelection
  answers: Partial<RepeatRxIntakeAnswers>
}

export interface ClinicianDecisionPayload {
  intakeId: string
  decision: ClinicianDecision
  decisionReason: string
  medication?: MedicationSelection
  pbsSchedule?: string
  packQuantity?: number
  doseInstructions?: string
  frequency?: string
  repeatsGranted?: number
  clinicalNotes?: string
  redFlagReview?: string
}
