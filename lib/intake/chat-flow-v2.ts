/**
 * Chat Flow V2 — Optimized Conversational Intake
 * 
 * Intent-first routing, one question per turn, button-heavy UX.
 * See docs/CHATBOT_INTAKE_UX_DESIGN.md for full specification.
 */

// =============================================================================
// TYPES
// =============================================================================

export type Intent = 
  | 'medical_certificate' 
  | 'repeat_prescription' 
  | 'new_prescription' 
  | 'general_consult' 
  | 'unsure'
  | null

export type SafetyExitType = 
  | 'emergency' 
  | 'crisis' 
  | 'controlled_substance' 
  | 'long_certificate'
  | null

export interface ButtonOption {
  label: string
  value: string
  emoji?: string
}

export interface ChatStep {
  id: string
  message: string
  inputType: 'buttons' | 'chips' | 'text' | 'date' | 'medication_search'
  buttons?: ButtonOption[]
  placeholder?: string
  maxLength?: number
  multiSelect?: boolean
  field: string
  nextStep: string | ((value: unknown, state: IntakeState) => string)
  safetyCheck?: (value: unknown, state: IntakeState) => SafetyExitType
}

export interface IntakeState {
  intent: Intent
  step: string
  data: IntakeData
  safetyFlags: string[]
  ready: boolean
  exitType: SafetyExitType
}

export interface IntakeData {
  // Medical Certificate
  certType?: 'work' | 'uni' | 'carer'
  duration?: string
  dateFrom?: string
  symptoms?: string[]
  otherSymptom?: string
  
  // Prescription
  medication?: string
  pbsCode?: string
  medicationDuration?: string
  controlLevel?: string
  recentChanges?: string
  lastReview?: string
  
  // Consult
  concern?: string
  urgency?: string
  consultType?: string
  
  // Carer-specific
  carerName?: string
  carerRelation?: string
}

// =============================================================================
// BUTTON SETS
// =============================================================================

export const INTENT_BUTTONS: ButtonOption[] = [
  { label: 'Medical Certificate', value: 'medical_certificate', emoji: '📋' },
  { label: 'Repeat Prescription', value: 'repeat_prescription', emoji: '💊' },
  { label: 'New Prescription', value: 'new_prescription', emoji: '➕' },
  { label: 'GP Consult', value: 'general_consult', emoji: '👨‍⚕️' },
  { label: 'Not sure', value: 'unsure' },
]

export const CLARIFY_BUTTONS: ButtonOption[] = [
  { label: "I'm unwell and need time off", value: 'medical_certificate' },
  { label: 'I need a medication refill', value: 'repeat_prescription' },
  { label: 'I have a new health concern', value: 'general_consult' },
  { label: 'Something else', value: 'general_consult' },
]

export const CERT_TYPE_BUTTONS: ButtonOption[] = [
  { label: 'Work', value: 'work', emoji: '💼' },
  { label: 'Uni/School', value: 'uni', emoji: '📚' },
  { label: "Carer's leave", value: 'carer', emoji: '❤️' },
]

export const DURATION_BUTTONS: ButtonOption[] = [
  { label: 'Today only', value: '1' },
  { label: '2 days', value: '2' },
  { label: '3 days', value: '3' },
  { label: '4+ days', value: '4+' },
]

export const DATE_BUTTONS: ButtonOption[] = [
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'Pick a date', value: 'custom' },
]

export const SYMPTOM_CHIPS: ButtonOption[] = [
  { label: 'Cold/Flu', value: 'cold_flu', emoji: '🤧' },
  { label: 'Gastro', value: 'gastro', emoji: '🤢' },
  { label: 'Migraine', value: 'migraine', emoji: '🤕' },
  { label: 'Fatigue', value: 'fatigue', emoji: '😴' },
  { label: 'Period pain', value: 'period_pain' },
  { label: 'Mental health day', value: 'mental_health', emoji: '🧠' },
  { label: 'Other', value: 'other' },
]

export const CARER_RELATION_BUTTONS: ButtonOption[] = [
  { label: 'Child', value: 'child' },
  { label: 'Parent', value: 'parent' },
  { label: 'Partner', value: 'partner' },
  { label: 'Other family', value: 'other_family' },
]

export const SAFETY_CHECK_BUTTONS: ButtonOption[] = [
  { label: 'None of these apply', value: 'none' },
  { label: 'One of these applies', value: 'flagged' },
]

export const MEDICATION_DURATION_BUTTONS: ButtonOption[] = [
  { label: 'Under 3 months', value: 'under_3m' },
  { label: '3–12 months', value: '3_12m' },
  { label: 'Over 1 year', value: 'over_1y' },
]

export const CONTROL_BUTTONS: ButtonOption[] = [
  { label: 'Well controlled', value: 'well' },
  { label: 'Could be better', value: 'partial' },
  { label: 'Not well', value: 'poor' },
]

export const CHANGES_BUTTONS: ButtonOption[] = [
  { label: 'No changes', value: 'no' },
  { label: 'Yes, some changes', value: 'yes' },
]

export const LAST_REVIEW_BUTTONS: ButtonOption[] = [
  { label: 'Within 6 months', value: 'under_6m' },
  { label: '6–12 months ago', value: '6_12m' },
  { label: 'Over 1 year ago', value: 'over_1y' },
]

export const URGENCY_BUTTONS: ButtonOption[] = [
  { label: 'I need help today', value: 'urgent' },
  { label: 'Within a few days', value: 'soon' },
  { label: 'Routine question', value: 'routine' },
]

export const CONSULT_TYPE_BUTTONS: ButtonOption[] = [
  { label: 'Video call', value: 'video' },
  { label: 'Phone call', value: 'phone' },
  { label: 'Async (doctor reviews + responds)', value: 'async' },
]

export const CONFIRM_BUTTONS: ButtonOption[] = [
  { label: 'Submit for review', value: 'submit' },
  { label: 'Edit details', value: 'edit' },
]

export const YES_NO_BUTTONS: ButtonOption[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
]

// =============================================================================
// SAFETY EXIT MESSAGES (Not AI-generated)
// =============================================================================

export const SAFETY_MESSAGES = {
  emergency: {
    message: `This sounds like a medical emergency. Please call 000 now or go to your nearest emergency department.

InstantMed cannot help with emergencies.`,
    buttons: [{ label: 'Call 000', value: 'call_000' }],
    terminates: true,
  },
  
  crisis: {
    message: `I hear you're going through something difficult. Please reach out now:

• Lifeline: 13 11 14 (24/7)
• Beyond Blue: 1300 22 4636

You don't have to face this alone.`,
    buttons: [{ label: 'Call Lifeline', value: 'call_lifeline' }],
    terminates: true,
  },
  
  controlled_substance: {
    message: `This medication cannot be prescribed online. Schedule 8 and controlled medications require an in-person GP visit for safety reasons.`,
    buttons: [
      { label: 'Try a different medication', value: 'retry' },
      { label: 'Exit', value: 'exit' },
    ],
    terminates: false,
  },
  
  long_certificate: {
    message: `Certificates over 3 days may need more clinical detail. A doctor will review your request and may follow up with questions.`,
    buttons: [
      { label: 'Continue with request', value: 'continue' },
      { label: 'Book a GP consult instead', value: 'consult' },
    ],
    terminates: false,
  },
} as const

// =============================================================================
// FLOW DEFINITIONS
// =============================================================================

export const CHAT_FLOWS: Record<string, ChatStep[]> = {
  // Intent detection
  intent: [
    {
      id: 'intent_ask',
      message: 'Hi. What do you need today?',
      inputType: 'buttons',
      buttons: INTENT_BUTTONS,
      field: 'intent',
      nextStep: (value) => {
        if (value === 'unsure') return 'intent_clarify'
        if (value === 'medical_certificate') return 'medcert_type'
        if (value === 'repeat_prescription') return 'rx_medication'
        if (value === 'new_prescription') return 'consult_concern'
        return 'consult_concern'
      },
    },
    {
      id: 'intent_clarify',
      message: 'No problem. Which best describes your situation?',
      inputType: 'buttons',
      buttons: CLARIFY_BUTTONS,
      field: 'intent',
      nextStep: (value) => {
        if (value === 'medical_certificate') return 'medcert_type'
        if (value === 'repeat_prescription') return 'rx_medication'
        return 'consult_concern'
      },
    },
  ],
  
  // Medical Certificate flow
  medcert: [
    {
      id: 'medcert_type',
      message: "What's the certificate for?",
      inputType: 'buttons',
      buttons: CERT_TYPE_BUTTONS,
      field: 'certType',
      nextStep: (value) => value === 'carer' ? 'medcert_carer_name' : 'medcert_duration',
    },
    {
      id: 'medcert_carer_name',
      message: "What's the name of the person you're caring for?",
      inputType: 'text',
      placeholder: 'Their full name',
      maxLength: 100,
      field: 'carerName',
      nextStep: 'medcert_carer_relation',
    },
    {
      id: 'medcert_carer_relation',
      message: 'Your relationship to them?',
      inputType: 'buttons',
      buttons: CARER_RELATION_BUTTONS,
      field: 'carerRelation',
      nextStep: 'medcert_duration',
    },
    {
      id: 'medcert_duration',
      message: 'How many days do you need?',
      inputType: 'buttons',
      buttons: DURATION_BUTTONS,
      field: 'duration',
      nextStep: 'medcert_date',
      safetyCheck: (value) => value === '4+' ? 'long_certificate' : null,
    },
    {
      id: 'medcert_date',
      message: 'Starting from?',
      inputType: 'buttons',
      buttons: DATE_BUTTONS,
      field: 'dateFrom',
      nextStep: (value) => value === 'custom' ? 'medcert_date_picker' : 'medcert_symptoms',
    },
    {
      id: 'medcert_date_picker',
      message: 'Select the start date.',
      inputType: 'date',
      field: 'dateFrom',
      nextStep: 'medcert_symptoms',
    },
    {
      id: 'medcert_symptoms',
      message: 'Main symptoms? Tap all that apply.',
      inputType: 'chips',
      buttons: SYMPTOM_CHIPS,
      multiSelect: true,
      field: 'symptoms',
      nextStep: (value) => {
        const arr = value as string[]
        return arr.includes('other') ? 'medcert_other_symptom' : 'medcert_safety'
      },
    },
    {
      id: 'medcert_other_symptom',
      message: 'Briefly describe your symptoms.',
      inputType: 'text',
      placeholder: 'e.g. sore throat and body aches',
      maxLength: 200,
      field: 'otherSymptom',
      nextStep: 'medcert_safety',
    },
    {
      id: 'medcert_safety',
      message: `Quick check — are any of these true?

• Symptoms started suddenly with severe pain
• Chest tightness or shortness of breath
• Fainted or feeling faint`,
      inputType: 'buttons',
      buttons: SAFETY_CHECK_BUTTONS,
      field: 'safetyCheck',
      nextStep: (value) => value === 'flagged' ? 'medcert_safety_warning' : 'medcert_confirm',
      safetyCheck: (value) => value === 'flagged' ? 'emergency' : null,
    },
    {
      id: 'medcert_safety_warning',
      message: `These symptoms may need urgent attention. Please call 000 or visit your nearest emergency department.

If your symptoms are different from the above, you can continue.`,
      inputType: 'buttons',
      buttons: [
        { label: 'My symptoms are different — continue', value: 'continue' },
      ],
      field: 'safetyAcknowledged',
      nextStep: 'medcert_confirm',
    },
    {
      id: 'medcert_confirm',
      message: '', // Generated dynamically
      inputType: 'buttons',
      buttons: CONFIRM_BUTTONS,
      field: 'confirmed',
      nextStep: (value) => value === 'edit' ? 'medcert_type' : 'complete',
    },
  ],
  
  // Repeat Prescription flow
  rx: [
    {
      id: 'rx_medication',
      message: 'What medication do you need refilled?',
      inputType: 'medication_search',
      placeholder: 'Start typing medication name...',
      field: 'medication',
      nextStep: 'rx_duration',
    },
    {
      id: 'rx_duration',
      message: 'How long have you been on this medication?',
      inputType: 'buttons',
      buttons: MEDICATION_DURATION_BUTTONS,
      field: 'medicationDuration',
      nextStep: 'rx_control',
      safetyCheck: (value) => value === 'under_3m' ? 'long_certificate' : null, // Soft redirect
    },
    {
      id: 'rx_control',
      message: 'How well is your condition controlled?',
      inputType: 'buttons',
      buttons: CONTROL_BUTTONS,
      field: 'controlLevel',
      nextStep: 'rx_changes',
    },
    {
      id: 'rx_changes',
      message: 'Any recent changes to your health or other medications?',
      inputType: 'buttons',
      buttons: CHANGES_BUTTONS,
      field: 'recentChanges',
      nextStep: (value) => value === 'yes' ? 'rx_changes_detail' : 'rx_last_review',
    },
    {
      id: 'rx_changes_detail',
      message: 'Briefly describe what changed.',
      inputType: 'text',
      placeholder: 'e.g. started a new medication',
      maxLength: 200,
      field: 'recentChanges',
      nextStep: 'rx_last_review',
    },
    {
      id: 'rx_last_review',
      message: 'When did you last see a doctor about this?',
      inputType: 'buttons',
      buttons: LAST_REVIEW_BUTTONS,
      field: 'lastReview',
      nextStep: 'rx_confirm',
    },
    {
      id: 'rx_confirm',
      message: '', // Generated dynamically
      inputType: 'buttons',
      buttons: CONFIRM_BUTTONS,
      field: 'confirmed',
      nextStep: (value) => value === 'edit' ? 'rx_medication' : 'complete',
    },
  ],
  
  // General Consult flow
  consult: [
    {
      id: 'consult_concern',
      message: 'What would you like to discuss with a doctor?',
      inputType: 'text',
      placeholder: 'Describe your concern briefly...',
      maxLength: 300,
      field: 'concern',
      nextStep: 'consult_urgency',
    },
    {
      id: 'consult_urgency',
      message: 'How urgent is this?',
      inputType: 'buttons',
      buttons: URGENCY_BUTTONS,
      field: 'urgency',
      nextStep: 'consult_type',
    },
    {
      id: 'consult_type',
      message: 'Preference for your consult?',
      inputType: 'buttons',
      buttons: CONSULT_TYPE_BUTTONS,
      field: 'consultType',
      nextStep: 'consult_confirm',
    },
    {
      id: 'consult_confirm',
      message: '', // Generated dynamically
      inputType: 'buttons',
      buttons: CONFIRM_BUTTONS,
      field: 'confirmed',
      nextStep: (value) => value === 'edit' ? 'consult_concern' : 'complete',
    },
  ],
}

// =============================================================================
// FLOW ENGINE
// =============================================================================

export function getStepById(stepId: string): ChatStep | null {
  for (const flowSteps of Object.values(CHAT_FLOWS)) {
    const step = flowSteps.find(s => s.id === stepId)
    if (step) return step
  }
  return null
}

export function getNextStepId(
  currentStep: ChatStep,
  value: unknown,
  state: IntakeState
): string {
  if (typeof currentStep.nextStep === 'function') {
    return currentStep.nextStep(value, state)
  }
  return currentStep.nextStep
}

export function checkSafetyExit(
  step: ChatStep,
  value: unknown,
  state: IntakeState
): SafetyExitType {
  if (step.safetyCheck) {
    return step.safetyCheck(value, state)
  }
  return null
}

export function generateConfirmationMessage(state: IntakeState): string {
  const { intent, data } = state
  
  if (intent === 'medical_certificate') {
    const type = data.certType === 'work' ? 'Work' : data.certType === 'uni' ? 'Uni/School' : "Carer's"
    const duration = data.duration === '1' ? 'today only' : `${data.duration} days`
    const date = data.dateFrom === 'today' ? 'from today' : data.dateFrom === 'tomorrow' ? 'from tomorrow' : `from ${data.dateFrom}`
    const symptoms = Array.isArray(data.symptoms) ? data.symptoms.join(', ') : data.symptoms
    
    return `Ready to submit:
• ${type} certificate, ${duration} ${date}
• Symptoms: ${symptoms}${data.otherSymptom ? ` (${data.otherSymptom})` : ''}`
  }
  
  if (intent === 'repeat_prescription') {
    return `Ready to submit:
• ${data.medication}
• Taking for: ${data.medicationDuration?.replace('_', ' ')}
• ${data.controlLevel === 'well' ? 'Well controlled' : data.controlLevel === 'partial' ? 'Partially controlled' : 'Needs review'}`
  }
  
  if (intent === 'general_consult') {
    const urgencyLabel = data.urgency === 'urgent' ? 'Today' : data.urgency === 'soon' ? 'Within a few days' : 'Routine'
    const typeLabel = data.consultType === 'video' ? 'Video call' : data.consultType === 'phone' ? 'Phone call' : 'Async review'
    
    return `Ready to book:
• Online consult
• ${urgencyLabel}
• ${typeLabel}`
  }
  
  return 'Ready to submit your request.'
}

export function createInitialState(): IntakeState {
  return {
    intent: null,
    step: 'intent_ask',
    data: {},
    safetyFlags: [],
    ready: false,
    exitType: null,
  }
}

export function formatButtonsForAI(buttons: ButtonOption[]): string {
  return buttons.map(b => `[${b.emoji ? `${b.emoji} ` : ''}${b.label}]`).join(' ')
}
