/**
 * Derive intake flags from a checkout payload.
 *
 * This is the authoritative emitter for the "soften the form, flag for the
 * doctor" model. Where the Zod/step layer used to hard-block a soft data-quality
 * gap, that block is removed and the condition is re-derived here from the raw
 * answers and recorded as an `IntakeFlag` that the doctor sees.
 *
 * IMPORTANT — this emitter NEVER flags the keep-list. New-medicine
 * (`prescribed_before !== true`) and dose-change (`dose_changed !== false`)
 * remain server hard-blocks in `validateRepeatScriptPayload` per
 * docs/CLINICAL.md; they are intentionally absent here.
 */

import {
  buildRepeatScriptMedicationValidationText,
  countRepeatScriptMedicationRows,
  extractRepeatScriptMedications,
  MAX_REPEAT_SCRIPT_MEDICATIONS,
} from "@/lib/validation/repeat-script-medications"

import { dedupeIntakeFlags, type IntakeFlag, makeIntakeFlag } from "./intake-flags"
import {
  detectDedicatedServiceForMedication,
  detectGatedServiceMedication,
} from "./medication-service-routing"

export interface DeriveIntakeFlagsInput {
  category: string
  subtype?: string
  answers: Record<string, unknown>
}

function stringAnswer(answers: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function deriveRepeatScriptFlags(answers: Record<string, unknown>): IntakeFlag[] {
  const flags: IntakeFlag[] = []
  const medications = extractRepeatScriptMedications(answers)
  // The stated indication is where patients name the condition ("ED", "hair
  // loss", "BPH"), so service routing reads it. It is deliberately NOT added to
  // buildRepeatScriptMedicationValidationText: that text feeds the
  // controlled-substance hard block, and someone describing a PAST medicine
  // ("was on diazepam years ago") must not be walled out of a valid repeat.
  const indication = stringAnswer(answers, ["indication"])

  for (const medication of medications) {
    const medicationText = buildRepeatScriptMedicationValidationText(medication)

    // A medicine with a dedicated service (ED / hair loss / women's health)
    // reached the generic repeat flow. The patient is steered in-form; this is
    // the doctor-side backstop. Medicine and indication stay SEPARATE — see the
    // intent-binding note in medication-service-routing.ts.
    const dedicatedService = detectDedicatedServiceForMedication(
      medicationText,
      indication,
      answers.routing_context ?? answers.routingContext,
    )
    if (dedicatedService) {
      flags.push(makeIntakeFlag("dedicated_service_medication", {
        source: "clinical",
        detail: dedicatedService.enforcement === "flag_only"
          ? `${medication.displayName || medication.name} — ${dedicatedService.reason}`
          : `${medication.displayName || medication.name} → ${dedicatedService.serviceLabel}`,
      }))
    }

    // A medicine whose dedicated service is not live yet. Never steered, never
    // blocked — the reviewer just needs to know.
    const gatedService = detectGatedServiceMedication(medicationText)
    if (gatedService) {
      flags.push(makeIntakeFlag("gated_service_medication", {
        source: "clinical",
        detail: `${medication.displayName || medication.name} — ${gatedService.reason}`,
      }))
    }

    const code = (medication.pbsCode || "").toUpperCase()
    const isUnknown = code === "UNKNOWN" || medication.name.toLowerCase().includes("unknown - doctor")
    if (isUnknown) {
      // Once a medication is unidentified, strength/form are moot — one flag that
      // carries the patient's free-text description so the doctor can identify it.
      flags.push(makeIntakeFlag("medication_needs_identification", {
        source: "clinical",
        detail: medication.description || medication.displayName || medication.name,
      }))
      continue
    }
    if (!medication.strength?.trim()) {
      flags.push(makeIntakeFlag("medication_strength_missing", { source: "clinical", detail: medication.name }))
    }
    if (!medication.form?.trim()) {
      flags.push(makeIntakeFlag("medication_form_missing", { source: "clinical", detail: medication.name }))
    }
  }

  const currentDose = stringAnswer(answers, ["current_dose", "currentDose", "dosage_instructions", "dosageInstructions"])
  if (!currentDose) {
    flags.push(makeIntakeFlag("dose_not_stated", { source: "clinical" }))
  }

  const rows = countRepeatScriptMedicationRows(answers)
  if (rows > MAX_REPEAT_SCRIPT_MEDICATIONS) {
    flags.push(makeIntakeFlag("medication_count_high", { source: "clinical", detail: `${rows} medications` }))
  }

  return flags
}

/**
 * Derive the doctor-visible flags for a checkout payload. Returns [] when the
 * service has no softened gaps. Deduped by code (highest severity wins).
 */
export function deriveIntakeFlags(input: DeriveIntakeFlagsInput): IntakeFlag[] {
  const flags: IntakeFlag[] = []

  // Must mirror isRepeatPrescriptionSubtype() in
  // lib/stripe/checkout/clinical-validation.ts. `chronic_review` runs the same
  // repeat-script payload validation, so it must derive the same doctor flags —
  // otherwise a gated or exempted medicine is validated but never surfaced.
  if (input.category === "prescription" && (input.subtype === "repeat" || input.subtype === "chronic_review")) {
    flags.push(...deriveRepeatScriptFlags(input.answers))
  }

  return dedupeIntakeFlags(flags)
}
