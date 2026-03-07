/**
 * AI Collection Boundaries
 * 
 * Defines what the AI intake assistant CAN and CANNOT do.
 * These boundaries are enforced at the prompt level and validated server-side.
 * 
 * REGULATORY CONTEXT:
 * - AI is an administrative tool, not a clinical decision-maker
 * - All clinical decisions made by registered medical practitioners
 * - AI output is advisory/informational only
 */

// =============================================================================
// AI CAN DO (Administrative Data Collection)
// =============================================================================

export const AI_PERMITTED_ACTIONS = {
  // Data collection
  COLLECT_SYMPTOMS: 'Ask patient to describe symptoms using structured categories',
  COLLECT_DURATION: 'Ask how long symptoms have been present',
  COLLECT_SEVERITY: 'Ask patient to rate severity (mild/moderate/severe)',
  COLLECT_MEDICATION_NAME: 'Ask what medication patient needs refilled',
  COLLECT_TREATMENT_HISTORY: 'Ask how long patient has been on medication',
  COLLECT_PREFERENCES: 'Ask patient preferences for consult type/time',
  
  // Structured presentation
  PRESENT_OPTIONS: 'Present multiple-choice options for answers',
  SUMMARIZE_INPUT: 'Summarize what patient has provided (without interpretation)',
  REQUEST_CLARIFICATION: 'Ask patient to clarify ambiguous responses',
  
  // Safety flagging (pattern detection, not diagnosis)
  FLAG_EMERGENCY_KEYWORDS: 'Detect and flag emergency symptom keywords',
  FLAG_CONTROLLED_SUBSTANCES: 'Detect and flag controlled substance requests',
  FLAG_DURATION_CONCERNS: 'Flag unusually long certificate requests',
  FLAG_COMPLIANCE_CONCERNS: 'Flag reported poor medication compliance',
  
  // Administrative
  EXPLAIN_PROCESS: 'Explain what will happen next in the process',
  EXPLAIN_LIMITATIONS: 'Explain what cannot be done via telehealth',
  PROVIDE_WAIT_TIMES: 'Provide estimated review wait times',
} as const

// =============================================================================
// AI CANNOT DO (Clinical Decision-Making)
// =============================================================================

export const AI_PROHIBITED_ACTIONS = {
  // Clinical interpretation
  DIAGNOSE: 'AI cannot diagnose conditions or suggest diagnoses',
  INTERPRET_SYMPTOMS: 'AI cannot interpret what symptoms mean clinically',
  ASSESS_SEVERITY_CLINICALLY: 'AI cannot assess clinical severity (only collect patient-reported)',
  TRIAGE_CLINICALLY: 'AI cannot make clinical triage decisions',
  
  // Treatment decisions
  RECOMMEND_MEDICATIONS: 'AI cannot recommend specific medications',
  SUGGEST_DOSAGES: 'AI cannot suggest medication dosages',
  ADVISE_TREATMENT: 'AI cannot advise on treatment approaches',
  COMPARE_TREATMENTS: 'AI cannot compare treatment effectiveness',
  
  // Outcome predictions
  PREDICT_APPROVAL: 'AI cannot predict if request will be approved',
  GUARANTEE_OUTCOMES: 'AI cannot guarantee any clinical outcomes',
  ESTIMATE_RECOVERY: 'AI cannot estimate recovery times',
  
  // Scope creep
  ANSWER_MEDICAL_QUESTIONS: 'AI cannot answer general medical questions',
  PROVIDE_HEALTH_ADVICE: 'AI cannot provide health or lifestyle advice',
  INTERPRET_TEST_RESULTS: 'AI cannot interpret lab or test results',
  SECOND_GUESS_DOCTORS: 'AI cannot question or override doctor decisions',
} as const

// =============================================================================
// BOUNDARY ENFORCEMENT PROMPTS
// =============================================================================

export const BOUNDARY_ENFORCEMENT_PROMPT = `
CRITICAL BOUNDARIES — YOU MUST FOLLOW THESE:

YOU ARE:
- An administrative intake assistant
- A data collector, not a clinician
- Presenting options, not making recommendations

YOU MUST NOT:
- Diagnose or suggest diagnoses
- Interpret what symptoms mean
- Recommend medications or treatments
- Predict if requests will be approved
- Answer general medical questions
- Provide health advice

WHEN ASKED MEDICAL QUESTIONS, RESPOND:
"I'm here to collect information for your request. A doctor will review everything and can answer medical questions. What information can I help gather for your [certificate/prescription/consult]?"

WHEN ASKED TO RECOMMEND:
"I can't recommend specific treatments — that's for the doctor to decide based on your full medical history. I can note any preferences you have for the doctor to consider."

WHEN SYMPTOMS SEEM SERIOUS:
Flag the severity in the structured data but DO NOT interpret. The doctor will assess clinical significance.
`

// =============================================================================
// HANDOFF PROTOCOL
// =============================================================================

export interface HandoffProtocol {
  trigger: string
  action: 'flag' | 'escalate' | 'terminate' | 'transition'
  message: string
  doctorNote?: string
}

export const HANDOFF_PROTOCOLS: HandoffProtocol[] = [
  // Emergency escalation
  {
    trigger: 'emergency_keywords_detected',
    action: 'terminate',
    message: 'This sounds like a medical emergency. Please call 000 or go to your nearest emergency department immediately.',
    doctorNote: 'EMERGENCY KEYWORDS DETECTED — Patient directed to 000/ED',
  },
  
  // Crisis escalation
  {
    trigger: 'crisis_keywords_detected',
    action: 'terminate',
    message: 'I hear that you\'re going through a difficult time. Please reach out to Lifeline (13 11 14) or Beyond Blue (1300 22 4636) for immediate support.',
    doctorNote: 'CRISIS INDICATORS — Patient directed to mental health crisis services',
  },
  
  // Controlled substance block
  {
    trigger: 'controlled_substance_requested',
    action: 'terminate',
    message: 'This medication cannot be prescribed through our online service. Schedule 8 and controlled medications require an in-person consultation with your regular GP.',
    doctorNote: 'BLOCKED — Controlled substance request',
  },
  
  // Form transition
  {
    trigger: 'complex_intake_detected',
    action: 'transition',
    message: 'This request needs a bit more detail. I\'ll take you to a form that captures everything the doctor needs.',
    doctorNote: 'Complex case — transitioned to detailed form intake',
  },
  
  // Out of scope
  {
    trigger: 'out_of_scope_request',
    action: 'terminate',
    message: 'This type of request requires an in-person consultation. Our online service isn\'t able to help with this, but your regular GP or a local clinic can assist.',
    doctorNote: 'OUT OF SCOPE — Patient advised to seek in-person care',
  },
  
  // Specialist required
  {
    trigger: 'specialist_referral_needed',
    action: 'flag',
    message: 'I\'ve noted this in your intake. The doctor may recommend a specialist referral based on what you\'ve described.',
    doctorNote: 'FLAG: May require specialist referral',
  },
]

// =============================================================================
// QUESTION FRAMING RULES
// =============================================================================

export const QUESTION_FRAMING = {
  // Always use these framings
  PREFERRED: [
    'What symptoms are you experiencing?', // Not: What do you think is wrong?
    'How would you describe the severity?', // Not: How serious is this?
    'What medication were you hoping to refill?', // Not: What medication do you need?
    'How long have you had these symptoms?', // Not: When did this start?
    'Is there anything else you\'d like the doctor to know?', // Not: Any other concerns?
  ],
  
  // Never use these framings
  PROHIBITED: [
    'What do you think you have?',
    'Do you think you need antibiotics?',
    'That sounds like it could be...',
    'You probably have...',
    'You should take...',
    'I recommend...',
    'That\'s definitely...',
    'Don\'t worry, it\'s just...',
  ],
}

// =============================================================================
// DATA SANITIZATION
// =============================================================================

export function sanitizeForDoctorReview(text: string): string {
  // Remove any AI interpretations that may have slipped through
  const interpretationPatterns = [
    /this (sounds|seems|appears|looks) like/gi,
    /you (probably|likely|might) have/gi,
    /I (think|believe|suspect)/gi,
    /this is (probably|likely)/gi,
    /diagnosis:/gi,
    /my assessment:/gi,
  ]
  
  let sanitized = text
  for (const pattern of interpretationPatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED - AI interpretation removed]')
  }
  
  return sanitized
}

// =============================================================================
// AUDIT TRAIL
// =============================================================================

export interface AIActionAudit {
  timestamp: string
  action: string
  permitted: boolean
  boundaryChecked: keyof typeof AI_PERMITTED_ACTIONS | keyof typeof AI_PROHIBITED_ACTIONS
  input?: string
  output?: string
}

export function logAIAction(
  action: string,
  permitted: boolean,
  boundary: string,
  input?: string,
  output?: string
): AIActionAudit {
  return {
    timestamp: new Date().toISOString(),
    action,
    permitted,
    boundaryChecked: boundary as keyof typeof AI_PERMITTED_ACTIONS,
    input: input?.slice(0, 500), // Truncate for storage
    output: output?.slice(0, 500),
  }
}
