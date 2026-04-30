import type { ClinicalCaseSummary } from "@/lib/clinical/case-summary"

export interface ParchmentPrescriptionContext {
  presetLabel: string
  medicationLabel?: string
  searchHint?: string
  directionsTemplate: string
  clipboardText: string
}

export function buildParchmentPrescriptionContext(
  summary: ClinicalCaseSummary | null | undefined,
): ParchmentPrescriptionContext | null {
  const intent = summary?.prescriptionIntent
  if (!intent) return null

  const medicationLabel = [
    intent.medicationName,
    intent.strength,
    intent.form,
  ].filter(Boolean).join(" ")

  return {
    presetLabel: intent.presetLabel,
    medicationLabel: medicationLabel || undefined,
    searchHint: intent.medicationSearchHint || undefined,
    directionsTemplate: intent.directionsTemplate,
    clipboardText: intent.clipboardText,
  }
}
