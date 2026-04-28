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
  checkAutoReject,
  checkEmergencySymptoms,
  checkRedFlagPatterns,
} from "./triage-rules-engine"
import {
  AUTO_REJECT_RULES,
  type AutoRejectCategory,
  type ClinicalFlag,
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

/**
 * AUDIT FIX: Quick-check regex subset of emergency patterns for client-side validation.
 * The canonical comprehensive keyword list lives in triage-rules-engine.ts (EMERGENCY_KEYWORDS).
 * This list uses regex patterns with user-facing messages for real-time form validation.
 * Keep these categories aligned with EMERGENCY_KEYWORDS - any new category there should have
 * a corresponding pattern here.
 */
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
  // AUDIT FIX: Added anaphylaxis and choking - were in EMERGENCY_KEYWORDS but missing here
  { pattern: /anaphylax/i, message: "Severe allergic reaction - call 000 immediately" },
  { pattern: /choking/i, message: "Choking requires immediate emergency care" },
  { pattern: /throat\s*clos/i, message: "Throat closing - call 000 immediately" },
]

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Hard cap on med-cert duration for any non-in-person consultation.
 * Anything longer must be issued in person — this is the policy ceiling,
 * not a per-patient ceiling that can be raised via flags.
 */
export const MAX_MED_CERT_DURATION_DAYS = 3

/**
 * High-stakes use cases that warrant a hard block at intake time, not just
 * a non-auto-approve flag. Mirrors HIGH_STAKES_USE_CASE_KEYWORDS in
 * auto-approval.ts but is also surfaced to the client for early UX feedback.
 */
const HIGH_STAKES_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(exam|examination|deferral|defer|deferred|special\s+consideration|supplementary)\b/i, reason: "Exam deferrals and special consideration require a face-to-face assessment your university or institution can arrange." },
  { pattern: /\b(court|hearing|tribunal|summons|subpoena|jury)\b/i, reason: "Certificates for court matters require an in-person assessment." },
  { pattern: /\b(custody|family\s+law|intervention\s+order|avo)\b/i, reason: "Family law matters require an in-person assessment." },
  { pattern: /\b(driving|drive|licence|license|rta|firearm|gun\s+licence|gun\s+license|shooting|fitness\s+to\s+fly)\b/i, reason: "Fitness-for-driving, firearm or aviation determinations require an in-person assessment by an accredited assessor." },
  { pattern: /\b(workers?\s*comp|workcover|insurance\s+claim|ndis|tac)\b/i, reason: "Certificates for workers' compensation or insurance claims require an in-person assessment." },
]

export interface HighStakesCheck {
  isHighStakes: boolean
  reason?: string
  matched?: string
}

export function checkHighStakesUseCase(text: string | null | undefined): HighStakesCheck {
  if (!text) return { isHighStakes: false }
  for (const { pattern, reason } of HIGH_STAKES_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return { isHighStakes: true, reason, matched: match[0] }
    }
  }
  return { isHighStakes: false }
}

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

  // High-stakes use cases (exam deferral, court, fitness-to-drive, firearms,
  // workers comp, etc.) — block at intake. We do not issue certificates for
  // these via async telehealth; refer the patient to in-person assessment.
  const highStakes = checkHighStakesUseCase(freeTextSymptoms)
  if (highStakes.isHighStakes) {
    return {
      canProceed: false,
      requiresRedirection: true,
      redirectionCategory: "outside_gp_scope",
      redirectionMessage: highStakes.reason,
      redirectionAdvice: "Please book an in-person appointment with your regular GP or the relevant assessor. We're happy to help with general illness-based certificates if your situation changes.",
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

/**
 * CONTROLLED SUBSTANCE DISCLAIMER
 * Display this when a medication matches controlled substance patterns.
 * Per audit requirements: no fuzzy matching, just explicit disclaimer.
 */
export const CONTROLLED_SUBSTANCE_DISCLAIMER = {
  title: "This medication cannot be prescribed online",
  message: "Schedule 8 medications and commonly abused substances require an in-person consultation with your regular GP for patient safety and regulatory compliance.",
  blockedCategories: [
    "Schedule 8 (S8) opioids (e.g., oxycodone, morphine, fentanyl)",
    "Schedule 8 stimulants (e.g., dexamphetamine, methylphenidate)",
    "Benzodiazepines (e.g., diazepam, alprazolam, temazepam)",
    "Z-drugs (e.g., zolpidem, zopiclone)",
    "Medicinal cannabis products",
    "Testosterone and anabolic steroids",
  ],
  advice: "Please visit your regular GP or a bulk-billing clinic for these medications.",
}

/**
 * List of commonly abused/S8 medications for display purposes
 * Used in disclaimers and UI, not for matching (matching uses regex patterns below)
 */
export const COMMONLY_ABUSED_MEDICATIONS = [
  // S8 Opioids
  "Oxycodone (Endone, OxyContin, Targin)",
  "Morphine (MS Contin, Kapanol)",
  "Fentanyl (Durogesic)",
  "Tramadol",
  // S8 Stimulants  
  "Dexamphetamine (Vyvanse)",
  "Methylphenidate (Ritalin, Concerta)",
  // Benzodiazepines
  "Diazepam (Valium)",
  "Alprazolam (Xanax)",
  "Temazepam (Temaze)",
  "Clonazepam (Rivotril)",
  // Z-drugs
  "Zolpidem (Stilnox)",
  "Zopiclone (Imovane)",
  // Other
  "Medicinal cannabis (THC/CBD products)",
  "Testosterone (all forms)",
]

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
  
  return HIGH_RISK_FIRST_TIME_CATEGORIES.some(cat => new RegExp(`\\b${cat}\\b`, 'i').test(medicationName))
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
