import { type DoctorCapability, doctorHasCapability } from "@/lib/auth/staff-capabilities"
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
import {
  buildRepeatScriptMedicationValidationText,
  extractRepeatScriptMedications,
} from "@/lib/validation/repeat-script-medications"
import type { Profile } from "@/types/db"

type PrescribingCapabilityProfile = Pick<Profile, "role"> & Partial<Pick<
  Profile,
  "can_prescribe_s4" | "can_prescribe_s8"
>>

export interface ParchmentPrescribingCapabilityResult {
  allowed: boolean
  error?: string
  requiredCapability?: DoctorCapability
  controlledMedicationDetected: boolean
  medicationText?: string
}

const LEGACY_MEDICATION_KEYS = [
  "medicationName",
  "medication_name",
  "medicationDisplay",
  "medication_display",
  "medication",
] as const

function answerString(answers: Record<string, unknown>, key: string): string | null {
  const value = answers[key]
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

export function extractRequestedPrescriptionMedicationTexts(
  answers: Record<string, unknown> | null | undefined,
): string[] {
  if (!answers) return []

  const medicationTexts = extractRepeatScriptMedications(answers)
    .map(buildRepeatScriptMedicationValidationText)
    .filter(Boolean)

  for (const key of LEGACY_MEDICATION_KEYS) {
    const value = answerString(answers, key)
    if (value) medicationTexts.push(value)
  }

  const seen = new Set<string>()
  return medicationTexts.filter((text) => {
    const key = text.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Parchment is the prescribing surface, but InstantMed still controls who may
 * launch it. Any Parchment prescription handoff requires S4 capability. If a
 * controlled/S8 medicine somehow reaches this point, require the explicit S8
 * grant before opening the vendor surface.
 */
export function checkParchmentPrescribingCapability(input: {
  profile: PrescribingCapabilityProfile
  answers?: Record<string, unknown> | null
}): ParchmentPrescribingCapabilityResult {
  if (!doctorHasCapability(input.profile, "prescribe_s4")) {
    return {
      allowed: false,
      requiredCapability: "prescribe_s4",
      controlledMedicationDetected: false,
      error: "This doctor profile is not enabled for Schedule 4 prescribing. Ask the admin to verify prescribing capability before opening Parchment.",
    }
  }

  const medicationTexts = extractRequestedPrescriptionMedicationTexts(input.answers)
  const controlledText = medicationTexts.find((text) => isControlledSubstance(text))

  if (controlledText && !doctorHasCapability(input.profile, "prescribe_s8")) {
    return {
      allowed: false,
      requiredCapability: "prescribe_s8",
      controlledMedicationDetected: true,
      medicationText: controlledText,
      error: "This request appears to include a controlled or Schedule 8 medicine. This doctor profile is not enabled for Schedule 8 prescribing.",
    }
  }

  return {
    allowed: true,
    controlledMedicationDetected: Boolean(controlledText),
    medicationText: controlledText ?? medicationTexts[0],
  }
}
