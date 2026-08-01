import type { ClinicalCaseSummary } from "@/lib/clinical/case-summary"

export interface ParchmentPrescriptionContext {
  presetLabel: string
  medicationLabel?: string
  searchHint?: string
  patientReportedDose?: string
  regimenSource: "patient_reported" | "template"
  directionsTemplate: string
  copyText: string
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
  const hasPatientReportedRegimen = Object.prototype.hasOwnProperty.call(intent, "patientReportedDose")

  return {
    presetLabel: intent.presetLabel,
    medicationLabel: medicationLabel || undefined,
    searchHint: intent.medicationSearchHint || undefined,
    patientReportedDose: intent.patientReportedDose || undefined,
    regimenSource: hasPatientReportedRegimen ? "patient_reported" : "template",
    directionsTemplate: intent.directionsTemplate,
    copyText: intent.clipboardText,
  }
}
