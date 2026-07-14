import {
  CONTROLLED_SUBSTANCE_DISCLAIMER,
  isControlledSubstance,
} from "@/lib/clinical/intake-validation"
import {
  PILL_BLOOD_CLOT_REDIRECT_REASON,
  PILL_MIGRAINE_AURA_REDIRECT_REASON,
  PILL_PATHWAY_REDIRECT_TITLE,
  PILL_POSSIBLE_PREGNANCY_REDIRECT_REASON,
  PILL_PREGNANCY_DECLINE_REASON,
  PILL_PREGNANCY_DECLINE_TITLE,
  PILL_SMOKING_REDIRECT_REASON,
} from "@/lib/clinical/womens-health-pill"
import {
  normalizeMedicationEntriesAnswer,
  normalizeMedicationProductAnswer,
  stringAnswer,
} from "@/lib/request/intake-answer-normalizers"

type IntakeAnswers = Record<string, unknown>

export interface EdNitrateTerminalBlock {
  kind: "ed_nitrates"
  title: "This service is not suitable for you"
  reason: string
}

type UtiTerminalAnswerKey = "utiRedFlags" | "utiPregnant"

export interface UtiTerminalBlock {
  kind: "uti_red_flags" | "uti_pregnancy"
  title: "Please seek urgent care"
  reason: string
  answerKeysToClear: UtiTerminalAnswerKey[]
}

type PillTerminalAnswerKey =
  | "pregnancyStatus"
  | "womens_migraine_aura"
  | "womens_blood_clot_history"
  | "womens_smoker"

export interface PillTerminalBlock {
  kind: "pill_pregnancy" | "pill_redirect"
  title: string
  reason: string
  answerKeysToClear: PillTerminalAnswerKey[]
}

export interface RepeatMedicationTerminalBlock {
  kind: "repeat_controlled_medication"
  medicationName: string
  title: string
  reason: string
  advice: string
}

const ED_NITRATE_REASON = "Some ED prescription options can cause a dangerous drop in blood pressure when combined with nitrates. Please see your GP or cardiologist."
const UTI_RED_FLAGS_REASON = "Symptoms like fever, back/flank pain, or feeling very unwell may indicate a kidney infection which requires urgent in-person medical care. Please see a GP or visit urgent care today."
const UTI_PREGNANCY_REASON = "UTIs during pregnancy need in-person assessment. Please see your GP or visit a clinic for safe treatment."

export function deriveEdNitrateTerminalBlock(
  answers: IntakeAnswers,
): EdNitrateTerminalBlock | null {
  if (answers.edNitrates !== true) return null

  return {
    kind: "ed_nitrates",
    title: "This service is not suitable for you",
    reason: ED_NITRATE_REASON,
  }
}

export function deriveUtiTerminalBlock(answers: IntakeAnswers): UtiTerminalBlock | null {
  const hasRedFlags = answers.utiRedFlags === "yes"
  const hasPregnancyRisk = answers.utiPregnant === "yes" || answers.utiPregnant === "not_sure"
  if (!hasRedFlags && !hasPregnancyRisk) return null

  const answerKeysToClear: UtiTerminalAnswerKey[] = []
  if (hasRedFlags) answerKeysToClear.push("utiRedFlags")
  if (hasPregnancyRisk) answerKeysToClear.push("utiPregnant")

  if (hasRedFlags) {
    return {
      kind: "uti_red_flags",
      title: "Please seek urgent care",
      reason: UTI_RED_FLAGS_REASON,
      answerKeysToClear,
    }
  }

  return {
    kind: "uti_pregnancy",
    title: "Please seek urgent care",
    reason: UTI_PREGNANCY_REASON,
    answerKeysToClear,
  }
}

export function buildUtiTerminalBlockCorrection(
  block: UtiTerminalBlock,
): Partial<Record<UtiTerminalAnswerKey, undefined>> {
  return Object.fromEntries(
    block.answerKeysToClear.map((key) => [key, undefined]),
  ) as Partial<Record<UtiTerminalAnswerKey, undefined>>
}

export function derivePillTerminalBlock(
  answers: IntakeAnswers,
): PillTerminalBlock | null {
  if (
    answers.consultSubtype !== "womens_health" ||
    answers.womensHealthOption !== "ocp_new"
  ) return null

  const answerKeysToClear: PillTerminalAnswerKey[] = []
  if (answers.pregnancyStatus === "yes" || answers.pregnancyStatus === "not_sure") {
    answerKeysToClear.push("pregnancyStatus")
  }
  if (answers.womens_migraine_aura === "yes") {
    answerKeysToClear.push("womens_migraine_aura")
  }
  if (answers.womens_blood_clot_history === "yes") {
    answerKeysToClear.push("womens_blood_clot_history")
  }
  if (answers.womens_smoker === "yes") {
    answerKeysToClear.push("womens_smoker")
  }

  if (answerKeysToClear.length === 0) return null

  if (answers.pregnancyStatus === "yes") {
    return {
      kind: "pill_pregnancy",
      title: PILL_PREGNANCY_DECLINE_TITLE,
      reason: PILL_PREGNANCY_DECLINE_REASON,
      answerKeysToClear,
    }
  }

  const reasons: string[] = []
  if (answers.pregnancyStatus === "not_sure") {
    reasons.push(PILL_POSSIBLE_PREGNANCY_REDIRECT_REASON)
  }
  if (answers.womens_migraine_aura === "yes") {
    reasons.push(PILL_MIGRAINE_AURA_REDIRECT_REASON)
  }
  if (answers.womens_blood_clot_history === "yes") {
    reasons.push(PILL_BLOOD_CLOT_REDIRECT_REASON)
  }
  if (answers.womens_smoker === "yes") {
    reasons.push(PILL_SMOKING_REDIRECT_REASON)
  }

  return {
    kind: "pill_redirect",
    title: PILL_PATHWAY_REDIRECT_TITLE,
    reason: reasons.join(" "),
    answerKeysToClear,
  }
}

export function buildPillTerminalBlockCorrection(
  block: PillTerminalBlock,
): Partial<Record<PillTerminalAnswerKey | "requiresCall", undefined>> {
  return Object.fromEntries(
    [...block.answerKeysToClear, "requiresCall"].map((key) => [key, undefined]),
  ) as Partial<Record<PillTerminalAnswerKey | "requiresCall", undefined>>
}

export function deriveRepeatMedicationTerminalBlock(
  answers: IntakeAnswers,
): RepeatMedicationTerminalBlock | null {
  const restoredEntries = normalizeMedicationEntriesAnswer(answers.medications)
  const legacyProduct = normalizeMedicationProductAnswer(answers.selectedMedication)
  const medicationNames = restoredEntries.length > 0
    ? restoredEntries.map((entry) => entry.name)
    : [stringAnswer(answers.medicationName) || legacyProduct?.drug_name || ""]
  const medicationName = medicationNames.find(
    (name) => name && isControlledSubstance(name),
  )

  if (!medicationName) return null

  return {
    kind: "repeat_controlled_medication",
    medicationName,
    title: CONTROLLED_SUBSTANCE_DISCLAIMER.title,
    reason: CONTROLLED_SUBSTANCE_DISCLAIMER.message,
    advice: CONTROLLED_SUBSTANCE_DISCLAIMER.advice,
  }
}
