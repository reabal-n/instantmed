// Database table types mirroring Supabase schema

export type UserRole = "patient" | "doctor" | "admin"

export type RequestType =
  | "script"
  | "med_cert"
  | "hair_loss"
  | "acne"
  | "ed"
  | "hsv"
  | "bv_partner"

export type RequestStatus = "pending" | "approved" | "declined" | "needs_follow_up" | "awaiting_prescribe"

export type DeclineReasonCode =
  | "requires_examination"      // Clinical - Requires in-person physical examination
  | "not_telehealth_suitable"   // Service - Not available via telehealth
  | "prescribing_guidelines"    // Compliance - Against prescribing guidelines
  | "controlled_substance"      // Compliance - Request for controlled/S8 substance
  | "urgent_care_needed"        // Safety - Requires urgent in-person care
  | "insufficient_info"         // Incomplete - Insufficient information provided
  | "patient_not_eligible"      // Eligibility - Patient doesn't meet service criteria
  | "duplicate_request"         // Administrative - Duplicate of existing request
  | "outside_scope"             // Service - Outside scope of telehealth practice
  | "other"                     // Other - See decline_reason_note for details

export type RequestCategory = "medical_certificate" | "prescription" | "referral" | "other"

export type MedicalCertificateSubtype = "work" | "uni" | "carer"
export type PrescriptionSubtype = "repeat" | "chronic_review"
export type RequestSubtype =
  | MedicalCertificateSubtype
  | PrescriptionSubtype
  | string

export type AustralianState = "ACT" | "NSW" | "NT" | "QLD" | "SA" | "TAS" | "VIC" | "WA"

// Table: profiles
export interface Profile {
  id: string // uuid, PK
  auth_user_id: string // uuid, references auth.users.id (deprecated - use clerk_user_id)
  clerk_user_id?: string | null // Clerk user ID for modern auth
  email?: string | null // User email
  avatar_url?: string | null // Profile avatar URL
  full_name: string
  date_of_birth: string // ISO date string
  role: UserRole
  // Contact & address fields
  phone: string | null
  address_line1: string | null
  street_address: string | null
  suburb: string | null
  state: AustralianState | null
  postcode: string | null
  // Medicare fields
  medicare_number: string | null
  medicare_irn: number | null // 1-5
  medicare_expiry: string | null // ISO date string
  medicare_expiry_month: string | null
  medicare_expiry_year: string | null
  // Doctor-specific fields
  ahpra_number?: string | null // AHPRA registration number for doctors
  // Consent and onboarding
  consent_myhr: boolean
  my_health_record_consent: boolean
  onboarding_completed: boolean
  // Stripe customer linking
  stripe_customer_id: string | null
  // Timestamps
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

// Table: requests
export interface Request {
  id: string // uuid, PK
  patient_id: string // uuid, FK to profiles.id
  type: RequestType
  status: RequestStatus
  category: RequestCategory | null
  subtype: RequestSubtype | null
  clinical_note: string | null
  priority_review: boolean
  // Doctor notes and escalation fields
  doctor_notes: string | null
  escalation_level: EscalationLevel
  escalation_reason: string | null
  escalated_at: string | null
  escalated_by: string | null
  flagged_for_followup: boolean
  followup_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  // Script tracking fields
  script_sent: boolean
  script_sent_at: string | null
  script_notes: string | null
  parchment_reference: string | null // eScript reference from Parchment
  sent_via: "parchment" | "paper" | null // How the script was sent
  // Decision tracking fields
  decision: "approved" | "declined" | null
  decline_reason_code: DeclineReasonCode | null
  decline_reason_note: string | null
  decided_at: string | null // ISO timestamp
  // Payment fields
  paid: boolean
  payment_status: PaymentStatus
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

// Escalation level type
export type EscalationLevel = "none" | "senior_review" | "phone_consult"

// Table: request_answers
export interface RequestAnswers {
  id: string // uuid, PK
  request_id: string // uuid, FK to requests.id
  answers: Record<string, unknown> // JSONB
  created_at: string // ISO timestamp
}

// Table: documents
export interface Document {
  id: string // uuid, PK
  request_id: string // uuid, FK to requests.id
  document_type: string
  content: string
  created_at: string // ISO timestamp
}

// Table: document_drafts
export interface DocumentDraft {
  id: string // uuid, PK
  request_id: string // uuid, FK to requests.id
  type: string // e.g. 'med_cert', 'referral', 'prescription'
  subtype: string // e.g. 'work', 'uni', 'carer'
  data: MedCertDraftData | PathologyDraftData | PrescriptionDraftData | Record<string, unknown> // JSONB - editable fields
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

// Table: documents (generated PDFs)
export interface GeneratedDocument {
  id: string // uuid, PK
  request_id: string // uuid, FK to requests.id
  type: string // 'med_cert', 'referral', etc.
  subtype: string
  pdf_url: string
  created_at: string // ISO timestamp
}

// Med cert draft data structure
export interface MedCertDraftData {
  patient_name: string
  dob: string | null
  reason: string | null
  date_from: string | null
  date_to: string | null
  work_capacity: string | null
  notes?: string | null
  doctor_name: string
  provider_number: string
  created_date: string // YYYY-MM-DD

  // New schema-aligned fields (used by med_cert_drafts table)
  patient_full_name?: string | null
  patient_dob?: string | null
  certificate_type?: MedicalCertificateSubtype | null
  reason_summary?: string | null
  doctor_typed_name?: string | null
  doctor_ahpra?: string | null
  provider_name?: string | null
  provider_address?: string | null
  signature_asset_url?: string | null
}

// Pathology draft data structure
export interface PathologyDraftData {
  patient_name: string
  dob: string | null
  medicare_number: string | null
  tests_requested: string
  clinical_indication: string | null
  symptom_duration: string | null
  severity: string | null
  urgency: "Routine" | "Soon" | "Urgent" | "ASAP"
  previous_tests: string | null
  imaging_region?: string | null
  doctor_name: string
  provider_number: string
  created_date: string
}

// Prescription draft data structure
export interface PrescriptionDraftData {
  patient_name: string
  dob: string | null
  medicare_number: string | null
  medication_name: string
  dosage: string | null
  quantity: string | null
  repeats: number
  directions: string | null
  pbs_listed: boolean
  authority_required: boolean
  authority_number?: string | null
  doctor_name: string
  provider_number: string
  created_date: string
}

// Payment status type
export type PaymentStatus = "pending_payment" | "paid" | "failed" | "refunded"

// Refund status type
export type RefundStatus = "not_applicable" | "eligible" | "processing" | "refunded" | "failed" | "not_eligible"

// Payment type
export interface Payment {
  id: string // uuid, PK
  request_id: string // uuid, FK to requests.id
  stripe_session_id: string
  stripe_payment_intent_id: string | null
  amount: number
  currency: string
  status: "created" | "pending" | "paid" | "failed" | "refunded"
  // Refund tracking
  refund_status: RefundStatus
  refund_reason: string | null
  stripe_refund_id: string | null
  refunded_at: string | null // ISO timestamp
  refund_amount: number | null
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

// Joined/expanded types for queries
export interface RequestWithPatient extends Request {
  patient: Profile
}

export interface RequestWithDetails extends Request {
  patient: Profile
  answers: RequestAnswers | null
  document: Document | null
}

// Extended request with document
export interface RequestWithDocument extends RequestWithDetails {
  generatedDocument: GeneratedDocument | null
}

// Insert types (omit auto-generated fields and make fields with defaults optional)
export type ProfileInsert = Omit<Profile, "id" | "created_at" | "updated_at">
export type RequestInsert = Partial<Omit<Request, "id" | "created_at" | "updated_at">> & {
  patient_id: string
  type: RequestType
  status: RequestStatus
}
export type RequestAnswersInsert = Omit<RequestAnswers, "id" | "created_at">
export type DocumentInsert = Omit<Document, "id" | "created_at">
export type DocumentDraftInsert = Omit<DocumentDraft, "id" | "created_at" | "updated_at">
export type GeneratedDocumentInsert = Omit<GeneratedDocument, "id" | "created_at">

// Update types (all fields optional except id)
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">>
export type RequestUpdate = Partial<Omit<Request, "id" | "created_at">>

// Analytics types
export interface DashboardAnalytics {
  requests_today: number
  requests_this_week: number
  requests_this_month: number
  avg_review_time_hours: number
  approval_rate: number
  revenue_today: number
  revenue_this_week: number
  revenue_this_month: number
  requests_by_type: { type: string; count: number }[]
  requests_by_hour: { hour: number; count: number }[]
  requests_by_day: { date: string; count: number }[]
}
// ============================================================================
// MEDICAL CERTIFICATE DRAFT
// ============================================================================

export type MedCertDraftStatus = "draft" | "issued"

export interface MedCertDraft {
  id: string // uuid, PK
  request_id: string // uuid, FK to med_cert_requests.id
  
  // Patient information (editable by doctor)
  patient_full_name: string | null
  patient_dob: string | null // ISO date string
  
  // Certificate dates
  date_from: string | null // ISO date string
  date_to: string | null // ISO date string
  
  // Certificate type
  certificate_type: MedicalCertificateSubtype | null
  
  // Doctor-editable summary
  reason_summary: string | null
  
  // Doctor details (with defaults)
  doctor_typed_name: string // Default: "Dr Reabal Najjar, BHSc, MD, AFHEA"
  doctor_ahpra: string // Default: "MED0002576546"
  provider_name: string // Default: "InstantMed"
  provider_address: string // Default: "Level 1/457-459 Elizabeth Street, Surry Hills 2010, Sydney, Australia"
  
  // Signature asset
  signature_asset_url: string | null
  
  // Status tracking
  status: MedCertDraftStatus
  issued_at: string | null // ISO timestamp
  issued_by: string | null // uuid, FK to profiles.id
  
  // Timestamps
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export type MedCertDraftInsert = Omit<MedCertDraft, "id" | "created_at" | "updated_at">
export type MedCertDraftUpdate = Partial<Omit<MedCertDraft, "id" | "created_at" | "updated_at">>