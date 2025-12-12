import type { ServiceType } from '@/types/database'

// ============================================
// ONBOARDING FLOW TYPES
// ============================================

export type OnboardingStep = 
  | 'service'
  | 'eligibility'
  | 'questions'
  | 'identity'
  | 'consent'
  | 'review'
  | 'payment'
  | 'submitted'

export interface OnboardingState {
  // Current step
  currentStep: OnboardingStep
  
  // Service selection
  serviceSlug: string | null
  serviceType: ServiceType | null
  
  // Draft data
  intakeId: string | null
  draftId: string | null
  
  // Form data
  eligibilityAnswers: Record<string, unknown>
  questionnaireAnswers: Record<string, unknown>
  identityData: IdentityData | null
  consentsGiven: ConsentRecord[]
  
  // State flags
  isEligible: boolean | null
  eligibilityFailReason: string | null
  isLoading: boolean
  error: string | null
  
  // Progress tracking
  completedSteps: OnboardingStep[]
  
  // Session
  sessionId: string
  startedAt: string
  lastUpdatedAt: string
}

export interface IdentityData {
  firstName: string
  lastName: string
  dateOfBirth: string
  phone: string
  
  // Address
  addressLine1: string
  addressLine2?: string
  suburb: string
  state: string
  postcode: string
  
  // Medicare (optional)
  medicareNumber?: string
  medicareIrn?: number
  medicareExpiry?: string
  
  // ID verification
  idVerified?: boolean
  idDocumentUrl?: string
}

export interface ConsentRecord {
  type: string
  version: string
  grantedAt: string
  textHash: string
}

// ============================================
// QUESTIONNAIRE TYPES
// ============================================

export type QuestionType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'boolean'
  | 'scale'
  | 'file'

export interface QuestionOption {
  value: string
  label: string
  description?: string
  icon?: string
  isDisqualifying?: boolean // If selected, fails eligibility
}

export interface QuestionConfig {
  id: string
  type: QuestionType
  question: string
  description?: string
  placeholder?: string
  required?: boolean
  
  // Validation
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  
  // Options for select/radio/checkbox
  options?: QuestionOption[]
  
  // Conditional display
  showIf?: {
    questionId: string
    operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt'
    value: unknown
  }
  
  // Help text
  whyWeAsk?: string
  
  // Risk assessment
  riskWeight?: number
  redFlagValues?: unknown[] // Values that trigger red flags
  yellowFlagValues?: unknown[] // Values that trigger warnings
}

export interface QuestionGroup {
  id: string
  title: string
  description?: string
  questions: QuestionConfig[]
}

export interface Questionnaire {
  id: string
  version: string
  serviceType: ServiceType
  eligibilityQuestions: QuestionConfig[]
  questionGroups: QuestionGroup[]
}

// ============================================
// ELIGIBILITY TYPES
// ============================================

export interface EligibilityResult {
  isEligible: boolean
  failReasons: string[]
  warnings: string[]
  blockedBy?: string[] // Question IDs that blocked eligibility
}

export interface EligibilityRule {
  questionId: string
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'between' | 'includes'
  value: unknown
  valueMax?: unknown // For 'between' operator
  failMessage: string
  isHardStop: boolean // If true, immediately fails eligibility
}

// ============================================
// DRAFT PERSISTENCE
// ============================================

export interface OnboardingDraft {
  id: string
  userId?: string // Null for anonymous
  sessionId: string
  serviceSlug: string
  state: Partial<OnboardingState>
  createdAt: string
  updatedAt: string
  expiresAt: string
}

// ============================================
// STEP PROPS
// ============================================

export interface StepProps {
  state: OnboardingState
  onNext: () => void
  onBack: () => void
  onUpdateState: (updates: Partial<OnboardingState>) => void
  onSaveDraft: () => Promise<void>
}
