/**
 * Form Transition Detection
 * 
 * Determines when a chat intake should transition to a full form.
 * Preserves partial intake state during transition.
 */

import type { StructuredIntake, ServiceType } from './structured-intake-schema'

// =============================================================================
// TRANSITION RULES
// =============================================================================

export interface TransitionRule {
  id: string
  serviceType: ServiceType | 'any'
  condition: (intake: StructuredIntake) => boolean
  reason: string
  targetForm: string
  priority: number // Higher = check first
}

export const TRANSITION_RULES: TransitionRule[] = [
  // High priority - Safety/Compliance
  {
    id: 'mental_health_new_rx',
    serviceType: 'new_prescription',
    condition: (intake) => {
      if (intake.data.type !== 'new_prescription') return false
      return intake.data.condition.category === 'mental_health'
    },
    reason: 'Mental health prescriptions require comprehensive assessment',
    targetForm: '/intake/mental-health',
    priority: 100,
  },
  {
    id: 'extended_certificate',
    serviceType: 'medical_certificate',
    condition: (intake) => {
      if (intake.data.type !== 'medical_certificate') return false
      return intake.data.durationDays > 7
    },
    reason: 'Extended certificates (>7 days) require detailed documentation',
    targetForm: '/intake/extended-certificate',
    priority: 90,
  },
  
  // Medium priority - Clinical complexity
  {
    id: 'poor_control_severe_effects',
    serviceType: 'repeat_prescription',
    condition: (intake) => {
      if (intake.data.type !== 'repeat_prescription') return false
      return (
        intake.data.conditionControl === 'poorly_controlled' &&
        (intake.data.sideEffects === 'moderate' || intake.data.sideEffects === 'severe')
      )
    },
    reason: 'Poor control with significant side effects requires medication review',
    targetForm: '/intake/medication-review',
    priority: 80,
  },
  {
    id: 'urgent_severe_consult',
    serviceType: 'general_consult',
    condition: (intake) => {
      if (intake.data.type !== 'general_consult') return false
      return (
        intake.data.concern.urgency === 'urgent' &&
        intake.data.symptoms?.severity === 'severe'
      )
    },
    reason: 'Urgent severe symptoms require triage assessment',
    targetForm: '/intake/urgent-triage',
    priority: 85,
  },
  
  // Lower priority - Complexity indicators
  {
    id: 'multiple_allergies',
    serviceType: 'new_prescription',
    condition: (intake) => {
      if (intake.data.type !== 'new_prescription') return false
      const allergyCount = intake.data.allergies.allergyList?.length || 0
      return allergyCount >= 3
    },
    reason: 'Multiple allergies require detailed safety review',
    targetForm: '/intake/allergy-review',
    priority: 60,
  },
  {
    id: 'polypharmacy',
    serviceType: 'new_prescription',
    condition: (intake) => {
      if (intake.data.type !== 'new_prescription') return false
      const medCount = intake.data.currentMedications.medicationList?.length || 0
      return medCount >= 5
    },
    reason: 'Multiple current medications require interaction review',
    targetForm: '/intake/medication-interaction',
    priority: 55,
  },
  {
    id: 'backdated_certificate',
    serviceType: 'medical_certificate',
    condition: (intake) => {
      if (intake.data.type !== 'medical_certificate') return false
      return intake.data.isBackdated && intake.data.durationDays > 3
    },
    reason: 'Backdated certificates over 3 days require documentation',
    targetForm: '/intake/backdated-certificate',
    priority: 70,
  },
]

// =============================================================================
// TRANSITION DETECTION
// =============================================================================

export interface TransitionResult {
  shouldTransition: boolean
  rule?: TransitionRule
  targetForm?: string
  reason?: string
  preservedState: Partial<StructuredIntake>
}

export function checkFormTransition(intake: StructuredIntake): TransitionResult {
  // Sort rules by priority (highest first)
  const sortedRules = [...TRANSITION_RULES].sort((a, b) => b.priority - a.priority)
  
  for (const rule of sortedRules) {
    // Check if rule applies to this service type
    if (rule.serviceType !== 'any' && rule.serviceType !== intake.serviceType) {
      continue
    }
    
    // Check if condition is met
    if (rule.condition(intake)) {
      return {
        shouldTransition: true,
        rule,
        targetForm: rule.targetForm,
        reason: rule.reason,
        preservedState: preserveIntakeState(intake),
      }
    }
  }
  
  return {
    shouldTransition: false,
    preservedState: {},
  }
}

// =============================================================================
// STATE PRESERVATION
// =============================================================================

function preserveIntakeState(intake: StructuredIntake): Partial<StructuredIntake> {
  // Preserve all collected data for form prefill
  return {
    id: intake.id,
    serviceType: intake.serviceType,
    patientId: intake.patientId,
    data: intake.data,
    flags: intake.flags,
    aiMetadata: {
      ...intake.aiMetadata,
      // Mark that this came from chat transition
    },
  }
}

export function encodePreservedState(state: Partial<StructuredIntake>): string {
  try {
    return btoa(JSON.stringify(state))
  } catch {
    return ''
  }
}

export function decodePreservedState(encoded: string): Partial<StructuredIntake> | null {
  try {
    return JSON.parse(atob(encoded))
  } catch {
    return null
  }
}

// =============================================================================
// FORM URL BUILDER
// =============================================================================

export function buildTransitionUrl(result: TransitionResult): string {
  if (!result.shouldTransition || !result.targetForm) {
    return ''
  }
  
  const encodedState = encodePreservedState(result.preservedState)
  const params = new URLSearchParams({
    from: 'chat',
    prefill: encodedState,
    reason: result.rule?.id || '',
  })
  
  return `${result.targetForm}?${params.toString()}`
}

// =============================================================================
// PARTIAL STATE VALIDATORS
// =============================================================================

export function getCompletionPercentage(intake: StructuredIntake): number {
  const { data } = intake
  let filled = 0
  let total = 0
  
  switch (data.type) {
    case 'medical_certificate':
      total = 8
      if (data.purpose) filled++
      if (data.startDate) filled++
      if (data.endDate) filled++
      if (data.durationDays) filled++
      if (data.primarySymptoms.length > 0) filled++
      if (data.symptomOnset) filled++
      if (data.symptomSeverity) filled++
      if (data.purpose === 'carer' && data.carerDetails?.personName) filled++
      break
      
    case 'repeat_prescription':
      total = 7
      if (data.medication.name) filled++
      if (data.treatmentDuration) filled++
      if (data.prescribedBy) filled++
      if (data.lastReviewDate) filled++
      if (data.conditionControl) filled++
      if (data.sideEffects) filled++
      if (data.takingAsDirected !== undefined) filled++
      break
      
    case 'new_prescription':
      total = 6
      if (data.condition.category) filled++
      if (data.condition.description) filled++
      if (data.condition.duration) filled++
      if (data.previousTreatment.triedBefore !== undefined) filled++
      if (data.allergies.hasAllergies !== undefined) filled++
      if (data.currentMedications.takingOther !== undefined) filled++
      break
      
    case 'general_consult':
      total = 4
      if (data.concern.summary) filled++
      if (data.concern.category) filled++
      if (data.concern.urgency) filled++
      if (data.consultType) filled++
      break
  }
  
  return Math.round((filled / total) * 100)
}

export function getNextRequiredField(intake: StructuredIntake): string | null {
  const { data } = intake
  
  switch (data.type) {
    case 'medical_certificate':
      if (!data.purpose) return 'purpose'
      if (data.purpose === 'carer' && !data.carerDetails?.personName) return 'carerName'
      if (!data.startDate) return 'startDate'
      if (!data.durationDays) return 'durationDays'
      if (data.primarySymptoms.length === 0) return 'primarySymptoms'
      if (!data.symptomOnset) return 'symptomOnset'
      if (!data.symptomSeverity) return 'symptomSeverity'
      return null
      
    case 'repeat_prescription':
      if (!data.medication.name) return 'medicationName'
      if (!data.treatmentDuration) return 'treatmentDuration'
      if (!data.prescribedBy) return 'prescribedBy'
      if (!data.lastReviewDate) return 'lastReviewDate'
      if (!data.conditionControl) return 'conditionControl'
      if (!data.sideEffects) return 'sideEffects'
      if (data.takingAsDirected === undefined) return 'takingAsDirected'
      return null
      
    case 'new_prescription':
      if (!data.condition.category) return 'conditionCategory'
      if (!data.condition.description) return 'conditionDescription'
      if (!data.condition.duration) return 'conditionDuration'
      if (data.previousTreatment.triedBefore === undefined) return 'triedBefore'
      if (data.allergies.hasAllergies === undefined) return 'hasAllergies'
      if (data.currentMedications.takingOther === undefined) return 'takingOtherMeds'
      return null
      
    case 'general_consult':
      if (!data.concern.summary) return 'concernSummary'
      if (!data.concern.category) return 'concernCategory'
      if (!data.concern.urgency) return 'urgency'
      if (!data.consultType) return 'consultType'
      return null
  }
}
