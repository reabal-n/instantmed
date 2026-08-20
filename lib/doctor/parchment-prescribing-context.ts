import type { ClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { getRepeatScriptMedicationDisplayParts } from "@/lib/validation/repeat-script-medications"

const COPY_CONTEXT_PATTERN = /\b(?:cap(?:sule)?s?|confirm|cream|current|daily|directions?|dose|drops|form|frequency|gel|inhaler|injection|mcg|mg|ml|morning|nightly|ointment|once|parchment|patch|patient|quantity|repeat(?:s)?|request(?:ed)?|spray|strength|tab(?:let)?s?|take|times?|units?|weekly|xr|sr|mr)\b/i

function safeMedicationNameCopyText(value: string): string {
  const trimmed = value.trim()
  if (
    trimmed.length < 2
    || trimmed.length > 100
    || /[\r\n\d%]/.test(trimmed)
    || COPY_CONTEXT_PATTERN.test(trimmed)
    || trimmed.split(/\s+/).length > 6
    || !/^[\p{L}\p{M}][\p{L}\p{M}'’()+/\- ]*[\p{L}\p{M})]$/u.test(trimmed)
  ) {
    return ""
  }

  return trimmed
}

export interface ParchmentPrescriptionContext {
  presetLabel: string
  medicationLabel?: string
  searchHint?: string
  patientReportedDose?: string
  patientReportedFrequency?: string
  regimenSource: "patient_reported" | "template"
  directionsTemplate: string
  /** Verified generic name, when one exists. */
  copyText: string
  /** Patient-entered search name with strength, form, and directions removed. */
  requestedNameCopyText: string
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
  const requestedMedicationName = intent.medicationName
    ? getRepeatScriptMedicationDisplayParts({
        name: intent.medicationName,
        displayName: intent.medicationName,
        strength: intent.strength,
        form: intent.form,
      }).name
    : ""
  const hasPatientReportedRegimen = Object.prototype.hasOwnProperty.call(intent, "patientReportedDose")

  return {
    presetLabel: intent.presetLabel,
    medicationLabel: medicationLabel || undefined,
    searchHint: intent.medicationSearchHint || undefined,
    patientReportedDose: intent.patientReportedDose || undefined,
    patientReportedFrequency: intent.patientReportedFrequency || undefined,
    regimenSource: hasPatientReportedRegimen ? "patient_reported" : "template",
    directionsTemplate: intent.directionsTemplate,
    // Defence in depth: the generic Copy action must never paste strength,
    // form, dose, directions, or multiline request context into Parchment.
    copyText: safeMedicationNameCopyText(intent.clipboardText),
    // The patient's own medicine label is a search aid, not a verified generic.
    // Apply the same name-only boundary before exposing it to the clipboard.
    requestedNameCopyText: safeMedicationNameCopyText(requestedMedicationName),
  }
}
