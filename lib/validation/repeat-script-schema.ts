/**
 * Canonical JSONB schema for repeat script AMT payload
 * Single source of truth for repeat-script answers stored in request_answers.answers
 */

// Canonical keys for repeat script medication data
export interface RepeatScriptMedicationPayload {
  // Required fields
  amt_code: string // AMT SNOMED CT code - required
  medication_display: string // Full AMT display string - required
  medication_name: string // Parsed medication name - required
  prescribed_before: boolean // Must be true for repeat scripts
  dose_changed: boolean // Must be false for repeat scripts

  // Optional fields
  medication_strength?: string | null
  medication_form?: string | null
}

// Full repeat script answers payload
export interface RepeatScriptAnswersPayload extends RepeatScriptMedicationPayload {
  // Clinical details (optional but expected)
  condition?: string
  otherCondition?: string
  duration?: string
  control?: string
  sideEffects?: string
  notes?: string
  safetyAnswers?: Record<string, boolean | null>
}

// S8 blocked terms for server-side validation
export const BLOCKED_S8_TERMS = [
  "oxycodone", "oxycontin", "endone", "targin",
  "morphine", "ms contin", "kapanol",
  "fentanyl", "durogesic", "abstral",
  "hydromorphone", "dilaudid", "jurnista",
  "methadone", "physeptone",
  "buprenorphine", "suboxone", "subutex", "temgesic",
  "dexamphetamine", "dexedrine",
  "lisdexamfetamine", "vyvanse",
  "methylphenidate", "ritalin", "concerta",
  "ketamine",
  "alprazolam", "xanax",
  "diazepam", "valium",
  "clonazepam", "rivotril",
  "temazepam", "temaze", "normison",
  "oxazepam", "serepax",
  "lorazepam", "ativan",
  "nitrazepam", "mogadon",
  "zolpidem", "stilnox",
  "zopiclone", "imovane",
  "codeine phosphate", "codeine linctus",
] as const

// S8 example list for disclaimers (shorter, user-facing)
export const S8_DISCLAIMER_EXAMPLES = [
  "dexamphetamine",
  "methylphenidate",
  "lisdexamfetamine",
  "oxycodone",
  "morphine",
  "fentanyl",
  "buprenorphine",
  "methadone",
  "ketamine",
  "alprazolam",
] as const

/**
 * Check if text contains blocked S8 substance
 */
export function containsBlockedSubstance(text: string): boolean {
  const lower = text.toLowerCase()
  return BLOCKED_S8_TERMS.some(term => lower.includes(term))
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  requiresConsult?: boolean
}

/**
 * Validate repeat script medication payload
 * Returns validation result with error message if invalid
 */
export function validateRepeatScriptPayload(
  answers: Record<string, unknown>
): ValidationResult {
  // Check required AMT fields
  const amtCode = answers.amt_code
  const medicationDisplay = answers.medication_display
  const medicationName = answers.medication_name

  if (!amtCode || typeof amtCode !== "string" || amtCode.trim() === "") {
    return {
      valid: false,
      error: "Select a medication from the list. Free-text entries are not accepted for repeat scripts.",
      requiresConsult: false,
    }
  }

  if (!medicationDisplay || typeof medicationDisplay !== "string" || medicationDisplay.trim() === "") {
    return {
      valid: false,
      error: "Select a medication from the list. Free-text entries are not accepted for repeat scripts.",
      requiresConsult: false,
    }
  }

  if (!medicationName || typeof medicationName !== "string" || medicationName.trim() === "") {
    return {
      valid: false,
      error: "Invalid medication selection. Please select again from the list.",
      requiresConsult: false,
    }
  }

  // Check gating questions
  const prescribedBefore = answers.prescribed_before
  const doseChanged = answers.dose_changed

  if (typeof prescribedBefore !== "boolean") {
    return {
      valid: false,
      error: "Please confirm whether you have been prescribed this medication before.",
      requiresConsult: false,
    }
  }

  if (prescribedBefore !== true) {
    return {
      valid: false,
      error: "New medications require a General Consult. Please book a consultation.",
      requiresConsult: true,
    }
  }

  if (typeof doseChanged !== "boolean") {
    return {
      valid: false,
      error: "Please confirm whether your dose has changed.",
      requiresConsult: false,
    }
  }

  if (doseChanged !== false) {
    return {
      valid: false,
      error: "Dose changes require a General Consult. Please book a consultation.",
      requiresConsult: true,
    }
  }

  // Defense in depth: block S8 terms
  if (containsBlockedSubstance(String(medicationDisplay)) || containsBlockedSubstance(String(medicationName))) {
    return {
      valid: false,
      error: "Schedule 8 and controlled substances cannot be prescribed through this service. Please see your regular GP.",
      requiresConsult: false,
    }
  }

  return { valid: true }
}

// Legacy key mappings for backward compatibility
const LEGACY_KEY_MAPPINGS: Record<string, string> = {
  // Map old key names to canonical keys
  amtCode: "amt_code",
  medicationDisplay: "medication_display",
  medicationName: "medication_name",
  medication: "medication_name",
  medicationStrength: "medication_strength",
  strength: "medication_strength",
  medicationForm: "medication_form",
  form: "medication_form",
  prescribedBefore: "prescribed_before",
  doseChanged: "dose_changed",
}

/**
 * Map legacy JSONB keys to canonical keys
 * Use this when reading stored answers to ensure backward compatibility
 */
export function mapLegacyAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = { ...answers }

  for (const [legacyKey, canonicalKey] of Object.entries(LEGACY_KEY_MAPPINGS)) {
    // If legacy key exists and canonical doesn't, copy value
    if (legacyKey in answers && !(canonicalKey in answers)) {
      mapped[canonicalKey] = answers[legacyKey]
    }
  }

  return mapped
}

/**
 * Extract structured medication data from answers with backward compatibility
 */
export function extractMedicationFromAnswers(
  answers: Record<string, unknown>
): RepeatScriptMedicationPayload | null {
  const mapped = mapLegacyAnswers(answers)

  const amtCode = mapped.amt_code
  const medicationDisplay = mapped.medication_display
  const medicationName = mapped.medication_name

  // Must have at least amt_code and display
  if (!amtCode || !medicationDisplay) {
    return null
  }

  return {
    amt_code: String(amtCode),
    medication_display: String(medicationDisplay),
    medication_name: String(medicationName || ""),
    medication_strength: mapped.medication_strength != null ? String(mapped.medication_strength) : null,
    medication_form: mapped.medication_form != null ? String(mapped.medication_form) : null,
    prescribed_before: mapped.prescribed_before === true,
    dose_changed: mapped.dose_changed === true,
  }
}
