/**
 * Doctor-context validators for the ED and hair-loss review summaries.
 *
 * NOT an enforcement layer. Checkout enforcement lives in the safety engine
 * (`lib/safety/rules.ts` via `checkSafetyForServer`) and the server-side Zod
 * step schemas (`lib/request/validation.ts` via `validateAnswersServerSide`).
 * These validators run post-payment inside `lib/clinical/case-summary.ts`
 * only, turning stored answers into the safety chips and caution items the
 * reviewing doctor sees. Nothing here gates payment or blocks a patient.
 *
 * The per-subtype checkout validators that once lived here (UTI, pill,
 * morning-after, weight, general) were deleted 2026-08-08 — they had no
 * caller, and their live-line safety content is owned by the safety engine
 * and Zod schemas (verified per-subtype before deletion).
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

interface ConsultFlag {
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

function yes(answers: Answers, key: string): boolean {
  const v = answers[key]
  if (v === true) return true
  if (typeof v !== "string") return false
  return ["yes", "true", "1"].includes(v.toLowerCase().trim())
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


// ============================================================================
// ED CONSULT VALIDATOR
// ============================================================================

const ED_ONSET_VALUES = ["recent", "gradual", "sudden", "always"] as const
const ED_FREQUENCY_VALUES = ["sometimes", "often", "always"] as const
const ED_MORNING_VALUES = ["yes", "sometimes", "rarely"] as const
const ED_PREFERENCE_VALUES = ["daily", "prn", "doctor_decides"] as const

export function validateEdConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  /**
   * Three generations of ED intake can reach this validator: the current
   * duration + single-severity flow, the IIEF-5 flow it replaced on
   * 2026-07-19, and the original onset/frequency/morning flow. Each is
   * validated against the instrument it was actually collected with — an
   * in-flight draft or a historical intake must never fail because a newer
   * field is absent.
   */
  const hasIiefAssessment =
    num(answers, "iief1") !== undefined || num(answers, "iiefTotal") !== undefined
  const hasCurrentSeverity = num(answers, "edErectionFrequency") !== undefined
  const usesLegacyOnsetFlow =
    !hasIiefAssessment &&
    !hasCurrentSeverity &&
    Boolean(
      str(answers, "edOnset") ||
      str(answers, "edFrequency") ||
      str(answers, "edMorningErections"),
    )

  if (usesLegacyOnsetFlow) {
    requireOneOf(answers, "edOnset", "Symptom onset", ED_ONSET_VALUES, errors)
    requireOneOf(answers, "edFrequency", "Difficulty frequency", ED_FREQUENCY_VALUES, errors)
    requireOneOf(answers, "edMorningErections", "Morning erection status", ED_MORNING_VALUES, errors)
  } else if (hasIiefAssessment) {
    requireField(answers, "edDuration", "Duration of concern", errors)
    for (const key of ["iief1", "iief2", "iief3", "iief4", "iief5"]) {
      const score = num(answers, key)
      if (score === undefined || score < 1 || score > 5) {
        errors.push(`${key.toUpperCase()} score is required`)
      }
    }
  } else {
    requireField(answers, "edDuration", "Duration of concern", errors)
    const frequency = num(answers, "edErectionFrequency")
    if (frequency === undefined || frequency < 1 || frequency > 5) {
      errors.push("Erection frequency rating is required")
    }
  }
  requireOneOf(answers, "edPreference", "Medication preference", ED_PREFERENCE_VALUES, errors)

  // Safety checks - nitrates
  if (yes(answers, "edNitrates")) {
    flags.push({
      type: "safety_block",
      reason: "nitrate_interaction",
      details: "ED medications are contraindicated with nitrate medications due to risk of dangerous hypotension.",
    })
    errors.push("ED medications cannot be prescribed alongside nitrate medications. Please consult your GP in person.")
  }

  // Safety checks - recent cardiac event
  if (yes(answers, "edRecentHeartEvent")) {
    const managed = yes(answers, "edGpCleared")
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

  // Safety checks - severe heart condition
  if (yes(answers, "edSevereHeart")) {
    const managed = yes(answers, "edGpCleared")
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

const HAIR_GOAL_VALUES = ["prevent", "regrow", "both", "exploring"] as const
const HAIR_ONSET_VALUES = [
  "not_yet",
  "under_6_months",
  "6_12_months",
  "over_12_months",
  // Legacy stored draft values from the former 5-option UI.
  "few_months",
  "1_2_years",
  "2_plus_years",
] as const
const HAIR_PATTERN_VALUES = ["none", "slight_recession", "noticeable_thinning", "crown_plus_hairline", "significant", "extensive"] as const
const HAIR_FAMILY_VALUES = [
  "yes_father",
  "yes_mother",
  "yes_both",
  "no_or_unsure",
  // Legacy stored draft values from the former separate "No" / "Not sure" UI.
  "no",
  "unknown",
] as const
const HAIR_REPRODUCTIVE_VALUES = ["no", "na", "yes"] as const
const HAIR_MED_PREFERENCE_VALUES = ["oral", "combination", "doctor_decides"] as const

export function validateHairLossConsult(answers: Answers): ConsultValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const flags: ConsultFlag[] = []

  // Step 1: Goals
  requireOneOf(answers, "hairGoal", "Hair loss goal", HAIR_GOAL_VALUES, errors)
  requireOneOf(answers, "hairOnset", "Onset timing", HAIR_ONSET_VALUES, errors)

  // Step 2: Assessment
  requireOneOf(answers, "hairPattern", "Hair loss pattern", HAIR_PATTERN_VALUES, errors)
  requireOneOf(answers, "hairFamilyHistory", "Family history", HAIR_FAMILY_VALUES, errors)

  // Step 3: Health
  requireOneOf(answers, "hairReproductive", "Reproductive safety", HAIR_REPRODUCTIVE_VALUES, errors)

  // Step 4: Preferences
  requireOneOf(answers, "hairMedicationPreference", "Treatment preference", HAIR_MED_PREFERENCE_VALUES, errors)

  // Clinical flags - reproductive hard block
  const reproductive = str(answers, "hairReproductive")
  if (reproductive === "yes") {
    flags.push({
      type: "safety_block",
      reason: "reproductive_contraindication",
      details: "Finasteride is Category X (TGA/FDA). Oral 5-alpha reductase inhibitors carry teratogenic risk. Patient reported partner pregnant or trying to conceive. Service declined at intake.",
    })
  }

  // Clinical flags - pattern
  const pattern = str(answers, "hairPattern")
  if (pattern === "none") {
    flags.push({
      type: "clinical_note",
      reason: "no_visible_loss",
      details: "Patient reports no noticeable loss. May be prevention-only candidate. Verify clinical need before prescribing.",
    })
  }

  if (pattern === "extensive") {
    flags.push({
      type: "clinical_note",
      reason: "extensive_loss",
      details: "Extensive hair loss reported. Set realistic expectations for treatment outcomes at this stage.",
    })
    warnings.push("With extensive hair loss, treatment may slow further loss but full regrowth is less likely. The doctor will discuss realistic expectations.")
  }

  // Clinical flags - onset
  const onset = str(answers, "hairOnset")
  if (onset === "under_6_months" || onset === "few_months") {
    flags.push({
      type: "clinical_note",
      reason: "recent_onset",
      details: "Hair loss onset within last few months. May be reactive (telogen effluvium) rather than androgenetic. Consider reversible causes.",
    })
  }

  // Scalp conditions
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

  // Blood pressure flags (minoxidil safety)
  if (bool(answers, "hairLowBP")) {
    flags.push({
      type: "clinical_note",
      reason: "low_blood_pressure",
      details: "Patient reports low blood pressure or dizziness. Exercise caution if recommending topical minoxidil (vasodilator).",
    })
  }

  if (bool(answers, "hairHeartConditions")) {
    flags.push({
      type: "clinical_note",
      reason: "heart_conditions",
      details: "Patient reports heart conditions or palpitations. Review cardiovascular history before prescribing.",
    })
  }

  return { valid: errors.length === 0, errors, warnings, flags }
}
