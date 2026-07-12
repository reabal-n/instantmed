/**
 * Canonical JSONB schema for repeat script AMT payload
 * Single source of truth for repeat-script answers stored in request_answers.answers
 */

import { CONTROLLED_SUBSTANCE_TERMS } from "@/lib/clinical/controlled-substances"
import { getRepeatRxAttestationStatus } from "@/lib/clinical/repeat-rx-attestation"
import {
  buildRepeatScriptMedicationValidationText,
  extractRepeatScriptMedications,
  isUsefulMedicationDescription,
  MAX_REPEAT_SCRIPT_MEDICATIONS,
} from "@/lib/validation/repeat-script-medications"

// Canonical keys for repeat script medication data
export interface RepeatScriptMedicationPayload {
  // Required fields
  amt_code: string // AMT SNOMED CT code - required
  medication_display: string // Full AMT display string - required
  medication_name: string // Parsed medication name - required
  prescribed_before: boolean // Must be true for repeat scripts
  dose_changed: boolean // Canonical mirror; raw doseChanged provenance is also required at checkout

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

// S8 blocked terms for server-side validation. Re-exported from the single
// shared controlled-substance list so this server blocklist can never diverge
// from the intake `isControlledSubstance` detector again (pre-2026-07 this
// local copy was missing tramadol, cannabis, testosterone, and several AU
// benzo brand names the intake layer blocked). Parity pinned by
// lib/__tests__/controlled-substances-parity.test.ts.
export const BLOCKED_S8_TERMS = CONTROLLED_SUBSTANCE_TERMS

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
 * Levenshtein distance for fuzzy matching - catches typo bypass attempts
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Check if text contains blocked S8 substance using fuzzy matching
 * Uses Levenshtein distance to catch typo bypass attempts (e.g., "oxycod0ne", "valiumm")
 */
export function containsBlockedSubstance(text: string): boolean {
  const lower = text.toLowerCase().trim()
  
  // Extract words from the text for individual checking
  const words = lower.split(/[\s,\-/]+/).filter(w => w.length >= 4)
  
  for (const term of BLOCKED_S8_TERMS) {
    const termLower = term.toLowerCase()
    
    // Exact substring match (original behavior)
    if (lower.includes(termLower)) {
      return true
    }
    
    // Fuzzy match each word against each term
    // Allow max 2 character difference for terms >= 6 chars, 1 for shorter
    const maxDistance = termLower.length >= 6 ? 2 : 1
    
    for (const word of words) {
      // Only compare words of similar length to avoid false positives
      if (Math.abs(word.length - termLower.length) <= maxDistance) {
        const distance = levenshteinDistance(word, termLower)
        if (distance <= maxDistance && distance > 0) {
          return true
        }
      }
    }
  }
  
  return false
}

/**
 * Check if a PBS code is for a Schedule 8 controlled substance
 * These codes are known S8 medications that should always be blocked
 */
export const BLOCKED_PBS_CODE_PREFIXES = [
  // Opioid PBS code patterns (simplified - actual implementation would use full code list)
  "2163", "2164", "2165", // Oxycodone family
  "2622", "2623", // Morphine family
  "1193", "1194", // Fentanyl patches
  "2095", "2096", // Buprenorphine
  "8178", "8179", // Dexamphetamine
  "8683", "8684", // Lisdexamfetamine (Vyvanse)
  "8401", "8402", // Methylphenidate
  // Benzodiazepines - note: most benzos are S4, but some high-risk ones tracked
  "2162", // Alprazolam
] as const

/**
 * Check if PBS code matches known blocked medication codes
 */
export function isPBSCodeBlocked(pbsCode: string | null | undefined): boolean {
  if (!pbsCode || pbsCode === "MANUAL") return false
  
  const code = pbsCode.toUpperCase().trim()
  return BLOCKED_PBS_CODE_PREFIXES.some(prefix => code.startsWith(prefix))
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
 * 
 * Accepts both PBS and AMT field naming conventions:
 * - pbs_code OR amt_code (also allows "MANUAL" for typed entries)
 * - medication_name OR medication_display
 */
export function validateRepeatScriptPayload(
  answers: Record<string, unknown>
): ValidationResult {
  const medications = extractRepeatScriptMedications(answers)

  if (medications.length === 0) {
    return {
      valid: false,
      error: "Please enter or select a medication name.",
      requiresConsult: false,
    }
  }

  // Check gating questions
  const prescribedBefore = answers.prescribed_before
  const regimenAttestation = getRepeatRxAttestationStatus(answers)

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
      error: "This repeat prescription service is only for medicines you have already been prescribed. For a new medicine, see your regular GP unless your request matches an active specialty pathway.",
      requiresConsult: true,
    }
  }

  if (regimenAttestation === "missing") {
    return {
      valid: false,
      error: "Please confirm whether your dose or directions have changed.",
      requiresConsult: false,
    }
  }

  if (regimenAttestation === "changed") {
    return {
      valid: false,
      error: "Dose or directions changes need review by your regular GP or specialist unless your request matches an active specialty pathway.",
      requiresConsult: true,
    }
  }

  for (const medication of medications) {
    const medicationCode = medication.pbsCode
    const isManualEntry = medicationCode === "MANUAL"
    const isUnknownEntry = typeof medicationCode === "string" && medicationCode.toUpperCase() === "UNKNOWN"

    // A3 softening (boundary 3): an unknown medicine may pass ONLY with a useful
    // free-text description; the doctor then sees a medication_needs_identification
    // flag carrying that description. Without one, it stays a hard block. The
    // controlled-substance scan below still runs (the description feeds it).
    const isUnknown = isUnknownEntry || medication.name.toLowerCase().includes("unknown - doctor")
    if (isUnknown && !isUsefulMedicationDescription(medication.description)) {
      return {
        valid: false,
        error: "Tell us what you can about this medicine (what it's for, the name on the box, or how it looks) so the doctor can identify it.",
        requiresConsult: false,
      }
    }

    if (!isManualEntry && (!medicationCode || medicationCode.trim() === "")) {
      return {
        valid: false,
        error: "Please enter or select a medication name.",
        requiresConsult: false,
      }
    }

    // A3 softening: a missing strength no longer blocks checkout. The patient
    // flows through and `deriveIntakeFlags` raises an attention flag
    // (`medication_strength_missing`) for the doctor. New-med, dose-change and
    // controlled substances remain hard blocks below.

    // A3 softening (boundary 2): a missing form no longer blocks checkout. The
    // patient flows through and `deriveIntakeFlags` raises an attention flag
    // (`medication_form_missing`). New-med, dose-change, unknown-med and
    // controlled substances remain hard blocks.

    // Defense in depth: block controlled medications via PBS code and fuzzy name matching.
    if (isPBSCodeBlocked(medicationCode)) {
      return {
        valid: false,
        error: "Controlled substances cannot be prescribed through this service. Please see your regular doctor.",
        requiresConsult: false,
      }
    }

    if (containsBlockedSubstance(buildRepeatScriptMedicationValidationText(medication))) {
      return {
        valid: false,
        error: "Controlled substances cannot be prescribed through this service. Please see your regular doctor.",
        requiresConsult: false,
      }
    }
  }

  for (const medication of medications) {
    if (isPBSCodeBlocked(medication.pbsCode) || containsBlockedSubstance(medication.name)) {
      return {
        valid: false,
        error: "Schedule 8 and controlled substances cannot be prescribed through this service. Please see your regular doctor.",
        requiresConsult: false,
      }
    }
  }

  // Keep the repeat-Rx contract one medicine per request. The dose/history step
  // collects one current dose, one indication, and one side-effect answer; a
  // multi-medicine payload would make those answers ambiguous for the reviewer.
  // This check runs after the controlled-substance scan above so a hidden S8
  // medicine is still reported as a controlled-substance block.
  if (medications.length > MAX_REPEAT_SCRIPT_MEDICATIONS) {
    return {
      valid: false,
      error: "Please request one medication at a time so the doctor can review the correct dose and history.",
      requiresConsult: false,
    }
  }

  // P1: lastPrescribed is required for repeat scripts (clinical risk)
  const lastPrescribed = answers.last_prescribed || answers.lastPrescribed
  if (!lastPrescribed || typeof lastPrescribed !== "string" || lastPrescribed.trim() === "") {
    return {
      valid: false,
      error: "Please indicate when this medication was last prescribed. This is required for clinical safety.",
      requiresConsult: false,
    }
  }

  // A3 softening (boundary 4): a missing current dose no longer blocks — the
  // patient proceeds and the doctor sees a dose_not_stated attention flag.

  return { valid: true }
}

// Legacy key mappings for backward compatibility
const LEGACY_KEY_MAPPINGS: Record<string, string> = {
  // Map old key names to canonical keys
  amtCode: "amt_code",
  pbs_code: "amt_code", // PBS search uses pbs_code, map to amt_code for compatibility
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
 * Handles both PBS (pbs_code, medication_name) and AMT (amt_code, medication_display) formats
 */
export function extractMedicationFromAnswers(
  answers: Record<string, unknown>
): RepeatScriptMedicationPayload | null {
  const mapped = mapLegacyAnswers(answers)
  const medication = extractRepeatScriptMedications(mapped)[0]
  if (!medication) return null

  return {
    amt_code: medication.pbsCode || "MANUAL",
    medication_display: medication.displayName || medication.name,
    medication_name: medication.name,
    medication_strength: medication.strength ?? null,
    medication_form: medication.form ?? null,
    prescribed_before: mapped.prescribed_before === true || answers.prescribed_before === true,
    dose_changed: mapped.dose_changed === true || answers.dose_changed === true,
  }
}
