import { hasCompleteRepeatRxRegimen } from "@/lib/request/repeat-rx-regimen"
import {
  extractRepeatScriptMedications,
  getRepeatScriptMedicationConcreteStrength,
} from "@/lib/validation/repeat-script-medications"

/**
 * Persisted with every repeat-Rx submission created by the mandatory-dose
 * contract. Recovery checks use this marker rather than a wall-clock cutoff,
 * so requests created before the code is actually deployed stay recoverable.
 */
export const REPEAT_RX_DOSE_CONTRACT_VERSION = 1
export const REPEAT_RX_DOSE_CONTRACT_KEY = "repeat_rx_dose_contract_version"

export type RepeatRxDoseMissingField =
  | "medication_strength"
  | "current_dose"

export function isRepeatPrescriptionRequest(
  category: string | null | undefined,
  subtype: string | null | undefined,
): boolean {
  return category === "prescription"
    && (subtype === "repeat" || subtype === "chronic_review")
}

export function hasRepeatRxDoseContractMarker(
  answers: Record<string, unknown>,
): boolean {
  return answers[REPEAT_RX_DOSE_CONTRACT_KEY] === REPEAT_RX_DOSE_CONTRACT_VERSION
}

function stringAnswer(
  answers: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

/**
 * Return only the two repeat-Rx dose gaps. Other repeat eligibility and safety
 * questions keep their existing validators and legacy reconciliation rules.
 */
export function getRepeatRxDoseMissingFields(
  answers: Record<string, unknown>,
): RepeatRxDoseMissingField[] {
  const medications = extractRepeatScriptMedications(answers)
  const hasConcreteStrength = medications.length > 0
    && medications.every((medication) =>
      Boolean(getRepeatScriptMedicationConcreteStrength(medication)),
    )
  const currentDose = stringAnswer(answers, [
    "currentDose",
    "current_dose",
    "dosageInstructions",
    "dosage_instructions",
  ])

  return [
    ...(!hasConcreteStrength
      ? ["medication_strength" as const]
      : []),
    ...(!hasCompleteRepeatRxRegimen(currentDose)
      ? ["current_dose" as const]
      : []),
  ]
}
