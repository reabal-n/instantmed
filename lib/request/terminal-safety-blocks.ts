import {
  CONTROLLED_SUBSTANCE_DISCLAIMER,
  isControlledSubstance,
} from "@/lib/clinical/intake-validation"
import {
  PILL_PREGNANCY_DECLINE_REASON,
  PILL_PREGNANCY_DECLINE_TITLE,
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

export interface PillPregnancyTerminalBlock {
  kind: "pill_pregnancy"
  title: "This service is not suitable during pregnancy"
  reason: string
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

export function derivePillPregnancyTerminalBlock(
  answers: IntakeAnswers,
): PillPregnancyTerminalBlock | null {
  if (
    answers.consultSubtype !== "womens_health" ||
    answers.womensHealthOption !== "ocp_new" ||
    answers.pregnancyStatus !== "yes"
  ) return null

  return {
    kind: "pill_pregnancy",
    title: PILL_PREGNANCY_DECLINE_TITLE,
    reason: PILL_PREGNANCY_DECLINE_REASON,
  }
}

export function buildPillPregnancyTerminalBlockCorrection(
  block: PillPregnancyTerminalBlock,
): Partial<Record<"pregnancyStatus" | "requiresCall", undefined>> {
  if (block.kind !== "pill_pregnancy") return {}

  return {
    pregnancyStatus: undefined,
    requiresCall: undefined,
  }
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
