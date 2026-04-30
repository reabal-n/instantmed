import type { SelectedPBSProduct } from "@/components/shared"

// ============================================
// Flow types
// ============================================

export type FlowStep = "intro" | "form" | "auth" | "onboarding"

export interface PrescriptionFlowClientProps {
  category: string
  subtype: string
  title: string
  description: string
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
}

// ============================================
// Red flags - same for all subtypes
// ============================================
export const redFlags = [
  {
    id: "chest_pain",
    label: "Chest pain",
    description: "New or worsening chest pain or pressure",
  },
  {
    id: "shortness_of_breath",
    label: "Shortness of breath",
    description: "Difficulty breathing at rest or with minimal activity",
  },
  {
    id: "severe_headache",
    label: "Severe headache or neurological symptoms",
    description: "Sudden severe headache, vision changes, weakness, or numbness",
  },
  {
    id: "pregnancy",
    label: "Pregnancy or possible pregnancy",
    description: "Currently pregnant or possibility of pregnancy",
  },
  {
    id: "suicidal_thoughts",
    label: "Suicidal thoughts or self-harm",
    description: "Recent thoughts of suicide or self-harm",
  },
]

// ============================================
// REPEAT PRESCRIPTION OPTIONS
// ============================================
export const repeatReasonOptions = [
  { id: "antidepressant_anxiety", label: "Antidepressant / anxiety" },
  { id: "blood_pressure_heart", label: "Blood pressure / heart" },
  { id: "diabetes", label: "Diabetes" },
  { id: "asthma_inhaler", label: "Asthma / inhaler" },
  { id: "contraceptive_hormonal", label: "Contraceptive pill / hormonal" },
  { id: "other", label: "Other" },
]

export const repeatDurationOptions = [
  { id: "less_3_months", label: "< 3 months" },
  { id: "3_to_12_months", label: "3-12 months" },
  { id: "more_1_year", label: "> 1 year" },
]

export const repeatControlOptions = [
  { id: "well_controlled", label: "Well controlled" },
  { id: "partially_controlled", label: "Partially controlled" },
  { id: "poorly_controlled", label: "Poorly controlled" },
]

export const repeatSideEffectsOptions = [
  { id: "no", label: "No" },
  { id: "mild_tolerable", label: "Mild but tolerable" },
  { id: "significant_worrying", label: "Significant / worrying" },
]

// ============================================
// CHRONIC MEDICATION REVIEW OPTIONS
// ============================================
export const chronicRequestOptions = [
  { id: "repeat_existing", label: "Repeat of existing medication(s)" },
  { id: "dose_adjustment", label: "Dose adjustment review" },
  { id: "side_effects_review", label: "Side effects review" },
  { id: "adding_medication", label: "Adding an extra medication (same condition)" },
]

export const chronicConditionOptions = [
  { id: "depression_anxiety", label: "Depression / anxiety" },
  { id: "adhd_neurodivergent", label: "ADHD / neurodivergent" },
  { id: "cardiovascular_bp", label: "Cardiovascular / blood pressure" },
  { id: "metabolic", label: "Metabolic (diabetes, cholesterol)" },
  { id: "chronic_pain", label: "Chronic pain" },
  { id: "other", label: "Other" },
]

export const chronicReviewOptions = [
  { id: "within_3_months", label: "Within 3 months" },
  { id: "3_to_12_months", label: "3-12 months ago" },
  { id: "more_12_months", label: "> 12 months / can&apos;t remember" },
]

export const chronicControlOptions = [
  { id: "well_controlled", label: "Well controlled" },
  { id: "up_and_down", label: "Up and down" },
  { id: "poorly_controlled", label: "Poorly controlled" },
]

// ============================================
// Hook return type
// ============================================
export interface PrescriptionFlowState {
  // Auth state
  patientId: string | null
  setPatientId: (id: string | null) => void
  isAuthenticated: boolean
  setIsAuthenticated: (v: boolean) => void
  needsOnboarding: boolean
  setNeedsOnboarding: (v: boolean) => void
  currentUserName: string

  // Flow state
  step: FlowStep
  setStep: (s: FlowStep) => void
  isSubmitting: boolean
  error: string | null
  hasSubmitted: boolean

  // Form state
  selectedMedication: SelectedPBSProduct | null
  setSelectedMedication: (m: SelectedPBSProduct | null) => void
  additionalNotes: string
  setAdditionalNotes: (n: string) => void
  redFlagValues: Record<string, boolean>
  handleRedFlagChange: (id: string, value: boolean) => void
  hasRedFlags: boolean

  // Repeat prescription state
  repeatReason: string | null
  setRepeatReason: (v: string | null) => void
  repeatDuration: string | null
  setRepeatDuration: (v: string | null) => void
  repeatCurrentDose: string
  setRepeatCurrentDose: (v: string) => void
  repeatControl: string | null
  setRepeatControl: (v: string | null) => void
  repeatSideEffects: string | null
  setRepeatSideEffects: (v: string | null) => void

  // Chronic review state
  chronicRequests: string[]
  toggleChronicRequest: (id: string) => void
  chronicCondition: string | null
  setChronicCondition: (v: string | null) => void
  chronicReview: string | null
  setChronicReview: (v: string | null) => void
  chronicControl: string | null
  setChronicControl: (v: string | null) => void

  // Validation
  isFormValid: boolean

  // Actions
  handleFormComplete: () => void
  handleAuthComplete: (userId: string, profileId: string) => void
  handleOnboardingComplete: () => void
}
