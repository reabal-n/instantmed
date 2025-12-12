// ============================================
// DATABASE TYPES: TypeScript types for Supabase schema
// Auto-generate with: supabase gen types typescript --local
// ============================================

export type UserRole = 'patient' | 'admin'

export type ServiceType = 
  | 'weight_loss'
  | 'mens_health'
  | 'womens_health'
  | 'common_scripts'
  | 'med_certs'
  | 'referrals'
  | 'pathology'

export type IntakeStatus = 
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'in_review'
  | 'pending_info'
  | 'approved'
  | 'declined'
  | 'escalated'
  | 'completed'
  | 'cancelled'
  | 'expired'

export type RiskTier = 'low' | 'moderate' | 'high' | 'critical'

export type AdminActionType = 
  | 'viewed'
  | 'assigned'
  | 'unassigned'
  | 'requested_info'
  | 'approved'
  | 'declined'
  | 'escalated'
  | 'added_note'
  | 'generated_document'
  | 'sent_message'

export type MessageSenderType = 'patient' | 'admin' | 'system'

export type ConsentType = 
  | 'telehealth_terms'
  | 'privacy_policy'
  | 'fee_agreement'
  | 'escalation_agreement'
  | 'medication_consent'
  | 'treatment_consent'

export type AttachmentType = 
  | 'id_document'
  | 'medical_record'
  | 'prescription'
  | 'referral'
  | 'pathology_result'
  | 'photo'
  | 'other'

export type AuditEventType = 
  | 'intake_created'
  | 'intake_submitted'
  | 'payment_received'
  | 'status_changed'
  | 'admin_action'
  | 'message_sent'
  | 'document_generated'
  | 'document_sent'
  | 'consent_given'
  | 'escalation_triggered'
  | 'sla_warning'
  | 'sla_breached'

export type AustralianState = 'ACT' | 'NSW' | 'NT' | 'QLD' | 'SA' | 'TAS' | 'VIC' | 'WA'

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed'

export type TriageResult = 'allow' | 'request_more_info' | 'requires_live_consult' | 'decline'

// ============================================
// TABLE TYPES
// ============================================

export interface Profile {
  id: string
  auth_user_id: string
  email: string
  full_name: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  phone: string | null
  
  // Address
  address_line_1: string | null
  address_line_2: string | null
  suburb: string | null
  state: AustralianState | null
  postcode: string | null
  
  // Medicare
  medicare_number: string | null
  medicare_irn: number | null
  medicare_expiry: string | null
  
  // Role and status
  role: UserRole
  is_verified: boolean
  is_active: boolean
  
  // Admin fields
  admin_level: number
  can_approve_high_risk: boolean
  
  // Preferences
  preferred_contact_method: 'email' | 'sms' | 'phone'
  notifications_enabled: boolean
  
  // Metadata
  avatar_url: string | null
  timezone: string
  stripe_customer_id: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface Service {
  id: string
  slug: string
  name: string
  short_name: string | null
  description: string | null
  type: ServiceType
  category: string | null
  
  // Pricing
  price_cents: number
  priority_fee_cents: number
  
  // Configuration
  is_active: boolean
  requires_id_verification: boolean
  requires_medicare: boolean
  requires_photo: boolean
  min_age: number | null
  max_age: number | null
  allowed_states: AustralianState[] | null
  
  // SLA
  sla_standard_minutes: number
  sla_priority_minutes: number
  
  // Questionnaire
  questionnaire_id: string | null
  eligibility_rules: Record<string, unknown>
  
  // Display
  icon_name: string | null
  display_order: number
  badge_text: string | null
  
  // SEO
  meta_title: string | null
  meta_description: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface Intake {
  id: string
  patient_id: string
  service_id: string
  assigned_admin_id: string | null
  reference_number: string
  
  // Status
  status: IntakeStatus
  previous_status: IntakeStatus | null
  
  // Priority and SLA
  is_priority: boolean
  sla_deadline: string | null
  sla_warning_sent: boolean
  sla_breached: boolean
  
  // Risk assessment
  risk_score: number
  risk_tier: RiskTier
  risk_reasons: string[]
  risk_flags: string[]
  
  // Triage
  triage_result: TriageResult | null
  triage_reasons: string[]
  requires_live_consult: boolean
  live_consult_reason: string | null
  
  // Payment
  payment_id: string | null
  payment_status: PaymentStatus
  amount_cents: number | null
  refund_amount_cents: number
  
  // Admin workflow
  admin_notes: string | null
  decline_reason: string | null
  escalation_notes: string | null
  
  // Lifecycle timestamps
  submitted_at: string | null
  paid_at: string | null
  assigned_at: string | null
  reviewed_at: string | null
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
  
  // Timestamps
  created_at: string
  updated_at: string
}

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
  symptom_severity: 'mild' | 'moderate' | 'severe' | null
  pregnancy_status: 'not_pregnant' | 'pregnant' | 'breastfeeding' | 'trying' | 'na' | null
  
  // Weight loss
  current_weight_kg: number | null
  height_cm: number | null
  bmi: number | null
  target_weight_kg: number | null
  previous_weight_loss_attempts: string[] | null
  
  // Men's health
  ed_frequency: string | null
  ed_duration: string | null
  cardiovascular_risk_factors: string[] | null
  
  // Med cert
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

export interface Consent {
  id: string
  intake_id: string
  patient_id: string
  consent_type: ConsentType
  consent_version: string
  is_granted: boolean
  granted_at: string | null
  revoked_at: string | null
  client_ip: string | null
  client_user_agent: string | null
  client_fingerprint: string | null
  consent_text_hash: string | null
  created_at: string
}

export interface Message {
  id: string
  intake_id: string
  sender_id: string | null
  sender_type: MessageSenderType
  content: string
  message_type: 'general' | 'info_request' | 'info_response' | 'status_update' | 'system'
  metadata: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  is_internal: boolean
  created_at: string
}

export interface Attachment {
  id: string
  intake_id: string
  uploaded_by_id: string
  message_id: string | null
  file_name: string
  file_type: string
  file_size_bytes: number | null
  attachment_type: AttachmentType
  storage_bucket: string
  storage_path: string
  is_verified: boolean
  verified_at: string | null
  verified_by_id: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AdminAction {
  id: string
  intake_id: string
  admin_id: string
  action_type: AdminActionType
  previous_status: IntakeStatus | null
  new_status: IntakeStatus | null
  notes: string | null
  internal_notes: string | null
  clinical_notes: string | null
  questions_asked: Record<string, unknown> | null
  metadata: Record<string, unknown>
  client_ip: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  event_type: AuditEventType
  intake_id: string | null
  profile_id: string | null
  admin_action_id: string | null
  actor_id: string | null
  actor_type: 'patient' | 'admin' | 'system' | 'webhook'
  description: string
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  metadata: Record<string, unknown>
  client_ip: string | null
  client_user_agent: string | null
  request_id: string | null
  created_at: string
}

// ============================================
// VIEW TYPES
// ============================================

export interface AdminQueueItem {
  id: string
  reference_number: string
  status: IntakeStatus
  is_priority: boolean
  risk_tier: RiskTier
  risk_score: number
  sla_deadline: string | null
  sla_breached: boolean
  created_at: string
  submitted_at: string | null
  paid_at: string | null
  assigned_at: string | null
  
  patient_id: string
  patient_name: string
  patient_email: string
  patient_dob: string | null
  
  service_id: string
  service_name: string
  service_type: ServiceType
  service_slug: string
  
  assigned_admin_id: string | null
  assigned_admin_name: string | null
  
  minutes_since_paid: number | null
  minutes_until_sla: number | null
  sla_status: 'ok' | 'warning' | 'breached'
  unread_messages: number
}

export interface PatientIntakeSummary {
  id: string
  reference_number: string
  status: IntakeStatus
  is_priority: boolean
  created_at: string
  submitted_at: string | null
  approved_at: string | null
  completed_at: string | null
  payment_status: PaymentStatus
  
  service_name: string
  service_type: ServiceType
  service_slug: string
  
  latest_message: string | null
  unread_count: number
  
  patient_id: string
}

// ============================================
// INSERT/UPDATE TYPES
// ============================================

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'>
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'auth_user_id' | 'created_at' | 'updated_at'>>

export type IntakeInsert = Pick<Intake, 'patient_id' | 'service_id'> & Partial<Omit<Intake, 'id' | 'created_at' | 'updated_at' | 'reference_number'>>
export type IntakeUpdate = Partial<Omit<Intake, 'id' | 'patient_id' | 'created_at' | 'updated_at' | 'reference_number'>>

export type IntakeAnswersInsert = Pick<IntakeAnswers, 'intake_id' | 'answers'> & Partial<Omit<IntakeAnswers, 'id' | 'created_at' | 'updated_at' | 'bmi' | 'absence_days'>>
export type IntakeAnswersUpdate = Partial<Omit<IntakeAnswers, 'id' | 'intake_id' | 'created_at' | 'updated_at' | 'bmi' | 'absence_days'>>

export type MessageInsert = Pick<Message, 'intake_id' | 'sender_type' | 'content'> & Partial<Omit<Message, 'id' | 'created_at'>>

// ============================================
// HELPER TYPES
// ============================================

export interface IntakeWithRelations extends Intake {
  patient?: Profile
  service?: Service
  assigned_admin?: Profile
  answers?: IntakeAnswers
  messages?: Message[]
  attachments?: Attachment[]
  consents?: Consent[]
}

export interface ServiceWithStats extends Service {
  intake_count?: number
  avg_approval_time_hours?: number
}

// Type guard helpers
export function isAdmin(profile: Profile): boolean {
  return profile.role === 'admin'
}

export function isPatient(profile: Profile): boolean {
  return profile.role === 'patient'
}

export function canApproveHighRisk(profile: Profile): boolean {
  return profile.role === 'admin' && profile.can_approve_high_risk
}
