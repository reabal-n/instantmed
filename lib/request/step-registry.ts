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
  | 'ed-assessment'     // ED-specific assessment
  | 'ed-safety'         // ED safety screening (nitrates, cardiac)
  | 'hair-loss-assessment' // Hair loss pattern and history
  | 'womens-health-type'   // Women's health sub-selection
  | 'womens-health-assessment' // Women's health specific questions
  | 'weight-loss-assessment'   // Weight loss goals and screening
  | 'weight-loss-call-scheduling' // Weight loss call availability
  | 'details'           // Patient identity + contact
  | 'review'            // Summary before payment
  | 'checkout'          // Payment + final consents

// Consult subtype keys (used in URL and intake creation)
export type ConsultSubtype =
  | 'general'
  | 'ed'
  | 'hair_loss'
  | 'womens_health'
  | 'weight_loss'

// Human-readable labels for consult subtypes
export const CONSULT_SUBTYPE_LABELS: Record<ConsultSubtype, string> = {
  general: 'General consultation',
  ed: 'Erectile dysfunction',
  hair_loss: 'Hair loss treatment',
  womens_health: "Women's health",
  weight_loss: 'Weight management',
}

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
      id: 'safety',
      label: 'Safety check',
      shortLabel: 'Safety',
      componentPath: 'safety-step',
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
      id: 'safety',
      label: 'Safety check',
      shortLabel: 'Safety',
      componentPath: 'safety-step',
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
      id: 'safety',
      label: 'Safety check',
      shortLabel: 'Safety',
      componentPath: 'safety-step',
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
      id: 'safety',
      label: 'Safety check',
      shortLabel: 'Safety',
      componentPath: 'safety-step',
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

// Shared tail steps for all consult subtypes
const CONSULT_COMMON_TAIL: StepDefinition[] = [
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
    id: 'safety',
    label: 'Safety check',
    shortLabel: 'Safety',
    componentPath: 'safety-step',
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
]

// Consult subtype-specific step sequences
const CONSULT_SUBTYPE_STEPS: Record<ConsultSubtype, StepDefinition[]> = {
  // General and new_medication use existing consult-reason step
  general: [
    {
      id: 'consult-reason',
      label: 'Your concern',
      shortLabel: 'Concern',
      componentPath: 'consult-reason-step',
      validateFn: 'validateConsultReasonStep',
      required: true,
    },
    ...CONSULT_COMMON_TAIL,
  ],
  
  ed: [
    {
      id: 'ed-assessment',
      label: 'ED assessment',
      shortLabel: 'Assessment',
      componentPath: 'ed-assessment-step',
      validateFn: 'validateEdAssessmentStep',
      required: true,
    },
    {
      id: 'ed-safety',
      label: 'Safety screening',
      shortLabel: 'Screening',
      componentPath: 'ed-safety-step',
      validateFn: 'validateEdSafetyStep',
      required: true,
    },
    ...CONSULT_COMMON_TAIL,
  ],
  
  hair_loss: [
    {
      id: 'hair-loss-assessment',
      label: 'Hair loss assessment',
      shortLabel: 'Assessment',
      componentPath: 'hair-loss-assessment-step',
      validateFn: 'validateHairLossAssessmentStep',
      required: true,
    },
    ...CONSULT_COMMON_TAIL,
  ],
  
  womens_health: [
    {
      id: 'womens-health-type',
      label: 'What you need',
      shortLabel: 'Type',
      componentPath: 'womens-health-type-step',
      validateFn: 'validateWomensHealthTypeStep',
      required: true,
    },
    {
      id: 'womens-health-assessment',
      label: 'Health assessment',
      shortLabel: 'Assessment',
      componentPath: 'womens-health-assessment-step',
      validateFn: 'validateWomensHealthAssessmentStep',
      required: true,
    },
    ...CONSULT_COMMON_TAIL,
  ],
  
  weight_loss: [
    {
      id: 'weight-loss-assessment',
      label: 'Weight loss assessment',
      shortLabel: 'Assessment',
      componentPath: 'weight-loss-assessment-step',
      validateFn: 'validateWeightLossAssessmentStep',
      required: true,
    },
    {
      id: 'weight-loss-call-scheduling',
      label: 'Schedule your call',
      shortLabel: 'Call',
      componentPath: 'weight-loss-call-step',
      validateFn: 'validateWeightLossCallStep',
      required: true,
    },
    ...CONSULT_COMMON_TAIL,
  ],
}

/**
 * Get the step sequence for a service type, filtering out skippable steps
 * For consult service, branches based on consultSubtype in answers
 */
export function getStepsForService(
  serviceType: UnifiedServiceType,
  context: StepContext
): StepDefinition[] {
  let steps: StepDefinition[]
  
  if (serviceType === 'consult') {
    // Branch based on consult subtype
    const subtype = context.answers.consultSubtype as ConsultSubtype | undefined
    if (subtype && CONSULT_SUBTYPE_STEPS[subtype]) {
      steps = CONSULT_SUBTYPE_STEPS[subtype]
    } else {
      // Fallback to default consult steps (with category selection)
      steps = STEP_REGISTRY['consult']
    }
  } else {
    steps = STEP_REGISTRY[serviceType]
  }
  
  if (!steps) {
    throw new Error(`Unknown service type: ${serviceType}. Supported types: ${Object.keys(STEP_REGISTRY).join(', ')}`)
  }
  
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

/** Supported URL service param slugs */
export const SUPPORTED_SERVICE_SLUGS = [
  'med-cert',
  'medcert', 
  'medical-certificate',
  'prescription',
  'repeat-script',
  'repeat-rx',
  'consult',
  'consultation',
] as const

/**
 * Map URL service params to UnifiedServiceType
 * 
 * Returns:
 * - UnifiedServiceType for valid service params
 * - null for invalid/unknown service params (caller should show error)
 * - null when no param provided (show service hub)
 */
export function mapServiceParam(param: string | undefined): UnifiedServiceType | null {
  // No param = show service hub (return null)
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
  }
  
  const normalized = param.toLowerCase()
  
  // Return null for unknown services - caller must handle this case
  if (!(normalized in mapping)) {
    return null
  }
  
  return mapping[normalized]
}
