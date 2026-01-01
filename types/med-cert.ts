/**
 * Medical Certificate Type Definitions
 * Audit-safe, type-safe models for the medical certificate system
 */

// ============================================================================
// REQUEST STATUS & ENUMS
// ============================================================================

export type MedCertStatus =
  | "pending"
  | "approved"
  | "declined"
  | "requires_call"
  | "expired"
  | "cancelled"

export type CertificateType = "work" | "study" | "carer"

export type AuditEventType =
  | "request_created"
  | "step_completed"
  | "safety_confirmed"
  | "request_submitted"
  | "clinician_viewed"
  | "clinician_decision"
  | "certificate_generated"
  | "certificate_downloaded"
  | "request_cancelled"

export type ActorType = "patient" | "guest" | "clinician" | "system"

export type ClinicianDecision = "approved" | "declined" | "requires_call"

// ============================================================================
// SYMPTOM DATA
// ============================================================================

// Standard symptom chips - designed to be non-leading
export const SYMPTOM_OPTIONS = [
  { id: "cold_flu", label: "Cold / flu symptoms", emoji: "🤧" },
  { id: "gastro", label: "Gastrointestinal upset", emoji: "🤢" },
  { id: "headache_migraine", label: "Headache / migraine", emoji: "🤕" },
  { id: "fatigue", label: "Fatigue / exhaustion", emoji: "😴" },
  { id: "pain", label: "Body aches / pain", emoji: "💪" },
  { id: "fever", label: "Fever / chills", emoji: "🌡️" },
  { id: "mental_health", label: "Mental health day", emoji: "🧠" },
  { id: "other", label: "Other", emoji: "💬" },
] as const

export type SymptomId = typeof SYMPTOM_OPTIONS[number]["id"]

// Relationships for carer's certificate
export const CARER_RELATIONSHIPS = [
  { id: "parent", label: "Parent" },
  { id: "child", label: "Child" },
  { id: "partner", label: "Partner" },
  { id: "sibling", label: "Sibling" },
  { id: "grandparent", label: "Grandparent" },
  { id: "other", label: "Other" },
] as const

export type CarerRelationship = typeof CARER_RELATIONSHIPS[number]["id"]

// ============================================================================
// INTAKE FORM DATA
// ============================================================================

export interface MedCertIntakeData {
  // Certificate type
  certificateType: CertificateType
  
  // Dates - simplified with smart defaults
  startDate: string // ISO date, defaults to today
  durationDays: 1 | 2 | 3 | "extended" // Max 3 without escalation
  endDate?: string // Computed or manual for extended
  
  // Symptoms (chip selection)
  symptoms: SymptomId[]
  otherSymptomDetails?: string // Only if "other" selected
  
  // Carer-specific fields
  carerPersonName?: string
  carerRelationship?: CarerRelationship
  
  // Safety confirmation (shown once, required)
  emergencyDisclaimerConfirmed: boolean
  emergencyDisclaimerTimestamp?: string
  
  // Extended leave escalation
  escalatedToCall?: boolean
  escalationReason?: string
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface MedCertAuditPayload {
  // Request context
  requestId: string
  sessionId?: string
  
  // Symptom capture (exactly as selected)
  symptomsSelected: SymptomId[]
  otherSymptomText?: string
  
  // Duration
  durationDays: number
  startDate: string
  endDate: string
  
  // Safety
  emergencyDisclaimerConfirmed: boolean
  emergencyDisclaimerTimestamp: string
  
  // Patient attestation
  patientConfirmation: {
    confirmedAccurate: boolean
    confirmedTimestamp: string
    ipAddress?: string
    userAgent?: string
  }
  
  // Certificate template
  templateVersion: string
  templateHash?: string // SHA256 of template used
  
  // Escalation (if applicable)
  escalated?: {
    reason: "duration_exceeded" | "backdated" | "clinical_concern"
    escalatedAt: string
    callScheduled?: boolean
  }
}

// ============================================================================
// CLINICAL SUMMARY (for clinician dashboard)
// ============================================================================

export interface MedCertClinicalSummary {
  // Patient
  patient: {
    id?: string
    fullName: string
    dateOfBirth: string
    email: string
    phone?: string
    isGuest: boolean
  }
  
  // Request
  requestId: string
  submittedAt: string
  
  // Certificate details
  certificate: {
    type: CertificateType
    typeLabel: string
    startDate: string
    endDate: string
    durationDays: number
  }
  
  // Clinical data
  clinical: {
    symptoms: Array<{
      id: SymptomId
      label: string
    }>
    otherDetails?: string
    carerDetails?: {
      personName: string
      relationship: string
    }
  }
  
  // Compliance
  compliance: {
    emergencyDisclaimerConfirmed: boolean
    emergencyDisclaimerTimestamp: string
    patientConfirmedAccurate: boolean
    patientConfirmedTimestamp: string
  }
  
  // Flags
  flags: {
    isExtendedDuration: boolean // >3 days
    isBackdated: boolean
    requiresCall: boolean
  }
  
  // Suggested action
  suggestedAction: {
    recommendation: "approve" | "decline" | "call"
    reasoning: string
  }
}

// ============================================================================
// CERTIFICATE OUTPUT
// ============================================================================

export interface GeneratedCertificate {
  // Identity
  certificateId: string
  requestId: string
  
  // Content
  patientName: string
  dateOfBirth: string
  certificateType: CertificateType
  absenceStartDate: string
  absenceEndDate: string
  
  // Attestation
  issuedBy: {
    doctorName: string
    providerNumber: string
    ahpraNumber?: string
  }
  issuedAt: string
  
  // Document
  templateVersion: string
  pdfUrl: string // Immutable S3/storage URL
  pdfHash: string // SHA256 of PDF
  watermark: string // "InstantMed • {timestamp} • {certificateId}"
  
  // Storage
  storedImmutably: boolean
  storageUrl: string
}

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface MedCertRequest {
  id: string
  patient_id: string | null
  
  // Guest info
  guest_email: string | null
  guest_name: string | null
  guest_phone: string | null
  guest_dob: string | null
  
  // Status
  status: MedCertStatus
  
  // Certificate details
  certificate_type: CertificateType
  start_date: string
  end_date: string
  duration_days: number
  
  // Clinical
  symptoms: SymptomId[]
  other_symptom_details: string | null
  carer_person_name: string | null
  carer_relationship: string | null
  
  // Compliance
  emergency_disclaimer_confirmed: boolean
  emergency_disclaimer_timestamp: string | null
  patient_confirmed_accurate: boolean
  patient_confirmed_timestamp: string | null
  
  // Escalation
  escalated_to_call: boolean
  escalation_reason: string | null
  
  // Clinical summary
  clinical_summary: MedCertClinicalSummary | null
  
  // Audit
  audit_payload: MedCertAuditPayload | null
  template_version: string
  
  // Payment
  payment_id: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
  submitted_at: string | null
  reviewed_at: string | null
  completed_at: string | null
}

export interface MedCertAuditEvent {
  id: string
  event_type: AuditEventType
  request_id: string | null
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

export interface MedCertDecision {
  id: string
  request_id: string
  clinician_id: string
  decision: ClinicianDecision
  decision_reason: string
  clinical_notes: string | null
  certificate_id: string | null
  created_at: string
}

// ============================================================================
// FLOW STATE
// ============================================================================

export type MedCertStep =
  | "type_and_dates"    // Combined: type + duration + start date
  | "symptoms"          // Symptoms + carer details (if applicable)
  | "safety"            // Emergency disclaimer (shown ONCE)
  | "review"            // Summary (read-only)
  | "payment"           // Checkout
  | "confirmation"      // Success

export interface MedCertFlowState {
  // Auth
  isAuthenticated: boolean
  isGuest: boolean
  patientId: string | null
  
  // Current step
  currentStep: MedCertStep
  completedSteps: MedCertStep[]
  
  // Form data
  formData: Partial<MedCertIntakeData>
  
  // Request
  requestId: string | null
  
  // Escalation
  isEscalatedToCall: boolean
}

// ============================================================================
// EDGE CASES
// ============================================================================

export interface MedCertEdgeCases {
  // 1. Duration > 3 days
  extendedDuration: {
    maxAsyncDays: 3
    escalationMessage: string
    requiresCall: boolean
  }
  
  // 2. Backdated certificate
  backdated: {
    maxBackdateDays: 3
    requiresCallIfExceeded: boolean
  }
  
  // 3. Multiple certificates in short period
  frequentRequests: {
    cooldownDays: 7
    requiresReviewIfRepeated: boolean
  }
  
  // 4. Carer without relationship
  carerValidation: {
    personNameRequired: boolean
    relationshipRequired: boolean
  }
  
  // 5. Weekend/after-hours
  afterHours: {
    operatingHoursAEST: { start: 8, end: 22 }
    afterHoursMessage: string
  }
}

// ============================================================================
// API PAYLOADS
// ============================================================================

export interface MedCertSubmitPayload {
  formData: MedCertIntakeData
  patientId: string | null
  guestInfo?: {
    fullName: string
    email: string
    phone?: string
    dateOfBirth: string
  }
  metadata: {
    ipAddress?: string
    userAgent?: string
    sessionId?: string
  }
}

export interface MedCertDecisionPayload {
  requestId: string
  decision: ClinicianDecision
  decisionReason: string
  clinicalNotes?: string
}
