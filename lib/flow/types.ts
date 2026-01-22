// ============================================
// FLOW ENGINE TYPES
// ============================================

// 5-step model per refined spec
export type FlowStepId = 
  | 'service'       // Step 1: Select service (auto-advance after 150ms)
  | 'safety'        // Step 2: Safety screening (hard gate with iOS toggle)
  | 'questions'     // Step 3: Service-specific questions (branched content)
  | 'details'       // Step 4: Identity + auth + 3 consent toggles
  | 'checkout'      // Step 5: Review & pay + accuracy toggle + Stripe

// Service categories
export type ServiceCategory = 
  | 'medical-certificate'
  | 'prescription'
  | 'mental-health'
  | 'common-scripts'
  | 'consult'

export interface FlowStep {
  id: FlowStepId
  label: string
  shortLabel?: string
}

export interface FlowConfig {
  id: string
  serviceSlug: string
  serviceName: string
  serviceDescription: string
  category: ServiceCategory
  icon?: string
  steps: FlowStep[]
  questionnaire: QuestionnaireConfig
  pricing: PricingConfig
  requirements: RequirementsConfig
  // UI customization
  accentColor?: string
  estimatedTime?: string
  features?: string[]
}

export interface PricingConfig {
  basePriceCents: number
  twoDayPriceCents?: number  // For tiered pricing (e.g., 2-day med certs)
  priorityFeeCents: number
  backdatingFeeCents?: number
}

export interface RequirementsConfig {
  requiresAuth: boolean
  requiresMedicare: boolean
  requiresIdVerification: boolean
  minAge?: number
  maxAge?: number
}

// ============================================
// QUESTIONNAIRE TYPES
// ============================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'boolean'
  | 'file'
  | 'toggle'           // iOS-style toggle for binary confirmations
  | 'segmented'        // Segmented control for mutually exclusive options

export interface FieldOption {
  value: string
  label: string
  description?: string
  isDisqualifying?: boolean
}

export interface FieldValidation {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  patternMessage?: string
  // Date-specific constraints
  maxBackdateDays?: number    // Max days in the past allowed
  maxDurationDays?: number    // Max days duration from another field
  relativeToField?: string    // Field to calculate relative constraints from
}

export interface ConditionalLogic {
  fieldId: string
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'includes' | 'not_includes'
  value: unknown
}

export interface FieldConfig {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  description?: string
  helpText?: string
  options?: FieldOption[]
  validation?: FieldValidation
  showIf?: ConditionalLogic
  isRedFlag?: boolean
  redFlagMessage?: string
}

export interface QuestionGroup {
  id: string
  title: string
  description?: string
  fields: FieldConfig[]
}

export interface QuestionnaireConfig {
  id: string
  version: string
  // Eligibility fields shown first (red flags, hard stops)
  eligibilityFields: FieldConfig[]
  // Main questionnaire groups
  groups: QuestionGroup[]
}

// ============================================
// FLOW STATE TYPES
// ============================================

export interface FlowState {
  // Current position
  currentStepId: FlowStepId
  currentGroupIndex: number
  
  // Service
  serviceSlug: string | null
  
  // Form data
  answers: Record<string, unknown>
  identityData: IdentityData | null
  consentsGiven: ConsentRecord[]
  
  // Status flags
  isEligible: boolean | null
  eligibilityFailReason: string | null
  
  // Draft persistence
  draftId: string | null
  intakeId: string | null
  
  // Session
  sessionId: string
  startedAt: string
  lastSavedAt: string | null
  
  // UI state
  isLoading: boolean
  isSaving: boolean
  error: string | null
}

export interface IdentityData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  
  // Address
  addressLine1?: string
  addressLine2?: string
  suburb?: string
  state?: string
  postcode?: string
  
  // Medicare (optional)
  medicareNumber?: string
  medicareIrn?: string
  medicareExpiry?: string
  
  // Individual Healthcare Identifier (alternative to Medicare for eScript)
  ihi?: string
}

export interface ConsentRecord {
  type: ConsentType
  version: string
  grantedAt: string
  textHash: string
}

export type ConsentType =
  | 'telehealth_terms'
  | 'privacy_policy'
  | 'fee_agreement'
  | 'escalation_agreement'
  | 'treatment_consent'

// ============================================
// FLOW ACTIONS
// ============================================

export interface FlowActions {
  // Navigation
  goToStep: (stepId: FlowStepId) => void
  nextStep: () => void
  prevStep: () => void
  nextGroup: () => void
  prevGroup: () => void
  
  // Data
  setServiceSlug: (slug: string) => void
  updateAnswer: (fieldId: string, value: unknown) => void
  setAnswers: (answers: Record<string, unknown>) => void
  setIdentityData: (data: IdentityData) => void
  addConsent: (consent: ConsentRecord) => void
  
  // Status
  setEligibility: (isEligible: boolean, reason?: string) => void
  setIntakeId: (id: string) => void
  setDraftId: (id: string) => void
  
  // UI
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setError: (error: string | null) => void
  
  // Persistence
  saveDraft: () => Promise<void>
  loadDraft: (draftId: string) => Promise<void>
  clearDraft: () => void
  
  // Reset
  reset: () => void
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface FlowShellProps {
  config: FlowConfig
  children: React.ReactNode
  onComplete: (state: FlowState) => void | Promise<void>
  onExit?: () => void
}

export interface StepComponentProps {
  config: FlowConfig
  state: FlowState
  actions: FlowActions
}
