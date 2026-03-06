/**
 * Consult Subtype Validators
 *
 * Server-side validation for each specialised consult pathway.
 * These run before intake submission to enforce required fields,
 * clinical safety checks, and value-range constraints.
 *
 * Each validator mirrors the client-side assessment step for its subtype
 * but adds server-authoritative checks (e.g. BMI ranges, drug interactions).
 */

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface ConsultValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  flags: ConsultFlag[]
}

export interface ConsultFlag {
  type: "requires_call" | "safety_block" | "soft_block" | "clinical_note"
  reason: string
  details?: string
}

type Answers = Record<string, unknown>

function str(answers: Answers, key: string): string | undefined {
  const v = answers[key]
  return typeof v === "string" ? v : undefined
}

function bool(answers: Answers, key: string): boolean | undefined {
  const v = answers[key]
  return typeof v === "boolean" ? v : undefined
}

function num(answers: Answers, key: string): number | undefined {
  const v = answers[key]
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }
  return undefined
}

function arr(answers: Answers, key: string): string[] | undefined {
  const v = answers[key]
  return Array.isArray(v) ? (v as string[]) : undefined
}

function requireField(
  answers: Answers,
  key: string,
  label: string,
  errors: string[]
): boolean {
  const v = answers[key]
  if (v === undefined || v === null || v === "") {
    errors.push(`${label} is required`)
    return false
  }
  return true
}

function requireOneOf(
  answers: Answers,
  key: string,
  label: string,
  allowed: readonly string[],
  errors: string[]
): boolean {
  const v = str(answers, key)
  if (!v) {
    errors.push(`${label} is required`)
    return false
  }
  if (!allowed.includes(v)) {
    errors.push(`${label} has an invalid value`)
    return false
  }
  return true
}

function requireMinLength(
  answers: Answers,
  key: string,
  label: string,
  minLen: number,
  errors: string[]
): boolean {
  const v = str(answers, key)
  if (!v || v.trim().length < minLen) {
    errors.push(`${label} must be at least ${minLen} characters`)
    return false
  }
  return true
}

// ============================================================================
// GENERAL CONSULT VALIDATOR
// ============================================================================

const CONSULT_CATEGORIES = [
  "skin",
  "infection",
  "new_medication",
  "general",
  "ed",
  "hair_loss",
  "weight_loss",
  "womens_health",
] as const

const URGENCY_LEVELS = ["routine", "soon", "urgent"] as const

export function validateGeneralConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  requireOneOf(answers, "consultCategory", "Consultation category", CONSULT_CATEGORIES, errors)
  requireMinLength(answers, "consultDetails", "Consultation details", 20, errors)

  // Urgency is optional but if provided must be valid
  const urgency = str(answers, "consultUrgency")
  if (urgency && !URGENCY_LEVELS.includes(urgency as typeof URGENCY_LEVELS[number])) {
    errors.push("Urgency level has an invalid value")
  }

  if (urgency === "urgent") {
    warnings.push("Urgent requests may still require up to 24 hours for review. If this is an emergency, please call 000.")
  }

  return { valid: errors.length === 0, errors, warnings, flags }
}

// ============================================================================
// ED CONSULT VALIDATOR
// ============================================================================

const ED_ONSET_VALUES = ["recent", "gradual", "sudden", "always"] as const
const ED_FREQUENCY_VALUES = ["sometimes", "often", "always"] as const
const ED_MORNING_VALUES = ["yes", "sometimes", "rarely"] as const
const ED_PREFERENCE_VALUES = ["daily", "prn"] as const

export function validateEdConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  // Age gate
  if (bool(answers, "edAgeConfirmed") !== true) {
    errors.push("Age confirmation (18+) is required for ED consultations")
  }

  requireOneOf(answers, "edOnset", "Symptom onset", ED_ONSET_VALUES, errors)
  requireOneOf(answers, "edFrequency", "Difficulty frequency", ED_FREQUENCY_VALUES, errors)
  requireOneOf(answers, "edMorningErections", "Morning erection status", ED_MORNING_VALUES, errors)
  requireOneOf(answers, "edPreference", "Medication preference", ED_PREFERENCE_VALUES, errors)

  // Safety checks — nitrates
  const nitrates = str(answers, "edSafety_nitrates")
  if (nitrates === "yes") {
    flags.push({
      type: "safety_block",
      reason: "nitrate_interaction",
      details: "ED medications are contraindicated with nitrate medications due to risk of dangerous hypotension.",
    })
    errors.push("ED medications cannot be prescribed alongside nitrate medications. Please consult your GP in person.")
  }

  // Safety checks — recent cardiac event
  const recentHeart = str(answers, "edSafety_recentHeartEvent")
  if (recentHeart === "yes") {
    const managed = bool(answers, "edSafety_managedCondition")
    if (!managed) {
      flags.push({
        type: "safety_block",
        reason: "recent_cardiac_event",
        details: "ED medications are not suitable within 6 months of a major cardiac event without specialist clearance.",
      })
      errors.push("ED medications are not suitable within 6 months of a major cardiac event. Please consult your cardiologist or GP.")
    } else {
      flags.push({
        type: "clinical_note",
        reason: "cardiac_history_managed",
        details: "Patient reports recent cardiac event managed by doctor. Requires careful clinical review.",
      })
      warnings.push("Your cardiac history will be carefully reviewed by the doctor.")
    }
  }

  // Safety checks — severe heart condition
  const severeHeart = str(answers, "edSafety_severeHeartCondition")
  if (severeHeart === "yes") {
    const managed = bool(answers, "edSafety_managedCondition")
    if (!managed) {
      flags.push({
        type: "safety_block",
        reason: "severe_cardiac_condition",
        details: "ED medications may not be safe for patients with severe heart conditions.",
      })
      errors.push("ED medications may not be safe for your cardiac condition. Please consult your cardiologist or GP.")
    } else {
      flags.push({
        type: "clinical_note",
        reason: "severe_cardiac_managed",
        details: "Patient reports severe heart condition managed by doctor. Requires careful clinical review.",
      })
    }
  }

  // Clinical notes for the reviewing doctor
  const onset = str(answers, "edOnset")
  if (onset === "sudden") {
    flags.push({
      type: "clinical_note",
      reason: "sudden_onset",
      details: "Sudden onset ED may indicate vascular, neurological, or psychological causes. Consider further investigation.",
    })
  }

  const morning = str(answers, "edMorningErections")
  if (morning === "rarely") {
    flags.push({
      type: "clinical_note",
      reason: "absent_morning_erections",
      details: "Absent morning erections may suggest organic cause. Consider hormonal or vascular assessment.",
    })
  }

  return { valid: errors.length === 0, errors, warnings, flags }
}

// ============================================================================
// HAIR LOSS CONSULT VALIDATOR
// ============================================================================

const HAIR_PATTERN_VALUES = ["male_pattern", "overall_thinning", "patchy", "other"] as const
const HAIR_DURATION_VALUES = ["less_than_6_months", "6_to_12_months", "1_to_2_years", "more_than_2_years"] as const
const HAIR_FAMILY_VALUES = ["yes_father", "yes_mother", "yes_both", "no", "unknown"] as const
const HAIR_MED_PREFERENCE_VALUES = ["finasteride", "minoxidil"] as const

export function validateHairLossConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  requireOneOf(answers, "hairPattern", "Hair loss pattern", HAIR_PATTERN_VALUES, errors)
  requireOneOf(answers, "hairDuration", "Duration of hair loss", HAIR_DURATION_VALUES, errors)
  requireOneOf(answers, "hairFamilyHistory", "Family history", HAIR_FAMILY_VALUES, errors)
  requireOneOf(answers, "hairMedicationPreference", "Treatment preference", HAIR_MED_PREFERENCE_VALUES, errors)

  // Clinical flags
  const pattern = str(answers, "hairPattern")
  if (pattern === "patchy") {
    flags.push({
      type: "clinical_note",
      reason: "patchy_hair_loss",
      details: "Patchy hair loss may indicate alopecia areata or other non-androgenetic cause. Consider dermatology referral.",
    })
    warnings.push("Patchy hair loss sometimes has different causes than typical pattern baldness. The doctor will assess this carefully.")
  }

  if (pattern === "other") {
    flags.push({
      type: "clinical_note",
      reason: "atypical_pattern",
      details: "Atypical hair loss pattern reported. May require further investigation before treatment.",
    })
  }

  const duration = str(answers, "hairDuration")
  if (duration === "less_than_6_months") {
    flags.push({
      type: "clinical_note",
      reason: "recent_onset",
      details: "Hair loss <6 months may be reactive (telogen effluvium) rather than androgenetic. Consider reversible causes.",
    })
  }

  // Scalp conditions that may need attention
  if (bool(answers, "scalpPsoriasis")) {
    flags.push({
      type: "clinical_note",
      reason: "scalp_psoriasis",
      details: "Patient reports scalp psoriasis. May affect treatment choice and require additional management.",
    })
  }

  if (bool(answers, "scalpFolliculitis")) {
    flags.push({
      type: "clinical_note",
      reason: "scalp_folliculitis",
      details: "Patient reports scalp folliculitis. Active infection should be treated before starting hair loss medications.",
    })
    warnings.push("Active scalp infections may need treatment before starting hair loss medication.")
  }

  return { valid: errors.length === 0, errors, warnings, flags }
}

// ============================================================================
// WOMEN'S HEALTH — CONTRACEPTION VALIDATOR
// ============================================================================

const CONTRACEPTION_TYPE_VALUES = ["start", "continue", "switch"] as const
const CONTRACEPTION_CURRENT_VALUES = ["pill", "iud", "other", "none"] as const
const PREGNANCY_STATUS_VALUES = ["no", "not_sure", "yes"] as const

export function validateContraceptionConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  requireOneOf(answers, "contraceptionType", "Contraception request type", CONTRACEPTION_TYPE_VALUES, errors)
  requireOneOf(answers, "contraceptionCurrent", "Current contraception method", CONTRACEPTION_CURRENT_VALUES, errors)
  requireOneOf(answers, "pregnancyStatus", "Pregnancy status", PREGNANCY_STATUS_VALUES, errors)

  const pregnancy = str(answers, "pregnancyStatus")
  if (pregnancy === "yes") {
    flags.push({
      type: "requires_call",
      reason: "pregnancy_confirmed",
      details: "Patient reports current pregnancy. Requires doctor phone consultation for appropriate care.",
    })
    warnings.push("Because you've indicated pregnancy, the doctor will need to speak with you by phone.")
  }

  if (pregnancy === "not_sure") {
    flags.push({
      type: "clinical_note",
      reason: "pregnancy_uncertain",
      details: "Patient unsure about pregnancy status. Consider recommending pregnancy test before prescribing.",
    })
    warnings.push("If you're unsure about pregnancy, the doctor may recommend a test before prescribing contraception.")
  }

  return { valid: errors.length === 0, errors, warnings, flags }
}

// ============================================================================
// WOMEN'S HEALTH — UTI VALIDATOR
// ============================================================================

const UTI_SYMPTOM_VALUES = ["burning", "frequency", "urgency", "incomplete", "blood", "cloudy"] as const
const YES_NO_VALUES = ["yes", "no"] as const

export function validateUtiConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  // Must have at least one symptom
  const symptoms = arr(answers, "utiSymptoms")
  if (!symptoms || symptoms.length === 0) {
    errors.push("At least one UTI symptom must be selected")
  } else {
    const invalid = symptoms.filter(s => !UTI_SYMPTOM_VALUES.includes(s as typeof UTI_SYMPTOM_VALUES[number]))
    if (invalid.length > 0) {
      errors.push("Invalid symptom selection")
    }
  }

  requireOneOf(answers, "utiRedFlags", "Red flag symptoms", YES_NO_VALUES, errors)
  requireOneOf(answers, "utiPregnant", "Pregnancy status", [...PREGNANCY_STATUS_VALUES], errors)

  const redFlags = str(answers, "utiRedFlags")
  if (redFlags === "yes") {
    flags.push({
      type: "safety_block",
      reason: "uti_red_flags",
      details: "Patient reports systemic symptoms (fever, back pain, nausea/vomiting). May indicate pyelonephritis requiring in-person assessment.",
    })
    errors.push("Symptoms like fever, back pain, or feeling unwell may indicate a kidney infection. Please see a doctor in person or visit an emergency department.")
  }

  const pregnant = str(answers, "utiPregnant")
  if (pregnant === "yes" || pregnant === "not_sure") {
    flags.push({
      type: "safety_block",
      reason: "uti_pregnancy",
      details: "UTI during pregnancy or possible pregnancy requires in-person assessment and culture-directed therapy.",
    })
    errors.push("UTIs during pregnancy need in-person assessment for safe treatment. Please see your GP or visit a clinic.")
  }

  // Clinical note for haematuria
  if (symptoms?.includes("blood")) {
    flags.push({
      type: "clinical_note",
      reason: "haematuria",
      details: "Patient reports blood in urine. If recurrent or in patient >50, consider further investigation (urine MCS, renal imaging).",
    })
  }

  return { valid: errors.length === 0, errors, warnings, flags }
}

// ============================================================================
// WOMEN'S HEALTH — MORNING-AFTER PILL VALIDATOR
// ============================================================================

const MAP_HOURS_VALUES = ["under_24", "24_to_72", "72_to_120", "over_120"] as const

export function validateMorningAfterConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  requireOneOf(answers, "hoursSinceIntercourse", "Time since intercourse", MAP_HOURS_VALUES, errors)

  const hours = str(answers, "hoursSinceIntercourse")
  if (hours === "over_120") {
    flags.push({
      type: "safety_block",
      reason: "map_window_exceeded",
      details: "Emergency contraception (oral) is not effective after 120 hours (5 days). A copper IUD may still be effective — refer to GP.",
    })
    errors.push("Emergency contraception pills are not effective after 5 days. Please see your GP — a copper IUD may still be an option.")
  }

  if (hours === "72_to_120") {
    flags.push({
      type: "clinical_note",
      reason: "map_reduced_efficacy",
      details: "72-120 hour window: ulipristal acetate (EllaOne) preferred over levonorgestrel. Efficacy reduced but still beneficial.",
    })
    warnings.push("At this time window, certain options are more effective than others. The doctor will recommend the best approach.")
  }

  return { valid: errors.length === 0, errors, warnings, flags }
}

// ============================================================================
// WEIGHT LOSS CONSULT VALIDATOR
// ============================================================================

const PREVIOUS_ATTEMPTS_VALUES = ["none", "diet_exercise", "programs", "medication", "multiple"] as const
const WEIGHT_LOSS_MED_VALUES = ["glp1", "duromine"] as const

export function validateWeightLossConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  // Weight and height with ranges
  const weight = num(answers, "currentWeight")
  if (weight === undefined) {
    errors.push("Current weight is required")
  } else if (weight < 30 || weight > 300) {
    errors.push("Weight must be between 30 and 300 kg")
  }

  const height = num(answers, "currentHeight")
  if (height === undefined) {
    errors.push("Current height is required")
  } else if (height < 100 || height > 250) {
    errors.push("Height must be between 100 and 250 cm")
  }

  const targetWeight = num(answers, "targetWeight")
  if (targetWeight === undefined) {
    errors.push("Target weight is required")
  } else if (targetWeight < 30 || targetWeight > 300) {
    errors.push("Target weight must be between 30 and 300 kg")
  }

  requireOneOf(answers, "previousAttempts", "Previous weight loss attempts", PREVIOUS_ATTEMPTS_VALUES, errors)
  requireField(answers, "eatingDisorderHistory", "Eating disorder history", errors)
  requireOneOf(answers, "weightLossMedPreference", "Medication preference", WEIGHT_LOSS_MED_VALUES, errors)
  requireMinLength(answers, "weightLossGoals", "Weight loss goals", 20, errors)

  // Adverse reactions
  const adverse = str(answers, "wlAdverseReactions")
  if (adverse === "yes") {
    requireMinLength(answers, "wlAdverseReactionsDetails", "Adverse reaction details", 10, errors)
    flags.push({
      type: "clinical_note",
      reason: "previous_adverse_reaction",
      details: `Patient reports previous adverse reactions to weight loss medication: ${str(answers, "wlAdverseReactionsDetails") || "details not provided"}`,
    })
  }

  // BMI calculation and clinical checks
  if (weight !== undefined && height !== undefined && height > 0) {
    const heightM = height / 100
    const bmi = weight / (heightM * heightM)

    if (bmi < 25) {
      flags.push({
        type: "clinical_note",
        reason: "bmi_below_threshold",
        details: `BMI ${bmi.toFixed(1)} is below the typical threshold (25) for weight loss medication. Clinical justification required.`,
      })
      warnings.push("Your BMI suggests you may not meet the usual threshold for weight loss medication. The doctor will assess your individual circumstances.")
    }

    if (bmi < 18.5) {
      flags.push({
        type: "safety_block",
        reason: "underweight",
        details: `BMI ${bmi.toFixed(1)} indicates underweight. Weight loss medication is contraindicated.`,
      })
      errors.push("Based on your measurements, weight loss medication is not appropriate. Please speak with your GP about healthy weight management.")
    }

    if (bmi > 50) {
      flags.push({
        type: "clinical_note",
        reason: "severe_obesity",
        details: `BMI ${bmi.toFixed(1)} indicates severe obesity. May benefit from multidisciplinary approach including bariatric referral.`,
      })
    }
  }

  // Target weight sanity check
  if (weight !== undefined && targetWeight !== undefined) {
    const lossPct = ((weight - targetWeight) / weight) * 100
    if (lossPct > 30) {
      flags.push({
        type: "clinical_note",
        reason: "aggressive_target",
        details: `Target represents ${lossPct.toFixed(0)}% body weight loss. Discuss realistic expectations and staged approach.`,
      })
      warnings.push("Your target represents significant weight loss. The doctor may suggest a staged approach with interim goals.")
    }
    if (targetWeight >= weight) {
      errors.push("Target weight should be less than current weight for a weight loss consultation")
    }
  }

  // Eating disorder flag
  const edHistory = str(answers, "eatingDisorderHistory")
  if (edHistory === "yes") {
    flags.push({
      type: "requires_call",
      reason: "eating_disorder_history",
      details: "Patient reports eating disorder history. Requires doctor phone consultation before prescribing weight loss medication.",
    })
    warnings.push("Because of your history, the doctor will need to speak with you by phone to ensure safe treatment.")
  }

  // Medical history flags for the doctor
  if (bool(answers, "wlHistoryDiabetes")) {
    flags.push({
      type: "clinical_note",
      reason: "type_2_diabetes",
      details: "Patient has Type 2 diabetes. GLP-1 agonists may provide dual benefit. Check current diabetes medications for interactions.",
    })
  }

  if (bool(answers, "wlHistoryHeartCondition")) {
    flags.push({
      type: "clinical_note",
      reason: "heart_disease",
      details: "Patient reports heart disease. Duromine (phentermine) may be contraindicated. Review cardiovascular risk before prescribing.",
    })
  }

  if (bool(answers, "wlHistoryThyroid")) {
    flags.push({
      type: "clinical_note",
      reason: "thyroid_disorder",
      details: "Patient reports thyroid disorder. Ensure thyroid function is optimised before attributing weight to other causes.",
    })
  }

  // Duromine + heart condition conflict
  const medPref = str(answers, "weightLossMedPreference")
  if (medPref === "duromine" && bool(answers, "wlHistoryHeartCondition")) {
    flags.push({
      type: "clinical_note",
      reason: "duromine_cardiac_risk",
      details: "Patient prefers Duromine (phentermine) but has heart condition. Phentermine is contraindicated in uncontrolled hypertension, coronary artery disease, and heart failure.",
    })
    warnings.push("Duromine may not be suitable with your cardiac history. The doctor will discuss alternatives.")
  }

  return { valid: errors.length === 0, errors, warnings, flags }
}

// ============================================================================
// WOMEN'S HEALTH — GENERAL (period pain, other)
// ============================================================================

export function validateWomensGeneralConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  requireMinLength(answers, "womensDetails", "Description of your concern", 20, errors)

  return { valid: errors.length === 0, errors, warnings, flags }
}

// ============================================================================
// DISPATCHER — validate by subtype
// ============================================================================

export type ConsultSubtype =
  | "general"
  | "ed"
  | "hair_loss"
  | "womens_health_contraception"
  | "womens_health_uti"
  | "womens_health_morning_after"
  | "womens_health_general"
  | "weight_loss"

/**
 * Validate consult answers based on the subtype.
 * Returns a structured result with errors, warnings, and clinical flags.
 */
export function validateConsultBySubtype(
  subtype: ConsultSubtype,
  answers: Answers
): ConsultValidationResult {
  switch (subtype) {
    case "general":
      return validateGeneralConsult(answers)
    case "ed":
      return validateEdConsult(answers)
    case "hair_loss":
      return validateHairLossConsult(answers)
    case "womens_health_contraception":
      return validateContraceptionConsult(answers)
    case "womens_health_uti":
      return validateUtiConsult(answers)
    case "womens_health_morning_after":
      return validateMorningAfterConsult(answers)
    case "womens_health_general":
      return validateWomensGeneralConsult(answers)
    case "weight_loss":
      return validateWeightLossConsult(answers)
    default: {
      const _exhaustive: never = subtype
      return {
        valid: false,
        errors: [`Unknown consult subtype: ${_exhaustive}`],
        warnings: [],
        flags: [],
      }
    }
  }
}
