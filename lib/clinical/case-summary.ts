import {
  validateEdConsult,
  validateHairLossConsult,
} from "@/lib/clinical/consult-validators"
import { getEdPreset } from "@/lib/clinical/ed-prescribing-presets"
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
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
  const lines = [
    intent.presetLabel,
    intent.medicationName ? `Medication: ${intent.medicationName}` : null,
    intent.strength ? `Strength: ${intent.strength}` : null,
    intent.form ? `Form: ${intent.form}` : null,
    intent.medicationSearchHint ? `Search hint: ${intent.medicationSearchHint}` : null,
    `Directions: ${intent.directionsTemplate}`,
    intent.quantityTemplate ? `Quantity: ${intent.quantityTemplate}` : null,
    intent.repeatsTemplate ? `Repeats: ${intent.repeatsTemplate}` : null,
    intent.safetyChecks.length > 0 ? `Safety checks: ${intent.safetyChecks.join("; ")}` : null,
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

function note(subjective: string, objective: string, assessment: string, plan: string): string {
  return [`S: ${subjective}`, `O: ${objective}`, `A: ${assessment}`, `P: ${plan}`].join("\n")
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
  const needsLiveReview = !hasBlock && (hasRecentHeartEvent || hasSevereHeart || hasAlphaBlockers)
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

  const action: ClinicalPlanAction = hasBlock ? "decline" : needsLiveReview ? "needs_call" : "prescribe"
  const recommendedPlan: ClinicalPlan = hasBlock
    ? {
        action,
        title: "Do not prescribe ED medication asynchronously",
        rationale: "A contraindication or high-risk cardiac screen was detected.",
        nextSteps: ["Decline or convert to a clinician-led consultation.", "Advise GP/cardiology review where relevant."],
      }
    : needsLiveReview
      ? {
          action,
          title: "Live review before ED prescribing",
          rationale: "The patient reported cardiac history or alpha-blocker use that needs clinician verification before any Parchment action.",
          nextSteps: ["Call the patient or verify GP/cardiology clearance.", "Confirm current medicines, blood pressure context, and dosing separation before prescribing."],
        }
    : {
        action,
        title: "PDE5 inhibitor pathway if clinically appropriate",
        rationale: "No hard contraindication was detected in the structured ED screen.",
        nextSteps: ["Confirm current medicines and cardiovascular risk.", "Open Parchment and prescribe within Parchment if satisfied."],
      }

  const edPreset = getEdPreset(preference)
  const prescriptionIntent = hasBlock || needsLiveReview ? undefined : makeIntent({
    presetLabel: "ED prescribing preset",
    medicationName: edPreset.medicationName,
    strength: edPreset.strength,
    form: edPreset.form,
    medicationSearchHint: edPreset.medicationSearchHint,
    directionsTemplate: edPreset.directionsTemplate,
    quantityTemplate: edPreset.quantityTemplate,
    repeatsTemplate: edPreset.repeatsTemplate,
    safetyChecks: ["No nitrates reported", "Cardiac screen reviewed", "Alpha blockers checked", "Current medications checked"],
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
    : needsLiveReview
      ? "Cardiac history or alpha-blocker use requires clinician verification before prescribing."
      : score && Number(score) <= 11
        ? "Moderate erectile dysfunction. No contraindications to PDE5 inhibitor identified on screen."
        : "Mild to moderate erectile dysfunction. No contraindications to PDE5 inhibitor identified on screen."

  const planText = hasBlock
    ? "Decline asynchronous prescribing. Advise patient to consult GP or cardiology for in-person review."
    : needsLiveReview
      ? "Call patient to verify cardiac context and confirm GP clearance before any prescribing decision."
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
  const hasBlock = blockingFlags.length > 0
  const goal = str(answers, "hairGoal") || "hair loss treatment"
  const onset = str(answers, "hairOnset") || "unspecified onset"
  const pattern = str(answers, "hairPattern") || "unspecified pattern"
  const preference = str(answers, "hairMedicationPreference") || "doctor decides"

  const safetyItems: ClinicalSafetyItem[] = [
    ...blockingFlags.map((flag) => ({
      severity: "block" as const,
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
        rationale: "No hard contraindication was detected in the structured hair-loss screen.",
        nextSteps: ["Confirm pattern and reversible causes.", "Open Parchment and prescribe within Parchment if satisfied."],
      }

  const prescriptionIntent = hasBlock ? undefined : makeIntent({
    presetLabel: "Hair loss prescribing preset",
    medicationSearchHint: preference === "oral" ? "oral hair loss option" : "hair loss treatment option",
    directionsTemplate: "Doctor to select agent, strength, directions, quantity and repeats in Parchment after final review.",
    quantityTemplate: "Confirm in Parchment",
    repeatsTemplate: "Confirm in Parchment",
    safetyChecks: ["Reproductive screen reviewed", "Scalp screen reviewed", "BP/cardiac screen reviewed", "Current medications checked"],
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

  const safetyItems: ClinicalSafetyItem[] = controlled
    ? [{
        severity: "block",
        label: "Controlled substance",
        detail: "Schedule 8 or controlled medicines are outside this repeat prescription workflow.",
      }]
    : []

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
    presetLabel: "Repeat prescription preset",
    medicationName,
    strength,
    form,
    medicationSearchHint: hasMultipleMedications
      ? medicationLabels[0]
      : [medicationName, strength, form].filter(Boolean).join(" "),
    directionsTemplate: currentDose
      ? `${hasMultipleMedications ? `Patient requested multiple medicines: ${requestedMedicationValue}. ` : ""}Patient reports current dose: ${currentDose}. Confirm regimen, quantity, repeats and indication in Parchment before prescribing.`
      : `${hasMultipleMedications ? `Patient requested multiple medicines: ${requestedMedicationValue}. ` : ""}Repeat existing regimen after doctor confirms dose, quantity, repeats and indication in Parchment.`,
    quantityTemplate: "Match clinically appropriate repeat quantity in Parchment",
    repeatsTemplate: "Doctor to confirm in Parchment",
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
  const symptomDetails = rawSymptomDetails || "No symptom detail provided."
  const symptomDuration = str(answers, "symptomDuration") || str(answers, "symptom_duration")
  const normalisedSymptoms = normaliseSymptomText(rawSymptomDetails)
  const header = patientHeader(input)
  const durationLabel = duration ? `${duration}-day` : "medical"
  const durationDays = duration ? parseInt(duration, 10) : null

  const subjective = [
    `${header},`,
    normalisedSymptoms || (rawSymptomDetails ? rawSymptomDetails + "." : "Symptom detail not provided."),
    symptomDuration ? `Symptom duration ${humanize(symptomDuration).toLowerCase()}.` : null,
    `Requesting ${durationLabel} ${humanize(certType).toLowerCase()} certificate.`,
  ]
    .filter(Boolean)
    .join(" ")

  const objective = "Telehealth review of structured intake. No red flags reported on screen."

  const assessment = "Symptoms consistent with self-limiting acute illness based on structured intake."

  const safetyNetReturn = durationDays && durationDays <= 2
    ? "Return if symptoms persist beyond 7 days, or develop high fever (>39 C), shortness of breath, chest pain, or inability to keep fluids down."
    : "Return if symptoms persist beyond the certificate period, or develop high fever (>39 C), shortness of breath, chest pain, or inability to keep fluids down."

  const planParts = [
    duration && startDate
      ? `${duration}-day medical certificate issued from ${startDate}.`
      : "Medical certificate issued.",
    "Symptomatic management advised (rest, fluids, paracetamol PRN).",
    safetyNetReturn,
  ]
  const planText = planParts.join(" ")

  const keyFacts = compactFacts([
    { label: "Certificate type", value: humanize(certType) },
    duration ? { label: "Requested duration", value: `${duration} day${duration === "1" ? "" : "s"}` } : null,
    fact("Start date", startDate),
    factHumanized("Symptoms", symptoms),
    factHumanized("Symptom duration", symptomDuration),
    fact("Details", symptomDetails),
  ])

  return {
    title: "Medical certificate request",
    patientStory: subjective,
    keyFacts,
    safetyItems: [],
    recommendedPlan: {
      action: "approve",
      title: "Review certificate suitability",
      rationale: "Certificate requests should be approved only when symptoms and requested dates are clinically consistent.",
      nextSteps: ["Confirm symptom story and duration.", "Approve certificate only if the requested absence is clinically appropriate."],
    },
    draftNote: note(subjective, objective, assessment, planText),
  }
}

/**
 * Fallback summary for consult intakes that don't have a specialty handler.
 * Covers three cases:
 *   1. Legacy `subtype = 'general'` rows from before the 2026-05-20 retirement
 *      (operator should still be able to view them in the case detail page).
 *   2. The gated `womens_health` / `weight_loss` subtypes if they somehow
 *      reach a doctor before their dedicated summaries are built.
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
