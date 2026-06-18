import {
  validateEdConsult,
  validateHairLossConsult,
} from "@/lib/clinical/consult-validators"
import { getEdPreset } from "@/lib/clinical/ed-prescribing-presets"
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
import {
  hasUncertainMedicationAnswer,
  requiresClinicalAdministration,
} from "@/lib/clinical/medication-flags"
import { normaliseSymptomText } from "@/lib/clinical/symptom-normaliser"
import {
  buildRepeatScriptMedicationValidationText,
  extractRepeatScriptMedications,
  formatRepeatScriptMedicationCompactLabel,
  getRepeatScriptMedicationDisplayParts,
} from "@/lib/validation/repeat-script-medications"

type Answers = Record<string, unknown>

export type ClinicalPlanAction = "approve" | "prescribe" | "needs_call" | "request_info" | "decline"

export interface ClinicalCaseInput {
  category?: string | null
  subtype?: string | null
  serviceType?: string | null
  patientName?: string | null
  patientDateOfBirth?: string | null
  patientSex?: string | null
  answers: Answers
  riskTier?: string | null
  requiresLiveConsult?: boolean | null
}

export interface ClinicalKeyFact {
  label: string
  value: string
}

export interface ClinicalSafetyItem {
  severity: "block" | "caution" | "info"
  label: string
  detail: string
}

export interface ClinicalPlan {
  action: ClinicalPlanAction
  title: string
  rationale: string
  nextSteps: string[]
}

export interface PrescriptionIntent {
  presetLabel: string
  medicationName?: string
  strength?: string
  form?: string
  medicationSearchHint?: string
  directionsTemplate: string
  quantityTemplate?: string
  repeatsTemplate?: string
  safetyChecks: string[]
  cautionChecks?: string[]
  parchmentMode: "open_patient_prescribe"
  clipboardText: string
  alternativeNote?: string
}

export interface ClinicalCaseSummary {
  title: string
  patientStory: string
  keyFacts: ClinicalKeyFact[]
  safetyItems: ClinicalSafetyItem[]
  recommendedPlan: ClinicalPlan
  prescriptionIntent?: PrescriptionIntent
  draftNote: string
}

function raw(answers: Answers, key: string): unknown {
  return answers[key]
}

function str(answers: Answers, key: string): string | undefined {
  const value = raw(answers, key)
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return undefined
}

function firstStr(answers: Answers, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = str(answers, key)
    if (value) return value
  }
  return undefined
}

function bool(answers: Answers, key: string): boolean | undefined {
  const value = raw(answers, key)
  return typeof value === "boolean" ? value : undefined
}

function isAffirmative(value: unknown): boolean {
  if (value === true) return true
  if (typeof value !== "string") return false
  return ["yes", "true", "1"].includes(value.toLowerCase().trim())
}

function answerYes(answers: Answers, key: string): boolean {
  return isAffirmative(raw(answers, key))
}

function yesNo(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim()
    if (["yes", "true"].includes(normalized)) return "Yes"
    if (["no", "false", "none", "nil", "na", "n/a"].includes(normalized)) return "No"
  }
  return humanize(value)
}

function humanize(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Not provided"
  if (Array.isArray(value)) return value.map(humanize).join(", ")
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bTo\b/g, "to")
}

function sentenceHumanize(value: unknown): string {
  return humanize(value).toLowerCase()
}

function compactFacts(facts: Array<ClinicalKeyFact | false | undefined | null>): ClinicalKeyFact[] {
  return facts.filter(Boolean) as ClinicalKeyFact[]
}

function fact(label: string, value: string | undefined | null): ClinicalKeyFact | null {
  return value ? { label, value } : null
}

function factHumanized(label: string, value: unknown): ClinicalKeyFact | null {
  return value ? { label, value: humanize(value) } : null
}

function createClipboardText(intent: Omit<PrescriptionIntent, "clipboardText" | "parchmentMode">): string {
  const medicationLine = [
    intent.medicationName,
    intent.strength,
    intent.form,
  ].filter(Boolean).join(" ")
  const lines = [
    "Doctor-only prescribing context",
    medicationLine ? `Medicine context: ${medicationLine}` : null,
    intent.medicationSearchHint ? `Search hint: ${intent.medicationSearchHint}` : null,
    `Dose/directions context: ${intent.directionsTemplate}`,
    "Confirm medicine, dose and all prescribing details in Parchment.",
    intent.cautionChecks && intent.cautionChecks.length > 0 ? `Cautions: ${intent.cautionChecks.join("; ")}` : null,
  ].filter(Boolean)

  return lines.join("\n")
}

function makeIntent(intent: Omit<PrescriptionIntent, "clipboardText" | "parchmentMode">): PrescriptionIntent {
  return {
    ...intent,
    parchmentMode: "open_patient_prescribe",
    clipboardText: createClipboardText(intent),
  }
}

function sentenceCaseClinicalText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(\d+)yo\b/gi, "$1-year-old")
    .replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix: string, char: string) => `${prefix}${char.toUpperCase()}`)
}

function displayPatientStory(text: string): string {
  return sentenceCaseClinicalText(text)
    .replace(/\b(\d+)yo\b/gi, "$1-year-old")
}

function note(subjective: string, objective: string, assessment: string, plan: string): string {
  return [
    `S: ${sentenceCaseClinicalText(subjective)}`,
    `O: ${sentenceCaseClinicalText(objective)}`,
    `A: ${sentenceCaseClinicalText(assessment)}`,
    `P: ${sentenceCaseClinicalText(plan)}`,
  ].join("\n")
}

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null
  const date = new Date(dob)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const m = now.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age--
  return age >= 0 && age < 130 ? age : null
}

/**
 * Map all known patient-sex inputs (DB enum + free-text) to a single-letter
 * shorthand used on the S line. Profile.sex is `"M" | "F" | "N" | "I"` in
 * `types/db.ts`, but caller code sometimes passes raw strings like "male" /
 * "female". Accept both. Returns null for anything unmappable (eg. "Not
 * stated") so the header falls back to a generic form.
 */
function sexShorthand(sex: string | null | undefined): string | null {
  if (!sex) return null
  const s = sex.toLowerCase().trim()
  if (s === "male" || s === "m") return "M"
  if (s === "female" || s === "f") return "F"
  if (s === "intersex" || s === "i" || s === "x") return "X"
  return null
}

/**
 * Produce the leading clause of the Subjective line.
 *   "25yo F" if both DOB and sex resolve.
 *   "40yo patient" if only DOB resolves.
 *   "Patient (F)" if only sex resolves.
 *   "Tuki Tkt" (the patient name) if neither resolves.
 *   "Patient" as a final fallback when even the name is missing.
 * Never leaks "NaN", "undefined", or "null" into the rendered string.
 */
function patientHeader(input: ClinicalCaseInput): string {
  const age = ageFromDob(input.patientDateOfBirth)
  const sex = sexShorthand(input.patientSex)
  if (age != null && sex) return `${age}yo ${sex}`
  if (age != null) return `${age}yo patient`
  if (sex) return `Patient (${sex})`
  return input.patientName?.trim() || "Patient"
}

function edSummary(input: ClinicalCaseInput): ClinicalCaseSummary {
  const { answers } = input
  const validation = validateEdConsult(answers)
  const legacyClinicalFlags = validation.flags.filter((flag) => ![
    "nitrate_interaction",
    "recent_cardiac_event",
    "cardiac_history_managed",
    "severe_cardiac_condition",
    "severe_cardiac_managed",
  ].includes(flag.reason))
  const hasNitrates = answerYes(answers, "edNitrates")
  const hasRecentHeartEvent = answerYes(answers, "edRecentHeartEvent")
  const hasSevereHeart = answerYes(answers, "edSevereHeart")
  const hasAlphaBlockers = answerYes(answers, "edAlphaBlockers")
  const gpCleared = answerYes(answers, "edGpCleared")
  const hasBlock = hasNitrates || (hasRecentHeartEvent && !gpCleared) || (hasSevereHeart && !gpCleared)
  const goal = str(answers, "edGoal") || "ED treatment"
  const duration = str(answers, "edDuration") || str(answers, "duration_of_concern") || "unspecified duration"
  const preference = str(answers, "edPreference") || "doctor decides"
  const score = str(answers, "iiefTotal")

  const safetyItems: ClinicalSafetyItem[] = [
    hasNitrates
      ? {
          severity: "block" as const,
          label: "Nitrate use",
          detail: "Nitrates are an absolute contraindication with PDE5 inhibitors due to severe hypotension risk.",
        }
      : null,
    hasRecentHeartEvent
      ? {
          severity: (gpCleared ? "caution" : "block") as "caution" | "block",
          label: "Recent cardiac event",
          detail: gpCleared
            ? "Patient reports GP clearance. Verify clearance and cardiovascular stability before considering ED medication."
            : "Recent heart attack, stroke, or unstable angina requires GP/cardiology review before ED medication.",
        }
      : null,
    hasSevereHeart
      ? {
          severity: (gpCleared ? "caution" : "block") as "caution" | "block",
          label: "Severe heart condition",
          detail: gpCleared
            ? "Patient reports GP clearance. Confirm details before prescribing."
            : "Severe or uncontrolled heart disease is not suitable for asynchronous ED prescribing.",
        }
      : null,
    hasAlphaBlockers
      ? {
          severity: "caution" as const,
          label: "Alpha blocker use",
          detail: "Alpha blockers can increase hypotension risk with PDE5 inhibitors. Confirm medication and dosing separation.",
        }
      : null,
    ...legacyClinicalFlags.map((flag) => ({
      severity: "caution" as const,
      label: humanize(flag.reason),
      detail: flag.details || "Review before prescribing.",
    })),
  ].filter(Boolean) as ClinicalSafetyItem[]

  const keyFacts = compactFacts([
    { label: "Main goal", value: humanize(goal) },
    { label: "Duration", value: humanize(duration) },
    fact("IIEF-5 score", score),
    { label: "Treatment preference", value: humanize(preference) },
    { label: "Nitrate use", value: yesNo(raw(answers, "edNitrates")) },
    { label: "Recent heart event", value: yesNo(raw(answers, "edRecentHeartEvent")) },
    { label: "Severe heart condition", value: yesNo(raw(answers, "edSevereHeart")) },
    { label: "Blood pressure medication", value: yesNo(raw(answers, "edBpMedication")) },
    { label: "Alpha blockers", value: yesNo(raw(answers, "edAlphaBlockers")) },
    hasRecentHeartEvent || hasSevereHeart || hasAlphaBlockers ? { label: "GP clearance reported", value: yesNo(raw(answers, "edGpCleared")) } : null,
    { label: "Previous ED medication", value: yesNo(raw(answers, "previousEdMeds")) },
    fact("Allergies", str(answers, "known_allergies")),
    fact("Conditions", str(answers, "existing_conditions")),
    fact("Current medications", str(answers, "current_medications")),
  ])

  const cautionChecks = safetyItems
    .filter((item) => item.severity === "caution")
    .map((item) => item.label)
  const action: ClinicalPlanAction = hasBlock ? "decline" : "prescribe"
  const recommendedPlan: ClinicalPlan = hasBlock
    ? {
        action,
        title: "Do not prescribe ED medication asynchronously",
        rationale: "A contraindication or high-risk cardiac screen was detected.",
        nextSteps: ["Decline or convert to a clinician-led consultation.", "Advise GP/cardiology review where relevant."],
      }
    : {
        action,
        title: "PDE5 inhibitor pathway if clinically appropriate",
        rationale: cautionChecks.length > 0
          ? "No absolute contraindication was detected, but the doctor must confirm the caution items before prescribing."
          : "No hard contraindication was detected in the structured ED screen.",
        nextSteps: ["Confirm current medicines and cardiovascular risk.", "Open Parchment and prescribe within Parchment if satisfied."],
      }

  const edPreset = getEdPreset(preference)
  const prescriptionIntent = hasBlock ? undefined : makeIntent({
    presetLabel: "ED Parchment handoff context",
    medicationName: edPreset.medicationName,
    strength: edPreset.strength,
    form: edPreset.form,
    medicationSearchHint: edPreset.medicationSearchHint,
    directionsTemplate: edPreset.directionsTemplate,
    quantityTemplate: edPreset.quantityTemplate,
    repeatsTemplate: edPreset.repeatsTemplate,
    safetyChecks: ["No nitrates reported", "Cardiac screen reviewed", "Alpha blockers checked", "Current medications checked"],
    cautionChecks,
    alternativeNote: edPreset.alternativeNote,
  })

  const header = patientHeader(input)
  // Patient-story / UI sentence keeps the prior shape (goal-led). Only the
  // doctor's SOAP draft note moves to clinical voice. The cockpit renders the
  // story above the note.
  const storySentence = `${input.patientName || "Patient"} requests help to ${sentenceHumanize(goal)} with symptoms for ${sentenceHumanize(duration)}.`

  const subjective = [
    `${header}, c/o erectile dysfunction.`,
    duration ? `Symptoms for ${humanize(duration).toLowerCase()}.` : null,
    score ? `IIEF-5 ${score}/25.` : null,
    preference ? `Patient prefers ${humanize(preference).toLowerCase()} dosing.` : null,
  ]
    .filter(Boolean)
    .join(" ")

  const objective = [
    "Structured ED screen completed.",
    `Nitrates: ${yesNo(raw(answers, "edNitrates"))}.`,
    `Recent cardiac event: ${yesNo(raw(answers, "edRecentHeartEvent"))}.`,
    `Severe cardiac history: ${yesNo(raw(answers, "edSevereHeart"))}.`,
    `Alpha-blockers: ${yesNo(raw(answers, "edAlphaBlockers"))}.`,
    (hasRecentHeartEvent || hasSevereHeart || hasAlphaBlockers)
      ? `GP clearance reported: ${yesNo(raw(answers, "edGpCleared"))}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ")

  const assessment = hasBlock
    ? "Contraindication to PDE5 inhibitor therapy identified on screen. Not suitable for asynchronous prescribing."
    : cautionChecks.length > 0
      ? "ED with caution items on screen. No absolute contraindication identified, but safety context requires doctor confirmation before prescribing."
      : score && Number(score) <= 11
        ? "Moderate erectile dysfunction. No contraindications to PDE5 inhibitor identified on screen."
        : "Mild to moderate erectile dysfunction. No contraindications to PDE5 inhibitor identified on screen."

  const planText = hasBlock
    ? "Decline asynchronous prescribing. Advise patient to consult GP or cardiology for in-person review."
    : preference === "daily"
        ? "Tadalafil 5mg daily x 30 tablets, 2 repeats. Counsel on dosing, side effects (headache, flushing, dyspepsia, back pain), and to seek review if no response after 4 weeks or if any chest pain on activity."
        : "Sildenafil 50mg PRN x 8 tablets, 2 repeats. 1 tablet 1 hour before sexual activity, max 1 per 24h. Counsel on side effects (headache, flushing, dyspepsia, visual disturbance), and to seek review if no response or if any chest pain on activity."

  return {
    title: "Erectile dysfunction consult",
    patientStory: `${storySentence} Preference: ${sentenceHumanize(preference)}.`,
    keyFacts,
    safetyItems,
    recommendedPlan,
    prescriptionIntent,
    draftNote: note(subjective, objective, assessment, planText),
  }
}

function hairSummary(input: ClinicalCaseInput): ClinicalCaseSummary {
  const { answers } = input
  const validation = validateHairLossConsult(answers)
  const blockingFlags = validation.flags.filter((flag) => flag.type === "safety_block")
  const cautionFlags = validation.flags.filter((flag) => flag.type !== "safety_block")
  const goal = str(answers, "hairGoal") || "hair loss treatment"
  const onset = str(answers, "hairOnset") || "unspecified onset"
  const pattern = str(answers, "hairPattern") || "unspecified pattern"
  const preference = str(answers, "hairMedicationPreference") || "doctor decides"
  const reproductiveBlock = blockingFlags.some((flag) => flag.reason === "reproductive_contraindication")
  const oralRequested = preference === "oral"
  const hasBlock = reproductiveBlock && oralRequested

  const safetyItems: ClinicalSafetyItem[] = [
    ...blockingFlags.map((flag) => ({
      severity: hasBlock ? "block" as const : "caution" as const,
      label: flag.reason === "reproductive_contraindication" ? "Reproductive contraindication" : humanize(flag.reason),
      detail: flag.details || "Safety block detected.",
    })),
    ...cautionFlags.map((flag) => ({
      severity: "caution" as const,
      label: humanize(flag.reason),
      detail: flag.details || "Review before prescribing.",
    })),
  ]

  const keyFacts = compactFacts([
    { label: "Goal", value: humanize(goal) },
    { label: "Onset", value: humanize(onset) },
    { label: "Pattern", value: humanize(pattern) },
    { label: "Family history", value: humanize(str(answers, "hairFamilyHistory")) },
    { label: "Treatment preference", value: humanize(preference) },
    { label: "Reproductive risk", value: yesNo(raw(answers, "hairReproductive")) },
    { label: "Scalp concerns", value: scalpSummary(answers) },
    { label: "Low BP/dizziness", value: yesNo(raw(answers, "hairLowBP")) },
    { label: "Heart conditions/palpitations", value: yesNo(raw(answers, "hairHeartConditions")) },
    fact("Allergies", str(answers, "known_allergies")),
    fact("Current medications", str(answers, "current_medications")),
  ])

  const recommendedPlan: ClinicalPlan = hasBlock
    ? {
        action: "decline",
        title: "Do not prescribe oral hair loss medication",
        rationale: "The reproductive safety screen detected a contraindication.",
        nextSteps: ["Decline prescription request.", "Recommend GP or dermatologist review for safe alternatives."],
      }
    : {
        action: "prescribe",
        title: "Hair loss treatment pathway if clinically appropriate",
        rationale: reproductiveBlock
          ? "Oral finasteride is unsuitable from the reproductive screen; topical treatment can still be considered if clinically appropriate."
          : "No hard contraindication was detected in the structured hair-loss screen.",
        nextSteps: ["Confirm pattern and reversible causes.", "Open Parchment and prescribe within Parchment if satisfied."],
      }

  const hairCautionChecks = safetyItems
    .filter((item) => item.severity === "caution")
    .map((item) => item.label)
  const hairPreset = resolveHairLossPreset(preference, reproductiveBlock)
  const prescriptionIntent = hasBlock ? undefined : makeIntent({
    presetLabel: "Hair loss Parchment handoff context",
    medicationName: hairPreset.medicationName,
    strength: hairPreset.strength,
    form: hairPreset.form,
    medicationSearchHint: hairPreset.medicationSearchHint,
    directionsTemplate: hairPreset.directionsTemplate,
    quantityTemplate: hairPreset.quantityTemplate,
    repeatsTemplate: hairPreset.repeatsTemplate,
    safetyChecks: ["Reproductive screen reviewed", "Scalp screen reviewed", "BP/cardiac screen reviewed", "Current medications checked"],
    cautionChecks: hairCautionChecks,
    alternativeNote: hairPreset.alternativeNote,
  })

  const header = patientHeader(input)
  const storySentence = `${input.patientName || "Patient"} requests hair loss treatment for ${sentenceHumanize(pattern)} with onset ${sentenceHumanize(onset)}.`

  const subjective = [
    `${header}, c/o androgenetic-pattern hair loss (${humanize(pattern).toLowerCase()}).`,
    onset ? `Onset ${humanize(onset).toLowerCase()}.` : null,
    `Goal: ${humanize(goal).toLowerCase()}.`,
    preference ? `Patient prefers ${humanize(preference).toLowerCase()} option.` : null,
  ]
    .filter(Boolean)
    .join(" ")

  const objective = [
    "Structured hair loss screen completed.",
    `Reproductive risk: ${yesNo(raw(answers, "hairReproductive"))}.`,
    `Scalp screen: ${scalpSummary(answers)}.`,
    `Low BP / dizziness: ${yesNo(raw(answers, "hairLowBP"))}.`,
    `Heart conditions / palpitations: ${yesNo(raw(answers, "hairHeartConditions"))}.`,
  ]
    .filter(Boolean)
    .join(" ")

  const assessment = hasBlock
    ? "Reproductive contraindication identified on screen. Not suitable for oral hair loss prescribing via this workflow."
    : "Likely androgenetic alopecia. No contraindications identified on screen."

  const planText = hasBlock
    ? "Decline oral hair loss prescribing. Advise GP or dermatologist review for safe alternatives."
    : preference === "oral"
      ? "Finasteride 1mg daily, 90 tablets, 3 repeats. Counsel on onset of effect (3-6 months), sexual side effects (typically reversible), and the need to stop and seek review if mood symptoms develop. Adjunct topical minoxidil 5% may be considered."
      : preference === "topical"
        ? "Topical minoxidil 5% twice daily to dry scalp. Counsel on 3-6 month onset, initial shedding phase, and to stop if scalp irritation or unwanted facial hair develops."
        : "Doctor to select between finasteride 1mg daily or topical minoxidil 5% based on preference and contraindications. Counsel on expected onset of effect (3-6 months)."

  return {
    title: "Hair loss consult",
    patientStory: `${storySentence} Preference: ${sentenceHumanize(preference)}.`,
    keyFacts,
    safetyItems,
    recommendedPlan,
    prescriptionIntent,
    draftNote: note(subjective, objective, assessment, planText),
  }
}

function resolveHairLossPreset(
  preference: string,
  reproductiveBlock: boolean,
): {
  medicationName: string
  strength: string
  form: string
  quantityTemplate: string
  repeatsTemplate: string
  directionsTemplate: string
  medicationSearchHint: string
  alternativeNote?: string
} {
  const topicalPreset = {
    medicationName: "Minoxidil",
    strength: "5%",
    form: "topical solution or foam",
    quantityTemplate: "1 bottle",
    repeatsTemplate: "3",
    directionsTemplate: "Apply to affected scalp once to twice daily. Counsel on 3-6 month onset, possible initial shedding, and scalp irritation.",
    medicationSearchHint: "Minoxidil 5% topical",
  }

  if (reproductiveBlock) {
    return {
      ...topicalPreset,
      alternativeNote: "Avoid oral finasteride because the reproductive safety screen is positive.",
    }
  }

  const oralPreset = {
    medicationName: "Finasteride",
    strength: "1mg",
    form: "tablet",
    quantityTemplate: "90 tablets",
    repeatsTemplate: "3",
    directionsTemplate: "Take 1 tablet once daily. Counsel on 3-6 month onset, sexual side effects, mood symptoms, and reproductive safety.",
    medicationSearchHint: "Finasteride 1mg tablet",
  }

  if (preference === "combination") {
    return {
      ...oralPreset,
      alternativeNote: "Consider adjunct topical minoxidil 5% if the doctor is satisfied it is appropriate.",
    }
  }

  if (preference === "doctor_decides") {
    return {
      ...oralPreset,
      alternativeNote: "Topical minoxidil 5% is an alternative if oral treatment is not suitable or not preferred.",
    }
  }

  return oralPreset
}

function scalpSummary(answers: Answers): string {
  if (bool(answers, "scalpNone")) return "No scalp concerns"
  const selected = [
    bool(answers, "scalpDandruff") && "dandruff",
    bool(answers, "scalpPsoriasis") && "psoriasis",
    bool(answers, "scalpItching") && "itching",
    bool(answers, "scalpFolliculitis") && "folliculitis",
  ].filter(Boolean)
  return selected.length > 0 ? selected.join(", ") : "Not provided"
}

function repeatSummary(input: ClinicalCaseInput): ClinicalCaseSummary {
  const { answers } = input
  const medications = extractRepeatScriptMedications(answers)
  const medicationLabels = medications.map(formatRepeatScriptMedicationCompactLabel)
  const primaryMedication = medications[0]
  const primaryMedicationParts = primaryMedication
    ? getRepeatScriptMedicationDisplayParts(primaryMedication)
    : null
  const hasMultipleMedications = medicationLabels.length > 1
  const medicationName = hasMultipleMedications
    ? medicationLabels.join("; ")
    : primaryMedicationParts?.name || str(answers, "medicationName") || str(answers, "medication_name") || "Requested medication"
  const strength = hasMultipleMedications
    ? undefined
    : primaryMedicationParts?.strength || str(answers, "medicationStrength") || str(answers, "medication_strength")
  const form = hasMultipleMedications
    ? undefined
    : primaryMedicationParts?.form || str(answers, "medicationForm") || str(answers, "medication_form")
  const requestedMedicationValue = medicationLabels.length > 0
    ? medicationLabels.join("; ")
    : medicationName
  const history = str(answers, "prescriptionHistory") || str(answers, "last_prescribed") || "not specified"
  const currentDose = str(answers, "currentDose") || str(answers, "current_dose") || str(answers, "dosage_instructions")
  const controlled = medications.length > 0
    ? medications.some((medication) => isControlledSubstance(buildRepeatScriptMedicationValidationText(medication)))
    : isControlledSubstance(medicationName)
  const allergies = firstStr(answers, ["known_allergies", "allergies"])
  const conditions = firstStr(answers, ["existing_conditions", "conditions"])
  const currentMedications = firstStr(answers, ["current_medications", "otherMedications", "other_medications"])
  const pregnancyAnswer = raw(answers, "isPregnantOrBreastfeeding") ?? raw(answers, "is_pregnant_or_breastfeeding")
  const adverseReactionAnswer = raw(answers, "hasAdverseMedicationReactions") ?? raw(answers, "has_adverse_medication_reactions")

  const keyFacts = compactFacts([
    { label: hasMultipleMedications ? "Requested medications" : "Requested medication", value: requestedMedicationValue },
    !hasMultipleMedications ? fact("Strength", strength) : null,
    !hasMultipleMedications ? fact("Form", form) : null,
    { label: "Last prescribed", value: humanize(history) },
    fact("Patient-reported dose", currentDose),
    fact("Last prescription date", str(answers, "lastPrescriptionDate")),
    fact("Side effects", str(answers, "sideEffects")),
    fact("Allergies", allergies),
    fact("Conditions", conditions),
    fact("Current medications", currentMedications),
    pregnancyAnswer !== undefined ? { label: "Pregnant/breastfeeding", value: yesNo(pregnancyAnswer) } : null,
    adverseReactionAnswer !== undefined ? { label: "Adverse medication reactions", value: yesNo(adverseReactionAnswer) } : null,
  ])

  // Non-blocking review cautions. A controlled-substance block short-circuits
  // everything else; otherwise surface "patient unsure" and "clinician-
  // administered" flags so the doctor verifies the exact product before
  // prescribing. Neither gates the approve flow — see lib/clinical/medication-flags.ts.
  const medicationFlagText = [
    requestedMedicationValue,
    strength,
    form,
    currentDose,
    ...medications.map((medication) => buildRepeatScriptMedicationValidationText(medication)),
  ]
    .filter(Boolean)
    .join(" ")
  const patientUnsure = hasUncertainMedicationAnswer([
    primaryMedicationParts?.name,
    strength,
    form,
    ...medicationLabels,
  ])
  const clinicianAdministered = requiresClinicalAdministration(medicationFlagText)

  const safetyItems: ClinicalSafetyItem[] = []
  if (controlled) {
    safetyItems.push({
      severity: "block",
      label: "Controlled substance",
      detail: "Schedule 8 or controlled medicines are outside this repeat prescription workflow.",
    })
  } else {
    if (clinicianAdministered) {
      safetyItems.push({
        severity: "caution",
        label: "Clinician-administered medicine",
        detail: "This looks like an injection, vaccine, infusion, or implant that must be given in a clinical setting. A telehealth script alone may not resolve the patient's need — confirm they can have it administered before prescribing.",
      })
    }
    if (patientUnsure) {
      safetyItems.push({
        severity: "caution",
        label: "Patient unsure of medication details",
        detail: "The patient could not confirm the medicine name, strength, or form. Verify the exact product and regimen in Parchment before prescribing.",
      })
    }
  }

  const recommendedPlan: ClinicalPlan = controlled
    ? {
        action: "decline",
        title: "Do not prescribe through this workflow",
        rationale: "The requested medicine matches controlled-substance safeguards.",
        nextSteps: ["Decline and direct patient to their regular GP or in-person care."],
      }
    : {
        action: "prescribe",
        title: "Repeat prescription if stable and clinically appropriate",
        rationale: "The request is for a repeat medication and no controlled-substance block was detected.",
        nextSteps: ["Confirm ongoing indication, dose stability, allergies and interactions.", "Open Parchment and prescribe within Parchment if satisfied."],
      }

  const prescriptionIntent = controlled ? undefined : makeIntent({
    presetLabel: "Repeat prescription Parchment context",
    medicationName,
    strength,
    form,
    medicationSearchHint: hasMultipleMedications
      ? medicationLabels[0]
      : [medicationName, strength, form].filter(Boolean).join(" "),
    directionsTemplate: currentDose
      ? `${hasMultipleMedications ? `Patient requested multiple medicines: ${requestedMedicationValue}. ` : ""}Patient reports current dose: ${currentDose}. Confirm regimen, quantity, repeats and indication in Parchment before prescribing.`
      : `${hasMultipleMedications ? `Patient requested multiple medicines: ${requestedMedicationValue}. ` : ""}Repeat existing regimen after doctor confirms dose, quantity, repeats and indication in Parchment.`,
    quantityTemplate: hasMultipleMedications ? undefined : "Match clinically appropriate repeat quantity in Parchment",
    repeatsTemplate: hasMultipleMedications ? undefined : "Doctor to confirm in Parchment",
    safetyChecks: ["Repeat history reviewed", "Allergies checked", "Current medications checked", "Controlled-substance screen checked"],
  })

  const header = patientHeader(input)
  const storySentence = `${input.patientName || "Patient"} requests a repeat prescription for ${requestedMedicationValue}.${currentDose ? ` Patient reports current dose: ${currentDose}.` : ""}`

  const subjective = [
    `${header}, requesting repeat prescription for ${requestedMedicationValue}.`,
    currentDose ? `Patient reports current dose: ${currentDose}.` : null,
    history && history !== "not specified" ? `Last prescribed ${humanize(history).toLowerCase()}.` : null,
  ]
    .filter(Boolean)
    .join(" ")

  const objective = [
    "Telehealth review of structured repeat request.",
    allergies ? `Allergies: ${allergies}.` : "No allergies reported.",
    currentMedications ? `Current medicines: ${currentMedications}.` : "No other current medicines reported.",
    pregnancyAnswer !== undefined ? `Pregnant/breastfeeding: ${yesNo(pregnancyAnswer)}.` : null,
    adverseReactionAnswer !== undefined ? `Adverse medication reactions: ${yesNo(adverseReactionAnswer)}.` : null,
  ]
    .filter(Boolean)
    .join(" ")

  const assessment = controlled
    ? `${medicationName} is a controlled substance. Repeat prescription via this workflow is not permitted.`
    : `Stable patient on ${medicationName}. No safety flags identified on screen.`

  const planText = controlled
    ? "Decline repeat prescription. Advise patient to see their regular GP for in-person review."
    : `Repeat ${medicationName}${currentDose ? ` at ${currentDose}` : ""}. Confirm quantity and repeats in Parchment. Advise patient to book a face-to-face review if dose or condition changes.`

  return {
    title: "Repeat prescription",
    patientStory: `${storySentence} Patient reports prior prescription history: ${sentenceHumanize(history)}.`,
    keyFacts,
    safetyItems,
    recommendedPlan,
    prescriptionIntent,
    draftNote: note(subjective, objective, assessment, planText),
  }
}

function medCertSummary(input: ClinicalCaseInput): ClinicalCaseSummary {
  const { answers } = input
  const certType = str(answers, "certType") || str(answers, "certificate_type") || "medical certificate"
  const duration = str(answers, "duration")
  const startDate = str(answers, "startDate") || str(answers, "start_date")
  const symptoms = raw(answers, "symptoms")
  const rawSymptomDetails = str(answers, "symptomDetails") || str(answers, "symptom_details") || ""
  const hasSymptomDetails = rawSymptomDetails.trim().length > 0
  const symptomDuration = str(answers, "symptomDuration") || str(answers, "symptom_duration")
  const normalisedSymptoms = normaliseSymptomText(rawSymptomDetails)
  const header = patientHeader(input)
  const certTypeLabel = humanize(certType).toLowerCase()
  const certificateLabel = certTypeLabel.endsWith("certificate")
    ? certTypeLabel
    : `${certTypeLabel} certificate`
  const requestLabel = duration ? `${duration}-day ${certificateLabel}` : certificateLabel
  const durationDays = duration ? parseInt(duration, 10) : null

  const subjective = [
    `${header}.`,
    normalisedSymptoms || (rawSymptomDetails ? rawSymptomDetails + "." : null),
    symptomDuration ? `Symptom duration ${humanize(symptomDuration).toLowerCase()}.` : null,
    duration ? `Requesting ${requestLabel}.` : `Requesting a ${requestLabel}.`,
  ]
    .filter(Boolean)
    .join(" ")

  const objective = "Telehealth consultation. No physical examination."

  const assessment = hasSymptomDetails
    ? "Symptoms consistent with self-limiting acute illness."
    : "Insufficient symptom detail to safely determine certificate suitability."

  const safetyNetReturn = durationDays && durationDays <= 2
    ? "Return if symptoms persist beyond 7 days, or develop high fever (>39 C), shortness of breath, chest pain, or inability to keep fluids down."
    : "Return if symptoms persist beyond the certificate period, or develop high fever (>39 C), shortness of breath, chest pain, or inability to keep fluids down."

  const planParts = [
    hasSymptomDetails
      ? duration && startDate
        ? `${duration}-day medical certificate issued from ${startDate}.`
        : "Medical certificate issued."
      : "Request symptom detail before issuing a certificate.",
    hasSymptomDetails ? "Symptomatic management advised (rest, fluids, paracetamol PRN)." : null,
    hasSymptomDetails ? safetyNetReturn : null,
  ]
    .filter(Boolean)
  const planText = planParts.join(" ")

  const keyFacts = compactFacts([
    { label: "Certificate type", value: humanize(certType) },
    duration ? { label: "Requested duration", value: `${duration} day${duration === "1" ? "" : "s"}` } : null,
    fact("Start date", startDate),
    factHumanized("Symptoms", symptoms),
    factHumanized("Symptom duration", symptomDuration),
    fact("Patient note", rawSymptomDetails),
  ])

  return {
    title: "Medical certificate request",
    patientStory: displayPatientStory(subjective),
    keyFacts,
    safetyItems: [],
    recommendedPlan: hasSymptomDetails
      ? {
          action: "approve",
          title: "Confirm certificate rules are met",
          rationale: "Certificate requests should be approved only when symptoms and requested dates are clinically consistent.",
          nextSteps: ["Confirm symptom story and duration.", "Approve certificate only if the requested absence is clinically appropriate."],
        }
      : {
          action: "request_info",
          title: "Request symptom detail",
          rationale: "A certificate should not be issued from a blank symptom description.",
          nextSteps: ["Ask the patient to describe symptoms and onset.", "Reopen the case once the patient replies."],
        },
    draftNote: note(subjective, objective, assessment, planText),
  }
}

function womensHealthSummary(input: ClinicalCaseInput): ClinicalCaseSummary {
  const { answers } = input
  const option = str(answers, "womensHealthOption") || ""
  const isUti = option === "uti"

  if (isUti) {
    const symptoms = Array.isArray(raw(answers, "utiSymptoms"))
      ? (raw(answers, "utiSymptoms") as unknown[]).map(humanize).filter(Boolean)
      : []
    const symptomsLabel = symptoms.length > 0 ? symptoms.join(", ") : "Not provided"
    const redFlags = answerYes(answers, "utiRedFlags")
    const pregnancyRaw = str(answers, "utiPregnant")
    const pregnant = pregnancyRaw === "yes"
    const pregnancyUnsure = pregnancyRaw === "not_sure"
    const details = str(answers, "utiDetails")

    const safetyItems: ClinicalSafetyItem[] = [
      {
        severity: "info" as const,
        label: "Reported symptoms",
        detail: symptoms.length > 0
          ? `Patient reports: ${symptomsLabel}.`
          : "No symptoms recorded in the structured screen.",
      },
      redFlags
        ? {
            severity: "block" as const,
            label: "Red flags",
            detail: "RED FLAGS REPORTED - decline / needs in-person assessment (e.g. fever, flank pain, vomiting, blood in urine, or systemic features suggesting upper-tract or complicated infection).",
          }
        : {
            severity: "info" as const,
            label: "Red flags",
            detail: "Red flags: none reported on the structured screen.",
          },
      pregnant
        ? {
            severity: "block" as const,
            label: "Pregnancy",
            detail: "Pregnant - UTI in pregnancy requires in-person assessment and pregnancy-safe antibiotic selection. Not suitable for asynchronous prescribing.",
          }
        : pregnancyUnsure
          ? {
              severity: "caution" as const,
              label: "Pregnancy",
              detail: "Pregnancy status unsure - confirm before prescribing; antibiotic choice and safety differ in pregnancy.",
            }
          : {
              severity: "info" as const,
              label: "Pregnancy",
              detail: "Not pregnant per patient report.",
            },
    ]

    const hasBlock = redFlags || pregnant
    const keyFacts = compactFacts([
      { label: "Symptoms", value: symptomsLabel },
      { label: "Red flags", value: yesNo(raw(answers, "utiRedFlags")) },
      { label: "Pregnant", value: humanize(pregnancyRaw) },
      fact("Patient details", details),
      fact("Allergies", firstStr(answers, ["known_allergies", "allergies"])),
      fact("Conditions", firstStr(answers, ["existing_conditions", "conditions"])),
      fact("Current medications", firstStr(answers, ["current_medications", "otherMedications", "other_medications"])),
    ])

    const recommendedPlan: ClinicalPlan = hasBlock
      ? {
          action: "request_info",
          title: "Do not prescribe UTI antibiotics asynchronously",
          rationale: redFlags
            ? "Red flags were reported on the structured screen."
            : "Pregnancy was reported, which requires in-person assessment and pregnancy-safe antibiotic selection.",
          nextSteps: [
            "Decline or convert to a clinician-led / in-person consultation.",
            "Advise GP, urgent care, or emergency review where systemic features are present.",
          ],
        }
      : {
          action: "prescribe",
          title: "Uncomplicated lower UTI pathway if clinically appropriate",
          rationale: "No red flags and not pregnant on the structured screen. Confirm symptom picture before prescribing.",
          nextSteps: [
            "Confirm typical lower-UTI symptoms and absence of upper-tract features.",
            "Check allergies and current medicines, then open Parchment and prescribe within Parchment if satisfied.",
          ],
        }
    const prescriptionIntent = hasBlock ? undefined : makeIntent({
      presetLabel: "UTI Parchment handoff context",
      medicationSearchHint: "UTI antibiotic",
      directionsTemplate: "Doctor to select first-line uncomplicated lower-UTI antibiotic in Parchment after confirming symptoms, allergies, pregnancy status, renal considerations, and local guidance.",
      quantityTemplate: "Doctor to confirm in Parchment",
      repeatsTemplate: "Usually no repeat unless clinically justified",
      safetyChecks: [
        "No UTI red flags reported",
        pregnancyUnsure ? "Pregnancy status needs confirmation" : "Not pregnant per patient report",
        "Allergies checked",
        "Current medicines checked",
      ],
      cautionChecks: pregnancyUnsure ? ["Pregnancy status unsure"] : undefined,
    })

    const header = patientHeader(input)
    const storySentence = `${input.patientName || "Patient"} requests treatment for symptoms of a urinary tract infection.`

    const subjective = [
      `${header}, c/o urinary symptoms suggestive of a UTI.`,
      symptoms.length > 0 ? `Reported symptoms: ${symptomsLabel.toLowerCase()}.` : null,
      details ? `Patient notes: ${details}.` : null,
    ]
      .filter(Boolean)
      .join(" ")

    const objective = [
      "Structured UTI screen completed.",
      `Red flags: ${yesNo(raw(answers, "utiRedFlags"))}.`,
      `Pregnant: ${humanize(pregnancyRaw)}.`,
    ]
      .filter(Boolean)
      .join(" ")

    const assessment = hasBlock
      ? redFlags
        ? "Red flags reported on UTI screen. Not suitable for asynchronous prescribing - in-person assessment required."
        : "Pregnancy reported (or possible). UTI in pregnancy requires in-person assessment and pregnancy-safe prescribing."
      : "Likely uncomplicated lower urinary tract infection. No red flags identified on screen and not pregnant per report."

    const planText = hasBlock
      ? "Decline asynchronous prescribing. Advise in-person review (GP / urgent care) for assessment and appropriate antibiotic selection."
      : "First-line empirical therapy for uncomplicated lower UTI if clinically appropriate (e.g. trimethoprim or nitrofurantoin per local guidance and allergies). Counsel on fluids, expected resolution, and to seek review if symptoms worsen, fever or flank pain develop, or no improvement within 48 hours."

    return {
      title: "Women's health · UTI",
      patientStory: storySentence,
      keyFacts,
      safetyItems,
      recommendedPlan,
      prescriptionIntent,
      draftNote: note(subjective, objective, assessment, planText),
    }
  }

  // New / switch contraceptive pill (ocp_new)
  const contraceptionType = str(answers, "contraceptionType") || ""
  const isSwitch = contraceptionType === "switch"
  const isRepeatRequest = contraceptionType === "continue"
  const requestLabel = isSwitch ? "Switch pill" : isRepeatRequest ? "Repeat prescription route" : "Start pill"
  const current = str(answers, "contraceptionCurrent")
  const pregnancyRaw = str(answers, "pregnancyStatus")
  const pregnant = pregnancyRaw === "yes"
  const pregnancyUnsure = pregnancyRaw === "not_sure"
  const migraineAura = answerYes(answers, "womens_migraine_aura")
  const clotHistory = answerYes(answers, "womens_blood_clot_history")
  const smoker = answerYes(answers, "womens_smoker")
  const lastPeriod = str(answers, "lastPeriod")
  const details = str(answers, "contraceptionDetails")

  const combinedContraindicated = migraineAura || clotHistory
  const hasBlock = pregnant

  const safetyItems: ClinicalSafetyItem[] = [
    {
      severity: "info" as const,
      label: "Request type",
      detail: isSwitch
        ? "Patient wants to switch contraceptive pill."
        : isRepeatRequest
          ? "Patient selected current-pill repeat; route through the repeat-prescription workflow before prescribing."
          : "Patient wants to start a contraceptive pill.",
    },
    pregnant
      ? {
          severity: "block" as const,
          label: "Pregnancy",
          detail: "Pregnant - do not start the pill. Discuss pregnancy options and arrange appropriate care.",
        }
      : pregnancyUnsure
        ? {
            severity: "caution" as const,
            label: "Pregnancy",
            detail: "Pregnancy status unsure - reasonably exclude pregnancy before starting the pill.",
          }
        : {
            severity: "info" as const,
            label: "Pregnancy",
            detail: "Not pregnant per patient report.",
          },
    migraineAura
      ? {
          severity: "block" as const,
          label: "Migraine with aura",
          detail: "Migraine with aura: YES - combined oral contraceptive contraindicated (raised stroke risk). Steer to a progestogen-only pill.",
        }
      : {
          severity: "info" as const,
          label: "Migraine with aura",
          detail: "Migraine with aura: none reported.",
        },
    clotHistory
      ? {
          severity: "block" as const,
          label: "Blood clot history",
          detail: "Blood clot history: YES - combined oral contraceptive contraindicated (VTE risk). Steer to a progestogen-only pill.",
        }
      : {
          severity: "info" as const,
          label: "Blood clot history",
          detail: "Blood clot history: none reported.",
        },
    smoker
      ? {
          severity: "caution" as const,
          label: "Smoker",
          detail: "Smoker: YES - verify age; cardiovascular risk if 35+. Combined pill generally avoided in smokers aged 35 or over - consider progestogen-only.",
        }
      : {
          severity: "info" as const,
          label: "Smoker",
          detail: "Non-smoker per patient report.",
        },
  ]

  const keyFacts = compactFacts([
    { label: "Request", value: requestLabel },
    fact("Current pill", current),
    { label: "Pregnant", value: humanize(pregnancyRaw) },
    { label: "Migraine with aura", value: yesNo(raw(answers, "womens_migraine_aura")) },
    { label: "Blood clot history", value: yesNo(raw(answers, "womens_blood_clot_history")) },
    { label: "Smoker", value: yesNo(raw(answers, "womens_smoker")) },
    fact("Last period", lastPeriod),
    fact("Patient details", details),
    fact("Allergies", firstStr(answers, ["known_allergies", "allergies"])),
    fact("Conditions", firstStr(answers, ["existing_conditions", "conditions"])),
    fact("Current medications", firstStr(answers, ["current_medications", "otherMedications", "other_medications"])),
  ])

  const recommendedPlan: ClinicalPlan = hasBlock
    ? {
        action: "request_info",
        title: "Do not start the pill",
        rationale: "Pregnancy was reported on the structured screen.",
        nextSteps: [
          "Do not prescribe. Discuss pregnancy options and arrange appropriate care.",
        ],
      }
    : combinedContraindicated
      ? {
          action: "prescribe",
          title: "Progestogen-only pill pathway if clinically appropriate",
          rationale: "A combined-pill contraindication (migraine with aura and/or clot history) was detected. Combined oral contraceptive is unsuitable; a progestogen-only pill can still be considered.",
          nextSteps: [
            "Confirm the contraindication and steer to a progestogen-only pill.",
            "Check allergies and current medicines, then open Parchment and prescribe within Parchment if satisfied.",
          ],
        }
      : {
          action: "prescribe",
          title: "Contraceptive pill pathway if clinically appropriate",
          rationale: smoker
            ? "No absolute contraindication detected, but verify age for the smoking caution before choosing a combined pill."
            : "No combined-pill contraindication was detected on the structured screen.",
          nextSteps: [
            "Confirm blood pressure / cardiovascular risk and verify age if a smoker.",
            "Check allergies and current medicines, then open Parchment and prescribe within Parchment if satisfied.",
          ],
        }
  const prescriptionIntent = hasBlock ? undefined : makeIntent({
    presetLabel: combinedContraindicated
      ? "Progestogen-only pill Parchment context"
      : "Contraceptive pill Parchment context",
    medicationSearchHint: combinedContraindicated ? "progestogen-only pill" : "contraceptive pill",
    directionsTemplate: combinedContraindicated
      ? "Doctor to select a progestogen-only pill in Parchment if clinically appropriate after confirming pregnancy exclusion, allergies, current medicines, and patient preference."
      : "Doctor to select combined or progestogen-only pill in Parchment if clinically appropriate after confirming pregnancy exclusion, blood pressure or cardiovascular risk, allergies, current medicines, and patient preference.",
    quantityTemplate: "Doctor to confirm in Parchment",
    repeatsTemplate: "Doctor to confirm in Parchment",
    safetyChecks: [
      pregnancyUnsure ? "Pregnancy needs reasonable exclusion" : "Not pregnant per patient report",
      "Migraine with aura checked",
      "Blood clot history checked",
      "Smoking status checked",
      "Allergies checked",
      "Current medicines checked",
    ],
    cautionChecks: [
      pregnancyUnsure ? "Pregnancy status unsure" : null,
      smoker ? "Smoker" : null,
      combinedContraindicated ? "Combined pill contraindication: steer to progestogen-only" : null,
    ].filter((item): item is string => Boolean(item)),
  })

  const header = patientHeader(input)
  const requestVerb = isSwitch ? "switch" : isRepeatRequest ? "repeat" : "start"
  const storySentence = `${input.patientName || "Patient"} requests to ${requestVerb} a contraceptive pill.`

  const subjective = [
    `${header}, requesting to ${requestVerb} a contraceptive pill.`,
    isRepeatRequest ? "Repeat request should be handled through the repeat-prescription workflow." : null,
    isSwitch && current ? `Currently on ${current}.` : null,
    lastPeriod ? `Last period: ${lastPeriod}.` : null,
    details ? `Patient notes: ${details}.` : null,
  ]
    .filter(Boolean)
    .join(" ")

  const objective = [
    "Structured contraception screen completed.",
    `Pregnant: ${humanize(pregnancyRaw)}.`,
    `Migraine with aura: ${yesNo(raw(answers, "womens_migraine_aura"))}.`,
    `Blood clot history: ${yesNo(raw(answers, "womens_blood_clot_history"))}.`,
    `Smoker: ${yesNo(raw(answers, "womens_smoker"))}.`,
  ]
    .filter(Boolean)
    .join(" ")

  const assessment = hasBlock
    ? "Pregnancy reported. Do not start the pill via this workflow."
    : combinedContraindicated
      ? "Combined oral contraceptive contraindicated on screen (migraine with aura and/or VTE history). Progestogen-only pill may be considered if clinically appropriate."
      : "No combined-pill contraindication identified on screen. Suitable for contraceptive pill prescribing if clinically appropriate."

  const planText = hasBlock
    ? "Do not prescribe. Discuss pregnancy options and arrange appropriate care."
    : combinedContraindicated
      ? "Prescribe a progestogen-only pill if clinically appropriate. Counsel on consistent daily timing, missed-pill rules, and to seek review for new neurological symptoms or leg/chest symptoms suggesting clot."
      : "Prescribe a contraceptive pill if clinically appropriate (combined or progestogen-only per preference and risk). Counsel on correct use, missed-pill rules, VTE warning signs, and follow-up blood pressure review."

  return {
    title: "Women's health · New pill",
    patientStory: storySentence,
    keyFacts,
    safetyItems,
    recommendedPlan,
    prescriptionIntent,
    draftNote: note(subjective, objective, assessment, planText),
  }
}

/**
 * Fallback summary for consult intakes that don't have a specialty handler.
 * Covers three cases:
 *   1. Legacy `subtype = 'general'` rows from before the 2026-05-20 retirement
 *      (operator should still be able to view them in the case detail page).
 *   2. The gated `weight_loss` subtype if it somehow reaches a doctor before
 *      its dedicated summary is built (`womens_health` now has a dedicated
 *      `womensHealthSummary` handler).
 *   3. Any future consult subtype added to the URL layer before its summary
 *      is wired up.
 * Keeps the payload small — surfaces the raw answers and tells the doctor to
 * decide manually.
 */
function unknownConsultSummary(input: ClinicalCaseInput): ClinicalCaseSummary {
  const { answers } = input
  const details = str(answers, "consultDetails") || "No structured patient description available."
  const subtypeLabel = input.subtype ? humanize(input.subtype) : "Unspecified"
  const recommendedPlan: ClinicalPlan = {
    action: "request_info",
    title: "Full manual review",
    rationale: "No automated summary is available for this consult type. Review the raw answers below before deciding.",
    nextSteps: [
      "Read the patient's free text and any structured answers.",
      "Decide: approve, request more info, or decline.",
    ],
  }

  const header = patientHeader(input)
  const subjective = `${header} (subtype: ${subtypeLabel}). ${details}`
  const objective = "Free-text consult intake. No structured screener for this subtype in automated summary."
  const assessment = "Specialty consult outside automated summary scope. Full doctor review required."
  const planText = "Read patient free text. Decide: approve, request more info, or decline."

  return {
    title: `Consult · ${subtypeLabel}`,
    patientStory: details,
    keyFacts: compactFacts([
      fact("Subtype", input.subtype ?? null),
      fact("Allergies", firstStr(answers, ["known_allergies", "allergies"])),
      fact("Conditions", firstStr(answers, ["existing_conditions", "conditions"])),
      fact("Current medications", firstStr(answers, ["current_medications", "otherMedications", "other_medications"])),
    ]),
    safetyItems: [],
    recommendedPlan,
    draftNote: note(subjective, objective, assessment, planText),
  }
}

export function buildClinicalCaseSummary(input: ClinicalCaseInput): ClinicalCaseSummary {
  if (input.category === "consult" && input.subtype === "ed") return edSummary(input)
  if (input.category === "consult" && input.subtype === "hair_loss") return hairSummary(input)
  if (input.category === "consult" && input.subtype === "womens_health") return womensHealthSummary(input)
  if (input.category === "consult") return unknownConsultSummary(input)
  if (input.serviceType === "med_certs" || input.category === "medical_certificate") return medCertSummary(input)
  if (
    input.category === "prescription" ||
    input.serviceType === "common_scripts" ||
    input.serviceType === "repeat_rx" ||
    input.serviceType === "prescription"
  ) {
    return repeatSummary(input)
  }

  return unknownConsultSummary(input)
}
