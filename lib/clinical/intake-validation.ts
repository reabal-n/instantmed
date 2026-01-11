/**
 * Clinical Intake Validation
 * 
 * Pre-submission validation for intake flows.
 * Implements auto-reject rules from CLINICAL_BOUNDARIES_AND_DECISION_RULES.md
 * 
 * Use this to check for emergency symptoms, red flags, and other
 * conditions that require immediate redirection before intake submission.
 */

import {
  checkEmergencySymptoms,
  checkRedFlagPatterns,
  checkAutoReject,
} from "./triage-rules-engine"
import {
  type AutoRejectCategory,
  type ClinicalFlag,
  AUTO_REJECT_RULES,
} from "./triage-types"

// ============================================================================
// INTAKE VALIDATION RESULT
// ============================================================================

export interface IntakeValidationResult {
  canProceed: boolean
  requiresRedirection: boolean
  redirectionCategory?: AutoRejectCategory
  redirectionMessage?: string
  redirectionAdvice?: string
  warnings: string[]
  flags: ClinicalFlag[]
}

// ============================================================================
// EMERGENCY KEYWORDS FOR CLIENT-SIDE CHECK
// ============================================================================

export const EMERGENCY_SYMPTOM_PATTERNS = [
  { pattern: /chest\s*pain/i, message: "Chest pain requires immediate emergency care" },
  { pattern: /can'?t\s*breathe/i, message: "Difficulty breathing requires immediate emergency care" },
  { pattern: /severe\s*bleeding/i, message: "Severe bleeding requires immediate emergency care" },
  { pattern: /suicid/i, message: "If you're having thoughts of suicide, please call Lifeline 13 11 14 or 000" },
  { pattern: /self.?harm/i, message: "If you're thinking of hurting yourself, please call Lifeline 13 11 14" },
  { pattern: /heart\s*attack/i, message: "Suspected heart attack - call 000 immediately" },
  { pattern: /stroke/i, message: "Suspected stroke - call 000 immediately" },
  { pattern: /unconscious/i, message: "Unconsciousness requires immediate emergency care" },
  { pattern: /seizure/i, message: "Active seizures require immediate emergency care" },
  { pattern: /overdose/i, message: "Suspected overdose - call 000 immediately" },
]

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Quick client-side emergency check
 * Use this for real-time validation in intake forms
 */
export function quickEmergencyCheck(text: string): { isEmergency: boolean; message?: string } {
  const lowerText = text.toLowerCase()
  
  for (const { pattern, message } of EMERGENCY_SYMPTOM_PATTERNS) {
    if (pattern.test(lowerText)) {
      return { isEmergency: true, message }
    }
  }
  
  return { isEmergency: false }
}

/**
 * Full intake validation
 * Use this before intake submission
 */
export function validateIntake(input: {
  freeTextSymptoms?: string
  structuredAnswers?: Record<string, unknown>
  isControlledSubstance?: boolean
  isFirstTimeHighRisk?: boolean
  isOutsideScope?: boolean
}): IntakeValidationResult {
  const {
    freeTextSymptoms = "",
    isControlledSubstance = false,
    isFirstTimeHighRisk = false,
    isOutsideScope = false,
  } = input
  
  const warnings: string[] = []
  
  // Check for emergency symptoms
  const emergencyCheck = checkEmergencySymptoms(freeTextSymptoms)
  
  // Check for red flag patterns
  const flags = checkRedFlagPatterns(freeTextSymptoms)
  
  // Check auto-reject conditions
  const autoRejectCheck = checkAutoReject(
    flags,
    emergencyCheck,
    isControlledSubstance,
    isFirstTimeHighRisk,
    isOutsideScope
  )
  
  // If auto-rejected, return redirection
  if (autoRejectCheck.shouldReject && autoRejectCheck.category) {
    const rule = AUTO_REJECT_RULES[autoRejectCheck.category]
    return {
      canProceed: false,
      requiresRedirection: true,
      redirectionCategory: autoRejectCheck.category,
      redirectionMessage: rule.userMessage,
      redirectionAdvice: rule.redirectAdvice,
      warnings: [],
      flags,
    }
  }
  
  // Add warnings for non-blocking flags
  if (flags.length > 0) {
    const warningFlags = flags.filter(f => f.severity === "warning")
    for (const flag of warningFlags) {
      warnings.push(flag.description)
    }
  }
  
  return {
    canProceed: true,
    requiresRedirection: false,
    warnings,
    flags,
  }
}

// ============================================================================
// CONTROLLED SUBSTANCE CHECK
// ============================================================================

const CONTROLLED_SUBSTANCE_PATTERNS = [
  // S8 Opioids
  /oxycodone|oxycontin|endone|targin/i,
  /morphine|ms\s*contin|kapanol|sevredol/i,
  /fentanyl|durogesic|abstral|actiq/i,
  /hydromorphone|dilaudid|jurnista/i,
  /methadone|physeptone|biodone/i,
  /buprenorphine|suboxone|subutex|temgesic/i,
  /tramadol/i,
  
  // S8 Stimulants
  /dexamphetamine|dexedrine|vyvanse|lisdexamfetamine/i,
  /methylphenidate|ritalin|concerta/i,
  
  // Benzodiazepines
  /alprazolam|xanax|kalma/i,
  /diazepam|valium|antenex/i,
  /clonazepam|rivotril|paxam/i,
  /lorazepam|ativan/i,
  /oxazepam|serepax|murelax/i,
  /temazepam|temaze|normison/i,
  /nitrazepam|mogadon|alodorm/i,
  
  // Z-drugs
  /zolpidem|stilnox/i,
  /zopiclone|imovane/i,
  
  // Cannabis
  /cannabis|thc|cbd\s*oil|cannabidiol/i,
  /dronabinol|marinol|nabilone|sativex/i,
  
  // Testosterone
  /testosterone|androderm|testogel|primoteston|sustanon|reandron/i,
]

/**
 * Check if medication name matches controlled substance patterns
 */
export function isControlledSubstance(medicationName: string): boolean {
  const lowerName = medicationName.toLowerCase()
  return CONTROLLED_SUBSTANCE_PATTERNS.some(pattern => pattern.test(lowerName))
}

// ============================================================================
// HIGH RISK FIRST-TIME CHECK
// ============================================================================

const HIGH_RISK_FIRST_TIME_CATEGORIES = [
  "anticoagulant",
  "immunosuppressant",
  "antiepileptic",
  "antipsychotic",
  "lithium",
  "methotrexate",
  "insulin",
  "biologics",
]

/**
 * Check if this is a high-risk medication that requires in-person first prescription
 */
export function isHighRiskFirstTime(
  medicationName: string,
  isFirstPrescription: boolean
): boolean {
  if (!isFirstPrescription) return false
  
  const lowerName = medicationName.toLowerCase()
  return HIGH_RISK_FIRST_TIME_CATEGORIES.some(cat => lowerName.includes(cat))
}

// ============================================================================
// OUTSIDE GP SCOPE CHECK
// ============================================================================

const OUTSIDE_GP_SCOPE_PATTERNS = [
  /chemotherapy/i,
  /radiation\s*therapy/i,
  /dialysis/i,
  /organ\s*transplant/i,
  /surgical\s*procedure/i,
  /iv\s*infusion/i,
  /specialist\s*only/i,
]

/**
 * Check if request is outside GP scope
 */
export function isOutsideGPScope(description: string): boolean {
  return OUTSIDE_GP_SCOPE_PATTERNS.some(pattern => pattern.test(description))
}
