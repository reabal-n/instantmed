/**
 * Step Registry - Dynamic step definitions per service type
 * 
 * This is the core of the unified /request flow. Each service type
 * has its own sequence of steps, but they share common components.
 */

import type { ComponentType as _ComponentType } from 'react'

// Service types supported by the unified flow
export type UnifiedServiceType = 
  | 'med-cert'
  | 'prescription'
  | 'repeat-script'
  | 'consult'
  | 'referral'

// Step IDs used across all flows
export type UnifiedStepId =
  | 'service'           // Service selection (optional - skip if pre-selected)
  | 'safety'            // Emergency gate - ALWAYS FIRST for clinical flows
  | 'certificate'       // Med cert type + duration
  | 'symptoms'          // Symptom selection + details
  | 'medication'        // PBS medication search
  | 'medication-history'// Previous prescriptions + side effects
  | 'medical-history'   // Allergies, conditions, other meds
  | 'consult-reason'    // General consult pathway
  | 'referral-reason'   // Referral type and reason
  | 'details'           // Patient identity + contact
  | 'review'            // Summary before payment
  | 'checkout'          // Payment + final consents

export interface StepDefinition {
  id: UnifiedStepId
  label: string
  shortLabel: string
  // Component will be lazy loaded
  componentPath: string
  // Validation function name (in lib/request/validation.ts)
  validateFn?: string
  // Can this step be skipped? (e.g., if user is authenticated)
  canSkip?: (context: StepContext) => boolean
  // Is this step required for the service?
  required: boolean
}

export interface StepContext {
  isAuthenticated: boolean
  hasProfile: boolean
  hasMedicare: boolean
  serviceType: UnifiedServiceType
  answers: Record<string, unknown>
}

// Step definitions per service
export const STEP_REGISTRY: Record<UnifiedServiceType, StepDefinition[]> = {
  'med-cert': [
    {
      id: 'safety',
      label: 'Safety check',
      shortLabel: 'Safety',
      componentPath: 'safety-step',
      required: true,
    },
    {
      id: 'certificate',
      label: 'Certificate details',
      shortLabel: 'Certificate',
      componentPath: 'certificate-step',
      validateFn: 'validateCertificateStep',
      required: true,
    },
    {
      id: 'symptoms',
      label: 'Your symptoms',
      shortLabel: 'Symptoms',
      componentPath: 'symptoms-step',
      validateFn: 'validateSymptomsStep',
      required: true,
    },
    {
      id: 'details',
      label: 'Your details',
      shortLabel: 'Details',
      componentPath: 'patient-details-step',
      validateFn: 'validateDetailsStep',
      canSkip: (ctx) => ctx.isAuthenticated && ctx.hasProfile,
      required: true,
    },
    {
      id: 'review',
      label: 'Review',
      shortLabel: 'Review',
      componentPath: 'review-step',
      required: true,
    },
    {
      id: 'checkout',
      label: 'Payment',
      shortLabel: 'Pay',
      componentPath: 'checkout-step',
      validateFn: 'validateCheckoutStep',
      required: true,
    },
  ],

  'prescription': [
    {
      id: 'safety',
      label: 'Safety check',
      shortLabel: 'Safety',
      componentPath: 'safety-step',
      required: true,
    },
    {
      id: 'medication',
      label: 'Your medication',
      shortLabel: 'Medication',
      componentPath: 'medication-step',
      validateFn: 'validateMedicationStep',
      required: true,
    },
    {
      id: 'medication-history',
      label: 'Prescription history',
      shortLabel: 'History',
      componentPath: 'medication-history-step',
      validateFn: 'validateMedicationHistoryStep',
      required: true,
    },
    {
      id: 'medical-history',
      label: 'Medical history',
      shortLabel: 'Health',
      componentPath: 'medical-history-step',
      validateFn: 'validateMedicalHistoryStep',
      required: true,
    },
    {
      id: 'details',
      label: 'Your details',
      shortLabel: 'Details',
      componentPath: 'patient-details-step',
      validateFn: 'validateDetailsStep',
      canSkip: (ctx) => ctx.isAuthenticated && ctx.hasProfile,
      required: true,
    },
    {
      id: 'review',
      label: 'Review',
      shortLabel: 'Review',
      componentPath: 'review-step',
      required: true,
    },
    {
      id: 'checkout',
      label: 'Payment',
      shortLabel: 'Pay',
      componentPath: 'checkout-step',
      validateFn: 'validateCheckoutStep',
      required: true,
    },
  ],

  // Alias for prescription
  'repeat-script': [
    {
      id: 'safety',
      label: 'Safety check',
      shortLabel: 'Safety',
      componentPath: 'safety-step',
      required: true,
    },
    {
      id: 'medication',
      label: 'Your medication',
      shortLabel: 'Medication',
      componentPath: 'medication-step',
      validateFn: 'validateMedicationStep',
      required: true,
    },
    {
      id: 'medication-history',
      label: 'Prescription history',
      shortLabel: 'History',
      componentPath: 'medication-history-step',
      validateFn: 'validateMedicationHistoryStep',
      required: true,
    },
    {
      id: 'medical-history',
      label: 'Medical history',
      shortLabel: 'Health',
      componentPath: 'medical-history-step',
      validateFn: 'validateMedicalHistoryStep',
      required: true,
    },
    {
      id: 'details',
      label: 'Your details',
      shortLabel: 'Details',
      componentPath: 'patient-details-step',
      validateFn: 'validateDetailsStep',
      canSkip: (ctx) => ctx.isAuthenticated && ctx.hasProfile,
      required: true,
    },
    {
      id: 'review',
      label: 'Review',
      shortLabel: 'Review',
      componentPath: 'review-step',
      required: true,
    },
    {
      id: 'checkout',
      label: 'Payment',
      shortLabel: 'Pay',
      componentPath: 'checkout-step',
      validateFn: 'validateCheckoutStep',
      required: true,
    },
  ],

  'consult': [
    {
      id: 'safety',
      label: 'Safety check',
      shortLabel: 'Safety',
      componentPath: 'safety-step',
      required: true,
    },
    {
      id: 'consult-reason',
      label: 'Your concern',
      shortLabel: 'Concern',
      componentPath: 'consult-reason-step',
      validateFn: 'validateConsultReasonStep',
      required: true,
    },
    {
      id: 'medical-history',
      label: 'Medical history',
      shortLabel: 'Health',
      componentPath: 'medical-history-step',
      validateFn: 'validateMedicalHistoryStep',
      required: true,
    },
    {
      id: 'details',
      label: 'Your details',
      shortLabel: 'Details',
      componentPath: 'patient-details-step',
      validateFn: 'validateDetailsStep',
      canSkip: (ctx) => ctx.isAuthenticated && ctx.hasProfile,
      required: true,
    },
    {
      id: 'review',
      label: 'Review',
      shortLabel: 'Review',
      componentPath: 'review-step',
      required: true,
    },
    {
      id: 'checkout',
      label: 'Payment',
      shortLabel: 'Pay',
      componentPath: 'checkout-step',
      validateFn: 'validateCheckoutStep',
      required: true,
    },
  ],

  // TODO: Referral flow not yet implemented - uses consult flow for now
  'referral': [
    {
      id: 'safety',
      label: 'Safety check',
      shortLabel: 'Safety',
      componentPath: 'safety-step',
      required: true,
    },
    {
      id: 'consult-reason',
      label: 'Referral details',
      shortLabel: 'Details',
      componentPath: 'consult-reason-step', // Use consult step temporarily
      validateFn: 'validateConsultReasonStep',
      required: true,
    },
    {
      id: 'details',
      label: 'Your details',
      shortLabel: 'You',
      componentPath: 'patient-details-step',
      validateFn: 'validateDetailsStep',
      canSkip: (ctx) => ctx.isAuthenticated && ctx.hasProfile,
      required: true,
    },
    {
      id: 'review',
      label: 'Review',
      shortLabel: 'Review',
      componentPath: 'review-step',
      required: true,
    },
    {
      id: 'checkout',
      label: 'Payment',
      shortLabel: 'Pay',
      componentPath: 'checkout-step',
      validateFn: 'validateCheckoutStep',
      required: true,
    },
  ],
}

/**
 * Get the step sequence for a service type, filtering out skippable steps
 */
export function getStepsForService(
  serviceType: UnifiedServiceType,
  context: StepContext
): StepDefinition[] {
  const steps = STEP_REGISTRY[serviceType] || STEP_REGISTRY['med-cert']
  
  return steps.filter(step => {
    if (!step.required) return true
    if (step.canSkip && step.canSkip(context)) return false
    return true
  })
}

/**
 * Get the next step ID given current step
 */
export function getNextStepId(
  serviceType: UnifiedServiceType,
  currentStepId: UnifiedStepId,
  context: StepContext
): UnifiedStepId | null {
  const steps = getStepsForService(serviceType, context)
  const currentIndex = steps.findIndex(s => s.id === currentStepId)
  
  if (currentIndex === -1 || currentIndex >= steps.length - 1) {
    return null
  }
  
  return steps[currentIndex + 1].id
}

/**
 * Get the previous step ID given current step
 */
export function getPreviousStepId(
  serviceType: UnifiedServiceType,
  currentStepId: UnifiedStepId,
  context: StepContext
): UnifiedStepId | null {
  const steps = getStepsForService(serviceType, context)
  const currentIndex = steps.findIndex(s => s.id === currentStepId)
  
  if (currentIndex <= 0) {
    return null
  }
  
  return steps[currentIndex - 1].id
}

/**
 * Map URL service params to UnifiedServiceType
 */
export function mapServiceParam(param: string | undefined): UnifiedServiceType | null {
  if (!param) return null
  
  const mapping: Record<string, UnifiedServiceType> = {
    'med-cert': 'med-cert',
    'medcert': 'med-cert',
    'medical-certificate': 'med-cert',
    'prescription': 'prescription',
    'repeat-script': 'repeat-script',
    'repeat-rx': 'repeat-script',
    'consult': 'consult',
    'consultation': 'consult',
    'referral': 'referral',
  }
  
  return mapping[param.toLowerCase()] || null
}
