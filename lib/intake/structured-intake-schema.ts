/**
 * Structured Intake Schema
 * 
 * Defines the data model for AI-collected intake that feeds the doctor review queue.
 * 
 * CRITICAL BOUNDARIES:
 * - AI collects data only — no clinical interpretation
 * - AI flags patterns — doctor makes decisions
 * - AI summarizes — doctor diagnoses
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type ServiceType = 
  | 'medical_certificate'
  | 'repeat_prescription'
  | 'new_prescription'
  | 'general_consult'

export type IntakeStatus = 
  | 'in_progress'
  | 'ready_for_review'
  | 'requires_form'      // Complex case, transition to full form
  | 'safety_exit'        // Emergency/crisis detected
  | 'out_of_scope'       // Cannot be handled via telehealth

export type FlagSeverity = 'info' | 'caution' | 'urgent' | 'blocker'

// =============================================================================
// STRUCTURED INTAKE DATA
// =============================================================================

export interface StructuredIntake {
  // Metadata
  id: string
  createdAt: string
  updatedAt: string
  status: IntakeStatus
  serviceType: ServiceType
  
  // Patient context (from auth, not collected by AI)
  patientId: string
  
  // Collected data by service type
  data: MedCertIntake | RepeatRxIntake | NewRxIntake | ConsultIntake
  
  // Safety and flags
  flags: IntakeFlag[]
  exclusions: string[]
  
  // Form transition
  requiresFormTransition: boolean
  formTransitionReason?: string
  
  // AI metadata (for audit)
  aiMetadata: {
    turnCount: number
    collectionDurationMs: number
    modelVersion: string
    promptVersion: string
  }
}

// =============================================================================
// MEDICAL CERTIFICATE INTAKE
// =============================================================================

export interface MedCertIntake {
  type: 'medical_certificate'
  
  // Required fields
  purpose: 'work' | 'education' | 'carer' | 'other'
  purposeOther?: string
  
  startDate: string        // ISO date
  endDate: string          // ISO date
  durationDays: number
  
  // Symptom collection (structured, not free-text diagnosis)
  primarySymptoms: SymptomEntry[]
  symptomOnset: 'today' | 'yesterday' | '2-3_days' | '4-7_days' | 'over_1_week'
  symptomSeverity: 'mild' | 'moderate' | 'severe'
  
  // Carer-specific
  carerDetails?: {
    personName: string
    relationship: 'child' | 'parent' | 'partner' | 'other_family'
    personCondition?: string
  }
  
  // Additional context
  additionalNotes?: string   // Max 200 chars, patient-provided
  
  // Backdating
  isBackdated: boolean
  backdatedReason?: string
}

export interface SymptomEntry {
  category: SymptomCategory
  description?: string      // Only if category is 'other'
}

export type SymptomCategory =
  | 'respiratory_upper'     // Cold, flu, sore throat
  | 'respiratory_lower'     // Cough, chest congestion
  | 'gastrointestinal'      // Nausea, vomiting, diarrhea
  | 'headache_migraine'
  | 'musculoskeletal'       // Back pain, injury
  | 'fatigue_malaise'
  | 'menstrual'
  | 'mental_health'         // Stress, anxiety, burnout
  | 'fever'
  | 'other'

// =============================================================================
// REPEAT PRESCRIPTION INTAKE
// =============================================================================

export interface RepeatRxIntake {
  type: 'repeat_prescription'
  
  // Medication identification
  medication: {
    name: string
    strength?: string
    form?: string
    pbsCode?: string        // If selected from PBS search
  }
  
  // Treatment history
  treatmentDuration: 'under_3_months' | '3_to_12_months' | 'over_1_year'
  prescribedBy: 'regular_gp' | 'specialist' | 'other_doctor' | 'this_service'
  lastReviewDate: 'under_3_months' | '3_to_6_months' | '6_to_12_months' | 'over_1_year'
  
  // Current status
  conditionControl: 'well_controlled' | 'partially_controlled' | 'poorly_controlled'
  sideEffects: 'none' | 'mild' | 'moderate' | 'severe'
  sideEffectDetails?: string
  
  // Changes
  recentChanges: boolean
  changeDetails?: string
  
  // Compliance
  takingAsDirected: boolean
  missedDosesFrequency?: 'rarely' | 'sometimes' | 'often'
  
  // Quantity
  requestedQuantity?: number
  requestedRepeats?: number
}

// =============================================================================
// NEW PRESCRIPTION INTAKE
// =============================================================================

export interface NewRxIntake {
  type: 'new_prescription'
  
  // Condition
  condition: {
    category: ConditionCategory
    description: string     // Patient's own words, max 300 chars
    duration: 'acute' | 'recent' | 'chronic' | 'recurring'
    onset: string           // When symptoms started
  }
  
  // Previous treatment
  previousTreatment: {
    triedBefore: boolean
    medications?: string[]
    effectiveness?: string
  }
  
  // Medication preference (advisory only)
  medicationPreference?: {
    hasPreference: boolean
    preferredMedication?: string
    reasonForPreference?: string
  }
  
  // Allergies and contraindications
  allergies: {
    hasAllergies: boolean
    allergyList?: string[]
  }
  
  // Current medications
  currentMedications: {
    takingOther: boolean
    medicationList?: string[]
  }
}

export type ConditionCategory =
  | 'skin'                  // Acne, eczema, rashes
  | 'infection'             // UTI, conjunctivitis
  | 'respiratory'           // Asthma, allergies
  | 'contraception'
  | 'mental_health'
  | 'pain'
  | 'gastrointestinal'
  | 'other'

// =============================================================================
// GENERAL CONSULT INTAKE
// =============================================================================

export interface ConsultIntake {
  type: 'general_consult'
  
  // Primary concern
  concern: {
    summary: string         // Max 300 chars
    category: ConsultCategory
    duration: string
    urgency: 'routine' | 'soon' | 'urgent'
  }
  
  // Symptom details
  symptoms?: {
    list: string[]
    severity: 'mild' | 'moderate' | 'severe'
    progression: 'improving' | 'stable' | 'worsening'
  }
  
  // What they're hoping for
  expectation: 'advice' | 'diagnosis' | 'prescription' | 'referral' | 'unsure'
  
  // Consult preference
  consultType: 'video' | 'phone' | 'async'
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'asap'
}

export type ConsultCategory =
  | 'new_symptom'
  | 'ongoing_condition'
  | 'test_results'
  | 'second_opinion'
  | 'preventive'
  | 'mental_health'
  | 'sexual_health'
  | 'other'

// =============================================================================
// FLAGS AND EXCLUSIONS
// =============================================================================

export interface IntakeFlag {
  id: string
  severity: FlagSeverity
  category: FlagCategory
  message: string           // For doctor display
  triggeredBy: string       // Field or pattern that triggered
  timestamp: string
}

export type FlagCategory =
  | 'emergency_symptom'     // Requires immediate action
  | 'controlled_substance'  // S8, benzos, etc.
  | 'interaction_risk'      // Potential drug interaction
  | 'duration_concern'      // Long certificate, new med short duration
  | 'compliance_concern'    // Poor control, missed doses
  | 'scope_limitation'      // May need in-person or specialist
  | 'clinical_red_flag'     // Symptoms needing attention

// Standard exclusions (reasons intake cannot proceed)
export const INTAKE_EXCLUSIONS = {
  CONTROLLED_SUBSTANCE: 'Medication is Schedule 8 or controlled substance',
  EMERGENCY_SYMPTOMS: 'Patient reported emergency symptoms',
  CRISIS_INDICATORS: 'Mental health crisis indicators detected',
  OUT_OF_SCOPE: 'Request outside telehealth scope',
  SPECIALIST_REQUIRED: 'Condition requires specialist assessment',
  IN_PERSON_REQUIRED: 'Clinical assessment requires in-person examination',
  RECENT_HOSPITALIZATION: 'Recent hospitalization requires GP follow-up',
  PREGNANCY_COMPLICATION: 'Pregnancy-related concern requires in-person care',
} as const

// =============================================================================
// FORM TRANSITION RULES
// =============================================================================

export interface FormTransitionRule {
  condition: string
  reason: string
  targetForm: string
}

export const FORM_TRANSITION_RULES: FormTransitionRule[] = [
  {
    condition: 'medcert.durationDays > 7',
    reason: 'Extended certificate requires detailed form',
    targetForm: 'extended_medcert_form',
  },
  {
    condition: 'newrx.condition.category === "mental_health"',
    reason: 'Mental health intake requires comprehensive assessment',
    targetForm: 'mental_health_intake_form',
  },
  {
    condition: 'repeatrx.conditionControl === "poorly_controlled"',
    reason: 'Poor control requires detailed medication review',
    targetForm: 'medication_review_form',
  },
  {
    condition: 'consult.concern.urgency === "urgent" && consult.symptoms.severity === "severe"',
    reason: 'Urgent severe symptoms require triage form',
    targetForm: 'urgent_triage_form',
  },
]

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createEmptyIntake(
  serviceType: ServiceType,
  patientId: string
): StructuredIntake {
  const now = new Date().toISOString()
  
  return {
    id: `intake_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: now,
    updatedAt: now,
    status: 'in_progress',
    serviceType,
    patientId,
    data: createEmptyData(serviceType),
    flags: [],
    exclusions: [],
    requiresFormTransition: false,
    aiMetadata: {
      turnCount: 0,
      collectionDurationMs: 0,
      modelVersion: 'gpt-4o-mini',
      promptVersion: '2.0',
    },
  }
}

function createEmptyData(serviceType: ServiceType): StructuredIntake['data'] {
  switch (serviceType) {
    case 'medical_certificate':
      return {
        type: 'medical_certificate',
        purpose: 'work',
        startDate: '',
        endDate: '',
        durationDays: 0,
        primarySymptoms: [],
        symptomOnset: 'today',
        symptomSeverity: 'mild',
        isBackdated: false,
      }
    case 'repeat_prescription':
      return {
        type: 'repeat_prescription',
        medication: { name: '' },
        treatmentDuration: '3_to_12_months',
        prescribedBy: 'regular_gp',
        lastReviewDate: '3_to_6_months',
        conditionControl: 'well_controlled',
        sideEffects: 'none',
        recentChanges: false,
        takingAsDirected: true,
      }
    case 'new_prescription':
      return {
        type: 'new_prescription',
        condition: {
          category: 'other',
          description: '',
          duration: 'acute',
          onset: '',
        },
        previousTreatment: { triedBefore: false },
        allergies: { hasAllergies: false },
        currentMedications: { takingOther: false },
      }
    case 'general_consult':
      return {
        type: 'general_consult',
        concern: {
          summary: '',
          category: 'new_symptom',
          duration: '',
          urgency: 'routine',
        },
        expectation: 'unsure',
        consultType: 'async',
      }
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

export function isIntakeComplete(intake: StructuredIntake): boolean {
  const { data } = intake
  
  switch (data.type) {
    case 'medical_certificate':
      return !!(
        data.purpose &&
        data.startDate &&
        data.endDate &&
        data.primarySymptoms.length > 0 &&
        data.symptomOnset &&
        data.symptomSeverity
      )
    
    case 'repeat_prescription':
      return !!(
        data.medication.name &&
        data.treatmentDuration &&
        data.lastReviewDate &&
        data.conditionControl
      )
    
    case 'new_prescription':
      return !!(
        data.condition.category &&
        data.condition.description &&
        data.allergies !== undefined &&
        data.currentMedications !== undefined
      )
    
    case 'general_consult':
      return !!(
        data.concern.summary &&
        data.concern.category &&
        data.consultType
      )
  }
}

export function getRequiredFields(serviceType: ServiceType): string[] {
  switch (serviceType) {
    case 'medical_certificate':
      return ['purpose', 'startDate', 'endDate', 'primarySymptoms', 'symptomOnset', 'symptomSeverity']
    case 'repeat_prescription':
      return ['medication.name', 'treatmentDuration', 'lastReviewDate', 'conditionControl']
    case 'new_prescription':
      return ['condition.category', 'condition.description', 'allergies', 'currentMedications']
    case 'general_consult':
      return ['concern.summary', 'concern.category', 'consultType']
  }
}
