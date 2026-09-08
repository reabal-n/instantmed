import type { ClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { buildReviewPacket, type BuildReviewPacketInput, type ReviewFact } from "@/lib/clinical/review-packet"
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
  /** Source-faithful current request facts, separate from medication search. */
  requestFacts?: ReviewFact[]
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
  source?: Omit<BuildReviewPacketInput, "summary">,
): ParchmentPrescriptionContext | null {
  const intent = summary?.prescriptionIntent
  if (!summary || !intent) return null

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

  // Reuse the review packet rather than reparsing a summary into a regimen.
  // Legacy callers retain their complete intent directions; extracted frequency
  // is never evidence of an independently captured answer.
  const packet = source ? buildReviewPacket({ ...source, summary }) : null
  const requestFacts = packet?.workflow.kind === "repeat_prescription"
    ? packet.facts.filter(({ key }) => ["medicine", "patient_dose", "frequency", "indication"].includes(key))
    : undefined
  const sourceDirections = source && requestFacts
    ? ["currentDose", "current_dose", "dosageInstructions", "dosage_instructions"]
      .map((key) => source.answers[key])
      .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
    : intent.patientReportedDose

  return {
    ...(requestFacts ? { requestFacts } : {}),
    presetLabel: intent.presetLabel,
    medicationLabel: requestFacts?.find(({ key }) => key === "medicine")?.value || medicationLabel || undefined,
    searchHint: intent.medicationSearchHint || undefined,
    patientReportedDose: sourceDirections || undefined,
    patientReportedFrequency: undefined,
    regimenSource: requestFacts || hasPatientReportedRegimen ? "patient_reported" : "template",
    directionsTemplate: intent.directionsTemplate,
    // Defence in depth: the generic Copy action must never paste strength,
    // form, dose, directions, or multiline request context into Parchment.
    copyText: safeMedicationNameCopyText(intent.clipboardText),
    // The patient's own medicine label is a search aid, not a verified generic.
    // Apply the same name-only boundary before exposing it to the clipboard.
    requestedNameCopyText: safeMedicationNameCopyText(requestedMedicationName),
  }
}
