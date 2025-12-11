export type ServiceType = 'sick_cert' | 'prescription'

export type ConsultationStatus = 'pending' | 'approved' | 'declined' | 'needs_follow_up'

export type PaymentStatus = 'pending_payment' | 'paid' | 'failed' | 'refunded'

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface Profile {
  id: string
  auth_user_id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  date_of_birth: string
  gender: Gender | null
  role: 'patient' | 'doctor'
  phone: string | null
  address_line1: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  medicare_number: string | null
  medicare_irn: number | null
  medicare_expiry: string | null
  consent_myhr: boolean
  onboarding_completed: boolean
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Request {
  id: string
  patient_id: string
  type: string
  category: string | null
  subtype: string | null
  status: ConsultationStatus
  paid: boolean
  payment_status: PaymentStatus
  priority_review: boolean
  start_date: string | null
  backdated: boolean
  clinical_notes: string | null
  script_sent: boolean
  created_at: string
  updated_at: string
}

export interface RequestAnswer {
  id: string
  request_id: string
  answers: Record<string, unknown>
  created_at: string
}

export interface Payment {
  id: string
  request_id: string
  stripe_session_id: string
  stripe_payment_intent_id: string | null
  amount: number
  amount_paid: number | null
  currency: string
  status: 'created' | 'pending' | 'paid' | 'failed' | 'refunded' | 'expired'
  created_at: string
  updated_at: string
}

// Consultation with related data
export interface ConsultationWithDetails extends Request {
  patient: Profile
  answers: RequestAnswer | null
}

// Form schemas
export interface MedCertIntakeData {
  symptoms: string[]
  symptomDetails: string
  startDate: string
  duration: string
  workType: string
  additionalInfo?: string
}

export interface ScriptIntakeData {
  medication: string
  currentlyTaking: boolean
  lastPrescribed?: string
  prescribingDoctor?: string
  reason: string
  allergies: string[]
  additionalInfo?: string
}

// Red flag symptoms that should block the form
export const RED_FLAG_SYMPTOMS = [
  'chest_pain',
  'severe_breathlessness',
  'difficulty_breathing',
  'loss_of_consciousness',
  'severe_bleeding',
  'stroke_symptoms',
] as const

export type RedFlagSymptom = typeof RED_FLAG_SYMPTOMS[number]

// Keywords to highlight in doctor review
export const HIGHLIGHT_KEYWORDS = [
  'pregnant',
  'pregnancy',
  'allergy',
  'allergic',
  'bleeding',
  'blood',
  'suicidal',
  'suicide',
  'overdose',
  'chest pain',
  'breathless',
  'unconscious',
] as const

