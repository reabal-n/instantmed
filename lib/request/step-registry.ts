/**
 * Step Registry - Dynamic step definitions per service type
 * 
 * This is the core of the unified /request flow. Each service type
 * has its own sequence of steps, but they share common components.
 */

import type { ComponentType as _ComponentType } from 'react'

import {
  BLOCKED_CONSULT_SUBTYPES,
  CONSULT_SUBTYPE_LABELS,
  isConsultSubtypeAvailable,
} from '@/lib/request/consult-subtypes'
import { requiresPrescribingIdentityForRequest } from '@/lib/request/prescribing-identity'
import type { ConsultSubtype,UnifiedServiceType, UnifiedStepId } from '@/types/services'

// Re-export from canonical location for backward compatibility
export type { ConsultSubtype,UnifiedServiceType, UnifiedStepId }
export { BLOCKED_CONSULT_SUBTYPES, CONSULT_SUBTYPE_LABELS, isConsultSubtypeAvailable }

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
  /** True when profile has complete identity (incl. date_of_birth) - details step can be skipped */
  hasCompleteIdentity?: boolean
  hasMedicare: boolean // true when Medicare+IRN or IHI is present for prescribing
  hasAddress: boolean
  /** True when profile has a phone number - required for prescriptions + consults */
  hasPhone?: boolean
  /** True when prescribing sex is already stored on profile - required for eScript patient sync */
  hasSex?: boolean
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
      canSkip: (ctx) => ctx.isAuthenticated && (ctx.hasCompleteIdentity ?? ctx.hasProfile),
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
      label: 'Notes & history',
      shortLabel: 'Notes',
      componentPath: 'medical-history-step',
      validateFn: 'validatePrescriptionMedicalHistoryStep',
      required: true,
    },
    {
      id: 'details',
      label: 'Your details',
      shortLabel: 'Details',
      componentPath: 'patient-details-step',
      validateFn: 'validateDetailsStep',
      // Prescriptions require Medicare-or-IHI + address - only skip if all are present
      canSkip: (ctx) => ctx.isAuthenticated && (ctx.hasCompleteIdentity ?? ctx.hasProfile) && ctx.hasMedicare && ctx.hasAddress && ctx.hasPhone === true && ctx.hasSex === true,
      required: true,
    },
    {
      id: 'review',
      label: 'Review & pay',
      shortLabel: 'Pay',
      componentPath: 'review-step',
      validateFn: 'validateCheckoutStep',
      required: true,
    },
  ],

  // Alias - same flow as prescription
  'repeat-script': [] as StepDefinition[], // populated below

  // 'consult' has no default flow — it must always have a subtype. Bare
  // /request?service=consult is redirected to /consult (services index) by
  // the page entry. Subtype-specific sequences live in CONSULT_SUBTYPE_STEPS.
  'consult': [],
}

// repeat-script uses the same flow as prescription
STEP_REGISTRY['repeat-script'] = STEP_REGISTRY['prescription']

const CONSULT_REVIEW_TAIL: StepDefinition[] = [
  {
    id: 'details',
    label: 'Your details',
    shortLabel: 'Details',
    componentPath: 'patient-details-step',
    validateFn: 'validateDetailsStep',
    canSkip: (ctx) => {
      const needsPrescribingIdentity = requiresPrescribingIdentityForRequest({
        serviceType: ctx.serviceType,
        subtype: ctx.answers.consultSubtype as string | undefined,
      })

      return ctx.isAuthenticated
        && (ctx.hasCompleteIdentity ?? ctx.hasProfile)
        && ctx.hasMedicare
        && ctx.hasPhone === true
        && (!needsPrescribingIdentity || (ctx.hasAddress && ctx.hasSex === true))
    },
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

// Shared tail for generic consult paths that do not collect medical history in a subtype screen.
const CONSULT_COMMON_TAIL: StepDefinition[] = [
  {
    id: 'medical-history',
    label: 'Medical history',
    shortLabel: 'Health',
    componentPath: 'medical-history-step',
    validateFn: 'validateMedicalHistoryStep',
    required: true,
  },
  ...CONSULT_REVIEW_TAIL,
]

// Consult subtype-specific step sequences
const CONSULT_SUBTYPE_STEPS: Record<ConsultSubtype, StepDefinition[]> = {
  ed: [
    {
      id: 'ed-goals',
      label: "What's going on",
      shortLabel: 'Goals',
      componentPath: 'ed-goals-step',
      validateFn: 'validateEdGoalsStep',
      required: true,
    },
    {
      id: 'ed-assessment',
      label: "How it's affecting you",
      shortLabel: 'Assessment',
      componentPath: 'ed-assessment-step',
      validateFn: 'validateEdAssessmentStep',
      required: true,
    },
    {
      id: 'ed-health',
      label: 'Your health',
      shortLabel: 'Health',
      componentPath: 'ed-health-step',
      validateFn: 'validateEdHealthStep',
      required: true,
    },
    {
      id: 'ed-preferences',
      label: 'Your preferences',
      shortLabel: 'Preferences',
      componentPath: 'ed-preferences-step',
      validateFn: 'validateEdPreferencesStep',
      required: true,
    },
    ...CONSULT_REVIEW_TAIL,
  ],
  
  hair_loss: [
    {
      id: 'hair-loss-goals',
      label: 'What matters to you',
      shortLabel: 'Goals',
      componentPath: 'hair-loss-goals-step',
      validateFn: 'validateHairLossGoalsStep',
      required: true,
    },
    {
      id: 'hair-loss-assessment',
      label: 'Your hair loss pattern',
      shortLabel: 'Pattern',
      componentPath: 'hair-loss-assessment-step',
      validateFn: 'validateHairLossAssessmentStep',
      required: true,
    },
    {
      id: 'hair-loss-health',
      label: 'Your health',
      shortLabel: 'Health',
      componentPath: 'hair-loss-health-step',
      validateFn: 'validateHairLossHealthStep',
      required: true,
    },
    {
      id: 'hair-loss-preferences',
      label: 'Your preferences',
      shortLabel: 'Preferences',
      componentPath: 'hair-loss-preferences-step',
      validateFn: 'validateHairLossPreferencesStep',
      required: true,
    },
    ...CONSULT_REVIEW_TAIL,
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
 * Get step definition by id from the registry (before filtering).
 * Used when navigating to a skipped step for editing (e.g. Edit Your Details).
 */
export function getStepDefinitionById(
  serviceType: UnifiedServiceType,
  stepId: UnifiedStepId,
  context?: StepContext
): StepDefinition | null {
  let steps: StepDefinition[]
  if (serviceType === 'consult' && context) {
    const subtype = context.answers.consultSubtype as ConsultSubtype | undefined
    steps = subtype && CONSULT_SUBTYPE_STEPS[subtype]
      ? CONSULT_SUBTYPE_STEPS[subtype]
      : []
  } else {
    steps = STEP_REGISTRY[serviceType] ?? []
  }
  return steps.find((s) => s.id === stepId) ?? null
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
    // Consult REQUIRES a subtype. Bare /request?service=consult is redirected
    // to /consult (services index) by the page entry, so we should never reach
    // here without one. Returning [] makes the flow render as "no steps" if
    // somehow a stale state lands here.
    const subtype = context.answers.consultSubtype as ConsultSubtype | undefined

    // Block entry to Coming Soon subtypes
    if (subtype && BLOCKED_CONSULT_SUBTYPES.has(subtype)) {
      return []
    }

    if (subtype && CONSULT_SUBTYPE_STEPS[subtype]) {
      steps = CONSULT_SUBTYPE_STEPS[subtype]
    } else {
      return []
    }
  } else {
    steps = STEP_REGISTRY[serviceType]
  }
  
  if (!steps) {
    throw new Error(`Unknown service type: ${serviceType}. Supported types: ${Object.keys(STEP_REGISTRY).join(', ')}`)
  }
  
  return steps.filter(step => {
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
