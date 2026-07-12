import { isPrescribingServiceType } from "@/lib/doctor/service-types"

type Answers = Record<string, unknown> | null | undefined

export type RepeatRxAttestationStatus = "confirmed_unchanged" | "changed" | "missing"

export type RepeatRxPrescribingBlocker = {
  code: "REPEAT_RX_REGIMEN_CHANGED" | "REPEAT_RX_REGIMEN_CONFIRMATION_REQUIRED"
  error: string
}

export const LEGACY_REPEAT_RX_RECONCILIATION_NOTE =
  "Recorded external script evidence reviewed: this prescription was already issued, and this intake does not contain the required unchanged-dose-and-directions confirmation."

export function hasLegacyRepeatRxReconciliationNote(note: unknown): boolean {
  return typeof note === "string" && note.includes(LEGACY_REPEAT_RX_RECONCILIATION_NOTE)
}

export function isRepeatRxIntake({
  category,
  serviceType,
}: {
  category?: string | null
  serviceType?: string | null
}): boolean {
  return category === "prescription" || isPrescribingServiceType(serviceType)
}

/**
 * Reads the patient-facing unchanged-regimen answer.
 *
 * Only `doseChanged` is trusted because historical checkout transforms could
 * synthesize the canonical `dose_changed: false` alias when no patient answer
 * existed. That alias therefore cannot prove the patient saw the question.
 */
export function getRepeatRxAttestationStatus(answers: Answers): RepeatRxAttestationStatus {
  if (answers?.doseChanged === false) return "confirmed_unchanged"
  if (answers?.doseChanged === true) return "changed"
  return "missing"
}

export function getRepeatRxPrescribingBlocker(answers: Answers): RepeatRxPrescribingBlocker | null {
  const status = getRepeatRxAttestationStatus(answers)
  if (status === "confirmed_unchanged") return null
  if (status === "changed") {
    return {
      code: "REPEAT_RX_REGIMEN_CHANGED",
      error: "The patient reported a dose or directions change. Decline and refund this repeat request, then direct them to their regular GP or specialist.",
    }
  }
  return {
    code: "REPEAT_RX_REGIMEN_CONFIRMATION_REQUIRED",
    error: "The patient did not explicitly confirm that the dose and directions are unchanged. Decline and refund this request, then ask them to submit a new repeat request.",
  }
}
