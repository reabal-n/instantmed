import {
  validateEdConsult,
  validateGeneralConsult,
  validateHairLossConsult,
} from "@/lib/clinical/consult-validators"
import { isControlledSubstance } from "@/lib/clinical/intake-validation"

type Answers = Record<string, unknown>

export type ClinicalPlanAction = "approve" | "prescribe" | "needs_call" | "request_info" | "decline"

export interface ClinicalCaseInput {
  category?: string | null
  subtype?: string | null
  serviceType?: string | null
  patientName?: string | null
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

function stringArray(answers: Answers, key: string): string[] {
  const value = raw(answers, key)
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
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
  return [
    `Subjective: ${subjective}`,
    `Objective: ${objective}`,
    `Assessment: ${assessment}`,
    `Plan: ${plan}`,
  ].join("\n")
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

  const prescriptionIntent = hasBlock || needsLiveReview ? undefined : makeIntent({
    presetLabel: "ED prescribing preset",
    medicationSearchHint: preference === "daily" ? "daily ED PDE5 option" : "as-needed ED PDE5 option",
    directionsTemplate: "Doctor to select agent, strength, directions, quantity and repeats in Parchment after final review.",
    quantityTemplate: "Confirm in Parchment",
    repeatsTemplate: "Confirm in Parchment",
    safetyChecks: ["No nitrates reported", "Cardiac screen reviewed", "Alpha blockers checked", "Current medications checked"],
  })

  const subjective = `${input.patientName || "Patient"} requests help to ${sentenceHumanize(goal)} with symptoms for ${sentenceHumanize(duration)}.`
  const objective = `Structured ED screen reviewed${score ? `; IIEF-5 score ${score}` : ""}. Nitrate use: ${yesNo(raw(answers, "edNitrates"))}. GP clearance reported: ${yesNo(raw(answers, "edGpCleared"))}.`
  const assessment = hasBlock
    ? "Not suitable for asynchronous ED prescribing based on safety screen."
    : needsLiveReview
      ? "Requires live clinician review before any ED prescribing."
      : "Potentially suitable for ED prescribing subject to doctor review."
  const planText = recommendedPlan.nextSteps.join(" ")

  return {
    title: "Erectile dysfunction consult",
    patientStory: `${subjective} Preference: ${sentenceHumanize(preference)}.`,
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

  const subjective = `${input.patientName || "Patient"} requests hair loss treatment for ${sentenceHumanize(pattern)} with onset ${sentenceHumanize(onset)}.`
  const objective = `Goal: ${humanize(goal)}. Reproductive risk: ${yesNo(raw(answers, "hairReproductive"))}. Scalp screen: ${scalpSummary(answers)}.`
  const assessment = hasBlock ? "Not suitable for oral hair loss prescribing based on reproductive safety screen." : "Potentially suitable for hair loss treatment subject to doctor review."
  const planText = recommendedPlan.nextSteps.join(" ")

  return {
    title: "Hair loss consult",
    patientStory: `${subjective} Preference: ${sentenceHumanize(preference)}.`,
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
  const medicationName = str(answers, "medicationName") || str(answers, "medication_name") || "Requested medication"
  const strength = str(answers, "medicationStrength") || str(answers, "medication_strength")
  const form = str(answers, "medicationForm") || str(answers, "medication_form")
  const history = str(answers, "prescriptionHistory") || str(answers, "last_prescribed") || "not specified"
  const currentDose = str(answers, "currentDose") || str(answers, "current_dose") || str(answers, "dosage_instructions")
  const controlled = isControlledSubstance(medicationName)
  const allergies = firstStr(answers, ["known_allergies", "allergies"])
  const conditions = firstStr(answers, ["existing_conditions", "conditions"])
  const currentMedications = firstStr(answers, ["current_medications", "otherMedications", "other_medications"])
  const pregnancyAnswer = raw(answers, "isPregnantOrBreastfeeding") ?? raw(answers, "is_pregnant_or_breastfeeding")
  const adverseReactionAnswer = raw(answers, "hasAdverseMedicationReactions") ?? raw(answers, "has_adverse_medication_reactions")

  const keyFacts = compactFacts([
    { label: "Requested medication", value: medicationName },
    fact("Strength", strength),
    fact("Form", form),
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
    medicationSearchHint: [medicationName, strength, form].filter(Boolean).join(" "),
    directionsTemplate: currentDose
      ? `Patient reports current dose: ${currentDose}. Confirm regimen, quantity, repeats and indication in Parchment before prescribing.`
      : "Repeat existing regimen after doctor confirms dose, quantity, repeats and indication in Parchment.",
    quantityTemplate: "Match clinically appropriate repeat quantity in Parchment",
    repeatsTemplate: "Doctor to confirm in Parchment",
    safetyChecks: ["Repeat history reviewed", "Allergies checked", "Current medications checked", "Controlled-substance screen checked"],
  })

  const subjective = `${input.patientName || "Patient"} requests a repeat prescription for ${[medicationName, strength, form].filter(Boolean).join(" ")}.${currentDose ? ` Patient reports current dose: ${currentDose}.` : ""}`
  const objective = [
    `Last prescribed: ${humanize(history)}.`,
    `Allergies: ${allergies || yesNo(raw(answers, "has_allergies") ?? raw(answers, "hasAllergies"))}.`,
    `Current medicines: ${currentMedications || yesNo(raw(answers, "takes_medications") ?? raw(answers, "hasOtherMedications"))}.`,
    pregnancyAnswer !== undefined ? `Pregnant/breastfeeding: ${yesNo(pregnancyAnswer)}.` : null,
    adverseReactionAnswer !== undefined ? `Adverse medication reactions: ${yesNo(adverseReactionAnswer)}.` : null,
  ].filter(Boolean).join(" ")
  const assessment = controlled ? "Request is outside repeat prescription scope." : "Potentially suitable for repeat prescription subject to doctor review."
  const planText = recommendedPlan.nextSteps.join(" ")

  return {
    title: "Repeat prescription",
    patientStory: `${subjective} Patient reports prior prescription history: ${sentenceHumanize(history)}.`,
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
  const symptomDetails = str(answers, "symptomDetails") || str(answers, "symptom_details") || "No symptom detail provided."
  const symptomDuration = str(answers, "symptomDuration") || str(answers, "symptom_duration")

  const keyFacts = compactFacts([
    { label: "Certificate type", value: humanize(certType) },
    duration ? { label: "Requested duration", value: `${duration} day${duration === "1" ? "" : "s"}` } : null,
    fact("Start date", startDate),
    factHumanized("Symptoms", symptoms),
    factHumanized("Symptom duration", symptomDuration),
    fact("Details", symptomDetails),
  ])

  const subjective = `${input.patientName || "Patient"} requests a ${sentenceHumanize(certType)}. ${symptomDetails}`
  const objective = `Requested duration: ${duration ? `${duration} day${duration === "1" ? "" : "s"}` : "not provided"}. Start date: ${startDate || "not provided"}.`
  const assessment = "Medical certificate request requires doctor review against symptoms, dates and telehealth suitability."
  const planText = "Confirm symptoms and requested dates, document capacity impact, then approve certificate only if clinically appropriate."

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

const GENERAL_EMERGENCY_SYMPTOMS = new Set([
  "chest_pain",
  "difficulty_breathing",
  "sudden_weakness",
  "severe_headache",
  "suicidal_thoughts",
  "self_harm",
])

function generalSummary(input: ClinicalCaseInput): ClinicalCaseSummary {
  const { answers } = input
  const validation = validateGeneralConsult(answers)
  const details = str(answers, "consultDetails") || "No patient description provided."
  const category = str(answers, "consultCategory") || "general"
  const urgency = str(answers, "consultUrgency") || "routine"
  const associatedSymptoms = stringArray(answers, "general_associated_symptoms")
  const hasEmergencyRedFlag = associatedSymptoms.some((symptom) => GENERAL_EMERGENCY_SYMPTOMS.has(symptom))
  const hasPostSurgicalConcern = associatedSymptoms.includes("post_surgical_complications")
  const pregnancyAnswer = raw(answers, "isPregnantOrBreastfeeding") ?? raw(answers, "is_pregnant_or_breastfeeding")
  const adverseReactionAnswer = raw(answers, "hasAdverseMedicationReactions") ?? raw(answers, "has_adverse_medication_reactions")
  const pregnancyConcern = isAffirmative(pregnancyAnswer)
  const urgent = urgency === "urgent" || input.requiresLiveConsult || input.riskTier === "high"
  const requiresLiveReview = urgent || pregnancyConcern || hasPostSurgicalConcern

  const safetyItems: ClinicalSafetyItem[] = [
    hasEmergencyRedFlag
      ? {
          severity: "block" as const,
          label: "Emergency red flag",
          detail: "Patient selected symptoms that require emergency or urgent in-person assessment, not async completion.",
        }
      : null,
    ...validation.warnings.map((warning) => ({
      severity: "caution" as const,
      label: "Urgency caution",
      detail: warning,
    })),
    pregnancyConcern
      ? {
          severity: "caution" as const,
          label: "Pregnancy/breastfeeding",
          detail: "Pregnancy or breastfeeding concerns need live clinician assessment before advice or medication.",
        }
      : null,
    hasPostSurgicalConcern
      ? {
          severity: "caution" as const,
          label: "Recent surgery concern",
          detail: "Post-surgical concerns need live assessment to exclude complications.",
        }
      : null,
    urgent
      ? {
          severity: "caution" as const,
          label: "Higher urgency",
          detail: "Review whether this should be converted to phone/video or urgent care.",
        }
      : null,
  ].filter(Boolean) as ClinicalSafetyItem[]

  const recommendedPlan: ClinicalPlan = hasEmergencyRedFlag
    ? {
        action: "decline",
        title: "Do not complete asynchronously",
        rationale: "The structured red-flag screen indicates the patient needs emergency or urgent in-person care.",
        nextSteps: ["Direct the patient to 000, emergency care, or urgent in-person assessment as clinically appropriate."],
      }
    : requiresLiveReview
    ? {
        action: "needs_call",
        title: "Convert to live consultation",
        rationale: "Patient urgency or triage flags suggest asynchronous completion may not be enough.",
        nextSteps: ["Contact patient by phone/video.", "Escalate to urgent care if red flags are confirmed."],
      }
    : {
        action: "approve",
        title: "Async consult review",
        rationale: "No hard red flags were detected in the structured general consult screen.",
        nextSteps: ["Review patient free text and history.", "Document advice, treatment or referral plan as clinically appropriate."],
      }

  const keyFacts = compactFacts([
    { label: "Category", value: humanize(category) },
    { label: "Urgency", value: humanize(urgency) },
    factHumanized("Associated symptoms", raw(answers, "general_associated_symptoms")),
    fact("Allergies", firstStr(answers, ["known_allergies", "allergies"])),
    fact("Conditions", firstStr(answers, ["existing_conditions", "conditions"])),
    fact("Current medications", firstStr(answers, ["current_medications", "otherMedications", "other_medications"])),
    pregnancyAnswer !== undefined ? { label: "Pregnant/breastfeeding", value: yesNo(pregnancyAnswer) } : null,
    adverseReactionAnswer !== undefined ? { label: "Adverse medication reactions", value: yesNo(adverseReactionAnswer) } : null,
  ])

  const subjective = `${input.patientName || "Patient"} reports: ${details}`
  const objective = `Category: ${humanize(category)}. Urgency: ${humanize(urgency)}. Associated symptoms: ${humanize(associatedSymptoms)}.`
  const assessment = hasEmergencyRedFlag
    ? "Not suitable for asynchronous completion due to emergency red flags."
    : requiresLiveReview
      ? "Requires live clinical review before completion."
      : "General consult suitable for doctor review."
  const planText = recommendedPlan.nextSteps.join(" ")

  return {
    title: "General consult",
    patientStory: details,
    keyFacts,
    safetyItems,
    recommendedPlan,
    draftNote: note(subjective, objective, assessment, planText),
  }
}

export function buildClinicalCaseSummary(input: ClinicalCaseInput): ClinicalCaseSummary {
  if (input.category === "consult" && input.subtype === "ed") return edSummary(input)
  if (input.category === "consult" && input.subtype === "hair_loss") return hairSummary(input)
  if (input.category === "consult") return generalSummary(input)
  if (input.serviceType === "med_certs" || input.category === "medical_certificate") return medCertSummary(input)
  if (
    input.category === "prescription" ||
    input.serviceType === "common_scripts" ||
    input.serviceType === "repeat_rx" ||
    input.serviceType === "prescription"
  ) {
    return repeatSummary(input)
  }

  return generalSummary({
    ...input,
    category: "consult",
    subtype: "general",
  })
}
