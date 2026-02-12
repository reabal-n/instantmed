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
  // Accept either pbs_code or amt_code - PBS is from medication search, AMT is legacy
  const medicationCode = answers.pbs_code || answers.amt_code
  // Accept either medication_name or medication_display
  const medicationName = answers.medication_name || answers.medication_display
  const medicationDisplay = answers.medication_display || answers.medication_name

  // Allow "MANUAL" code for manual text entries when search doesn't find the medication
  const isManualEntry = medicationCode === "MANUAL"

  if (!isManualEntry && (!medicationCode || typeof medicationCode !== "string" || medicationCode.trim() === "")) {
    return {
      valid: false,
      error: "Please enter or select a medication name.",
      requiresConsult: false,
    }
  }

  if (!medicationName || typeof medicationName !== "string" || medicationName.trim() === "") {
    return {
      valid: false,
      error: "Please enter a medication name.",
      requiresConsult: false,
    }
  }

  if (!medicationDisplay || typeof medicationDisplay !== "string" || medicationDisplay.trim() === "") {
    return {
      valid: false,
      error: "Please enter a medication name.",
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

  // Defense in depth: block S8 medications via PBS code AND name matching with fuzzy detection
  // 1. Check PBS code directly (bypasses typo attempts when using search)
  if (isPBSCodeBlocked(medicationCode as string)) {
    return {
      valid: false,
      error: "Schedule 8 and controlled substances cannot be prescribed through this service. Please see your regular doctor.",
      requiresConsult: false,
    }
  }
  
  // 2. Check medication name with fuzzy matching (catches typo bypass attempts)
  if (containsBlockedSubstance(String(medicationDisplay)) || containsBlockedSubstance(String(medicationName))) {
    return {
      valid: false,
      error: "Schedule 8 and controlled substances cannot be prescribed through this service. Please see your regular doctor.",
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

  // Accept either pbs_code or amt_code
  const medicationCode = mapped.amt_code || answers.pbs_code
  // Accept either medication_name or medication_display
  const medicationName = mapped.medication_name || answers.medication_name
  const medicationDisplay = mapped.medication_display || answers.medication_name

  // Must have at least a code (or MANUAL) and a name
  const isManualEntry = medicationCode === "MANUAL"
  if (!isManualEntry && !medicationCode) {
    return null
  }
  if (!medicationName && !medicationDisplay) {
    return null
  }

  return {
    amt_code: String(medicationCode || "MANUAL"),
    medication_display: String(medicationDisplay || medicationName || ""),
    medication_name: String(medicationName || medicationDisplay || ""),
    medication_strength: mapped.medication_strength != null ? String(mapped.medication_strength) : (answers.strength != null ? String(answers.strength) : null),
    medication_form: mapped.medication_form != null ? String(mapped.medication_form) : (answers.form != null ? String(answers.form) : null),
    prescribed_before: mapped.prescribed_before === true || answers.prescribed_before === true,
    dose_changed: mapped.dose_changed === true || answers.dose_changed === true,
  }
}
