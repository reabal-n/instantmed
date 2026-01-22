// Database table types mirroring Supabase schema

export type UserRole = "patient" | "doctor" | "admin"

// ============================================
// INTAKE TYPES (Canonical case object)
// ============================================

export type IntakeStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "in_review"
  | "pending_info"
  | "approved"
  | "declined"
  | "escalated"
  | "completed"
  | "cancelled"
  | "expired"
  | "awaiting_script"

export type RiskTier = "low" | "moderate" | "high" | "critical"

export type ServiceType =
  | "weight_loss"
  | "mens_health"
  | "womens_health"
  | "common_scripts"
  | "med_certs"
  | "referrals"
  | "pathology"

// Table: intakes (canonical case object)
export interface Intake {
  id: string
  patient_id: string
  service_id: string
  assigned_admin_id: string | null
  reference_number: string
  status: IntakeStatus
  previous_status: IntakeStatus | null
  // Category stored at creation for reliable retry
  category: string | null
  subtype: string | null
  // Concurrent review lock
  claimed_by: string | null
  claimed_at: string | null
  // Priority and SLA
  is_priority: boolean
  sla_deadline: string | null
  sla_warning_sent: boolean
  sla_breached: boolean
  // Risk assessment
  risk_score: number
  risk_tier: RiskTier
  risk_reasons: unknown[]
  risk_flags: unknown[]
  // Triage
  triage_result: "allow" | "request_more_info" | "requires_live_consult" | "decline" | null
  triage_reasons: unknown[]
  requires_live_consult: boolean
  live_consult_reason: string | null
  // Payment
  payment_id: string | null
  payment_status: "unpaid" | "pending" | "paid" | "refunded" | "failed"
  amount_cents: number | null
  refund_amount_cents: number
  // Admin/doctor workflow
  admin_notes: string | null
  doctor_notes: string | null
  decline_reason: string | null
  escalation_notes: string | null
  // Decision tracking
  decision: "approved" | "declined" | null
  decline_reason_code: string | null
  decline_reason_note: string | null
  decided_at: string | null
  // Review tracking
  reviewed_by: string | null
  reviewed_at: string | null
  flagged_for_followup: boolean
  followup_reason: string | null
  // Script tracking
  script_sent: boolean
  script_sent_at: string | null
  script_notes: string | null
  parchment_reference: string | null
  priority_review: boolean
  // Timestamps
  submitted_at: string | null
  paid_at: string | null
  assigned_at: string | null
  approved_at: string | null
  declined_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  // Document
  generated_document_url: string | null
  generated_document_type: string | null
  document_sent_at: string | null
  // Client info
  client_ip: string | null
  client_user_agent: string | null
  created_at: string
  updated_at: string
}

// Table: intake_documents (PDF storage)
export interface IntakeDocument {
  id: string
  intake_id: string
  document_type: string
  filename: string
  storage_path: string
  mime_type: string
  file_size_bytes: number | null
  certificate_number: string | null
  verification_code: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

// Table: decline_reason_templates
export interface DeclineReasonTemplate {
  id: string
  code: string
  label: string
  description: string | null
  email_template: string | null
  display_order: number
  is_active: boolean
  requires_note: boolean
  service_types: string[]
  created_at: string
  updated_at: string
}

// Table: stripe_webhook_dead_letter
export interface WebhookDeadLetter {
  id: string
  event_id: string
  event_type: string
  session_id: string | null
  intake_id: string | null
  error_message: string
  error_code: string | null
  payload: Record<string, unknown> | null
  retry_count: number
  max_retries: number
  last_retry_at: string | null
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
  created_at: string
}

// Table: intake_answers
export interface IntakeAnswers {
  id: string
  intake_id: string
  answers: Record<string, unknown>
  // Normalized fields
  has_allergies: boolean | null
  allergy_details: string | null
  has_current_medications: boolean | null
  current_medications: string[] | null
  has_medical_conditions: boolean | null
  medical_conditions: string[] | null
  symptom_duration: string | null
  symptom_severity: "mild" | "moderate" | "severe" | null
  pregnancy_status: "not_pregnant" | "pregnant" | "breastfeeding" | "trying" | "na" | null
  // Med cert specific
  absence_start_date: string | null
  absence_end_date: string | null
  absence_days: number | null
  employer_name: string | null
  reason_category: string | null
  // Risk flags
  red_flags: string[]
  yellow_flags: string[]
  questionnaire_version: string | null
  created_at: string
  updated_at: string
}

// Table: services
export interface Service {
  id: string
  slug: string
  name: string
  short_name: string | null
  description: string | null
  type: ServiceType
  category: string | null
  price_cents: number
  priority_fee_cents: number
  is_active: boolean
  requires_id_verification: boolean
  requires_medicare: boolean
  requires_photo: boolean
  min_age: number | null
  max_age: number | null
  allowed_states: string[] | null
  sla_standard_minutes: number
  sla_priority_minutes: number
  questionnaire_id: string | null
  eligibility_rules: Record<string, unknown>
  icon_name: string | null
  display_order: number
  badge_text: string | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

// Table: patient_notes (longitudinal encounter notes)
export interface PatientNote {
  id: string
  patient_id: string
  intake_id: string | null
  note_type: "encounter" | "general" | "allergy" | "medication" | "history" | "admin"
  title: string | null
  content: string
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

// Joined types for intakes
export interface IntakeWithPatient extends Intake {
  patient: Profile
  service?: Service
  answers?: Array<{ id: string; answers: Record<string, unknown> }> | null
}

export interface IntakeWithDetails extends Intake {
  patient: Profile
  service?: Service
  answers: IntakeAnswers | null
}

// Insert/update types for intakes
export type IntakeInsert = Partial<Omit<Intake, "id" | "created_at" | "updated_at" | "reference_number">> & {
  patient_id: string
  service_id: string
}
export type IntakeUpdate = Partial<Omit<Intake, "id" | "created_at" | "reference_number">>
export type IntakeAnswersInsert = Omit<IntakeAnswers, "id" | "created_at" | "updated_at" | "absence_days">
export type PatientNoteInsert = Omit<PatientNote, "id" | "created_at" | "updated_at">

// ============================================
// LEGACY REQUEST TYPES (deprecated - use Intake)
// ============================================

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
// NOTE: DB column is address_line_1 (with underscore), mapped to address_line1 in app layer
// DB column is address_line_2 (with underscore), mapped to address_line2 in app layer (not in interface)
// street_address and my_health_record_consent are app-layer aliases, not direct DB columns
export interface Profile {
  id: string // uuid, PK
  auth_user_id: string // uuid, references auth.users.id (Supabase Auth)
  clerk_user_id?: string | null // Legacy Clerk user ID (unused - project uses Supabase Auth)
  email?: string | null // User email
  avatar_url?: string | null // Profile avatar URL
  full_name: string
  date_of_birth: string // ISO date string
  role: UserRole
  // Contact & address fields (DB uses address_line_1, app maps to address_line1)
  phone: string | null
  address_line1: string | null // Maps to DB: address_line_1
  street_address: string | null // Alias for address_line1
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
  provider_number?: string | null // Medicare provider number for doctors
  // Consent and onboarding
  consent_myhr: boolean
  my_health_record_consent: boolean
  onboarding_completed: boolean
  // P1 FIX: Email verification for guest profile linking security
  email_verified: boolean
  email_verified_at: string | null
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
  verification_code?: string | null // For document verification
  created_at: string // ISO timestamp
  updated_at?: string // ISO timestamp
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
  
  // Clinic identity fields (from clinic_identity_snapshot)
  clinic_name?: string | null
  clinic_tagline?: string | null
  clinic_email?: string | null
  clinic_website?: string | null
  clinic_abn?: string | null
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

// ============================================
// AI DOCUMENT DRAFTS (for AI-generated content)
// ============================================

export type AIDocumentDraftType = "clinical_note" | "med_cert"
export type AIDocumentDraftStatus = "ready" | "failed" | "pending"

export interface AIDocumentDraft {
  id: string
  intake_id: string
  type: AIDocumentDraftType
  content: Record<string, unknown>
  model: string
  is_ai_generated: boolean
  status: AIDocumentDraftStatus
  error: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  generation_duration_ms: number | null
  validation_errors: unknown[] | null
  ground_truth_errors: unknown[] | null
  // Approval workflow fields (AI audit migration)
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  version: number
  edited_content: Record<string, unknown> | null
  input_hash: string | null
  created_at: string
  updated_at: string
}

export type AIDocumentDraftInsert = Omit<AIDocumentDraft, "id" | "created_at" | "updated_at">
export type AIDocumentDraftUpdate = Partial<Omit<AIDocumentDraft, "id" | "created_at" | "updated_at">>