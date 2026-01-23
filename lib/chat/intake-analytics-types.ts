/**
 * Intake Analytics Types and Client-Safe Helpers
 * 
 * This file contains types and utilities that are safe to use in client components.
 * For server-side tracking functions, use intake-analytics.ts
 */

// =============================================================================
// TYPES
// =============================================================================

export type IntakeStep = 
  | 'chat_opened'
  | 'service_selected'
  | 'details_started'
  | 'symptoms_collected'
  | 'dates_collected'
  | 'review_shown'
  | 'submitted'
  | 'abandoned'
  | 'error'

export type ServiceType = 'med_cert' | 'repeat_rx' | 'new_rx' | 'consult' | null

export interface IntakeFunnelEvent {
  step: IntakeStep
  serviceType: ServiceType
  stepNumber: number
  totalSteps: number
  durationMs?: number
  previousStep?: IntakeStep
  metadata?: Record<string, unknown>
}

export interface AIInteractionEvent {
  sessionId: string
  messageCount: number
  serviceType: ServiceType
  turnNumber: number
  inputLength: number
  outputLength: number
  responseTimeMs: number
  hasFlags: boolean
  flagTypes?: string[]
  modelVersion: string
  promptVersion: string
}

export interface IntakeAbandonEvent {
  sessionId: string
  serviceType: ServiceType
  lastStep: IntakeStep
  stepNumber: number
  timeSpentMs: number
  messageCount: number
  reason: 'closed' | 'timeout' | 'error' | 'navigated_away'
}

// =============================================================================
// STEP CONFIGURATIONS BY SERVICE TYPE
// =============================================================================

export const INTAKE_STEPS: Record<string, { steps: IntakeStep[]; labels: string[] }> = {
  med_cert: {
    steps: ['chat_opened', 'service_selected', 'details_started', 'symptoms_collected', 'dates_collected', 'review_shown', 'submitted'],
    labels: ['Start', 'Service', 'Details', 'Symptoms', 'Dates', 'Review', 'Submit'],
  },
  repeat_rx: {
    steps: ['chat_opened', 'service_selected', 'details_started', 'review_shown', 'submitted'],
    labels: ['Start', 'Service', 'Medication', 'Review', 'Submit'],
  },
  new_rx: {
    steps: ['chat_opened', 'service_selected', 'details_started', 'symptoms_collected', 'review_shown', 'submitted'],
    labels: ['Start', 'Service', 'Condition', 'History', 'Review', 'Submit'],
  },
  consult: {
    steps: ['chat_opened', 'service_selected', 'details_started', 'review_shown', 'submitted'],
    labels: ['Start', 'Service', 'Concern', 'Review', 'Submit'],
  },
}

// =============================================================================
// STEP DETECTION FROM MESSAGES
// =============================================================================

/**
 * Detect current intake step from message content and collected data
 */
export function detectIntakeStep(
  messages: Array<{ role: string; content: string }>,
  serviceType: ServiceType,
  collectedData: Record<string, unknown>
): { step: IntakeStep; stepNumber: number; totalSteps: number } {
  const config = serviceType ? INTAKE_STEPS[serviceType] : INTAKE_STEPS.med_cert
  const steps = config?.steps || INTAKE_STEPS.med_cert.steps
  const totalSteps = steps.length
  
  // No messages = just opened
  if (messages.length === 0) {
    return { step: 'chat_opened', stepNumber: 1, totalSteps }
  }
  
  // Check for service selection
  if (!serviceType) {
    return { step: 'chat_opened', stepNumber: 1, totalSteps }
  }
  
  // Detect based on collected data
  const hasService = !!serviceType
  const hasDetails = Object.keys(collectedData).length > 0
  const hasSymptoms = 'symptoms' in collectedData || 'primarySymptoms' in collectedData
  const hasDates = 'dateFrom' in collectedData || 'startDate' in collectedData
  const isReady = collectedData.ready === true || collectedData.status === 'ready_for_review'
  
  if (isReady) {
    return { step: 'review_shown', stepNumber: totalSteps - 1, totalSteps }
  }
  
  if (serviceType === 'med_cert') {
    if (hasDates) return { step: 'dates_collected', stepNumber: 5, totalSteps }
    if (hasSymptoms) return { step: 'symptoms_collected', stepNumber: 4, totalSteps }
  }
  
  if (hasDetails) {
    return { step: 'details_started', stepNumber: 3, totalSteps }
  }
  
  if (hasService) {
    return { step: 'service_selected', stepNumber: 2, totalSteps }
  }
  
  return { step: 'chat_opened', stepNumber: 1, totalSteps }
}

// =============================================================================
// CLIENT-SIDE HELPERS
// =============================================================================

/**
 * Generate a session ID for tracking
 */
export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `intake_${crypto.randomUUID()}`
  }
  return `intake_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}
