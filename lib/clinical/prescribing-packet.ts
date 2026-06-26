/**
 * Prescribing packet — one typed view of what the doctor needs to prescribe.
 *
 * Lives in lib/clinical because that is where intake medication parsing already
 * lives (case-summary.ts, repeat-medications.ts). Review/queue/timeline/Parchment
 * surfaces consume this instead of re-parsing raw answers.
 *
 * Note: the intake captures dose AND frequency in one free-text field
 * (`currentDose`, e.g. "2 puffs twice daily"), so the packet exposes a single
 * `dose` string rather than separate dose/frequency fields. `indication` is the
 * patient-reported reason the medicine is taken.
 */

import { collectRepeatMedicationEntries } from "@/lib/clinical/repeat-medications"

export type PrescribingServiceKind =
  | "repeat_rx"
  | "ed"
  | "hair_loss"
  | "womens_health"
  | "consult"
  | "unknown"

export type PrescribingPacketRequiredField = "medication" | "dose" | "indication"

export type PrescribingFulfilmentStatus = "not_prescribed" | "prescribed" | "completed"

export interface PrescribingPacket {
  serviceKind: PrescribingServiceKind
  /** Single-line summary for the review header / queue row. */
  primaryLabel: string
  medicationLabel: string | null
  /** Patient-reported dose + frequency (free text). */
  dose: string | null
  indication: string | null
  /** Service-specific clinical facts (e.g. IIEF score, Norwood pattern). */
  clinicalBasis: string[]
  /** Lower-priority context shown once, below the primary line. */
  optionalContext: string[]
  /** Repeat-Rx required fields that are missing (empty for specialty services). */
  missingRequiredFields: PrescribingPacketRequiredField[]
  fulfilment: {
    status: PrescribingFulfilmentStatus
    prescribedMedicationLabel: string | null
  }
}

export interface BuildPrescribingPacketInput {
  serviceType?: string | null
  subtype?: string | null
  answers: Record<string, unknown>
  intake?: { status?: string | null; script_sent?: boolean | null } | null
}

function str(answers: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function deriveServiceKind(serviceType?: string | null, subtype?: string | null): PrescribingServiceKind {
  const type = (serviceType ?? "").trim().toLowerCase()
  if (["repeat-script", "repeat_rx", "repeat", "prescription", "common_scripts"].includes(type)) {
    return "repeat_rx"
  }
  if (type === "consult" || type === "consults") {
    const sub = (subtype ?? "").trim().toLowerCase()
    if (sub === "ed") return "ed"
    if (sub === "hair_loss") return "hair_loss"
    if (sub === "womens_health") return "womens_health"
    return "consult"
  }
  return "unknown"
}

function buildMedicationLabel(answers: Record<string, unknown>): string | null {
  const entries = collectRepeatMedicationEntries(answers)
  if (entries.length > 0) {
    const labels = entries
      .map((entry) => [entry.name, entry.strength, entry.form].filter(Boolean).join(" ").trim())
      .filter(Boolean)
    if (labels.length > 0) return labels.join("; ")
  }
  const name = str(answers, ["medicationName", "medication_name", "medicationDisplay", "medication_display"])
  if (!name) return null
  const strength = str(answers, ["medicationStrength", "medication_strength", "strength"])
  const form = str(answers, ["medicationForm", "medication_form", "form"])
  return [name, strength, form].filter(Boolean).join(" ")
}

function deriveFulfilment(
  intake: BuildPrescribingPacketInput["intake"],
  prescribedMedicationLabel: string | null,
): PrescribingPacket["fulfilment"] {
  const status = (intake?.status ?? "").trim().toLowerCase()
  if (intake?.script_sent === true || status === "completed") {
    return { status: "completed", prescribedMedicationLabel }
  }
  if (status === "awaiting_script") {
    return { status: "prescribed", prescribedMedicationLabel }
  }
  return { status: "not_prescribed", prescribedMedicationLabel: null }
}

export function buildPrescribingPacket(input: BuildPrescribingPacketInput): PrescribingPacket {
  const { answers } = input
  const serviceKind = deriveServiceKind(input.serviceType, input.subtype)

  const medicationLabel = buildMedicationLabel(answers)
  const dose = str(answers, ["currentDose", "current_dose", "dosageInstructions", "dosage_instructions"])
  const indication = str(answers, ["indication", "indication_for"])

  const optionalContext: string[] = []
  const lastPrescribed = str(answers, ["prescriptionHistory", "last_prescribed", "prescription_history"])
  if (lastPrescribed) optionalContext.push(`Last prescribed: ${lastPrescribed}`)
  const lastPrescribedBy = str(answers, ["lastPrescribedBy", "last_prescribed_by"])
  if (lastPrescribedBy) optionalContext.push(`Prescriber: ${lastPrescribedBy}`)
  const sideEffects = str(answers, ["sideEffects", "side_effects"])
  if (sideEffects) optionalContext.push(`Side effects: ${sideEffects}`)

  const missingRequiredFields: PrescribingPacketRequiredField[] = []
  if (serviceKind === "repeat_rx") {
    if (!medicationLabel) missingRequiredFields.push("medication")
    if (!dose) missingRequiredFields.push("dose")
    if (!indication) missingRequiredFields.push("indication")
  }

  const primaryLabel =
    [medicationLabel, dose, indication].filter(Boolean).join(" · ") ||
    medicationLabel ||
    (serviceKind === "repeat_rx" ? "Repeat prescription" : "Prescribing request")

  return {
    serviceKind,
    primaryLabel,
    medicationLabel,
    dose,
    indication,
    clinicalBasis: [],
    optionalContext,
    missingRequiredFields,
    fulfilment: deriveFulfilment(input.intake, medicationLabel),
  }
}

const REQUIRED_FIELD_LABELS: Record<PrescribingPacketRequiredField, string> = {
  medication: "medication",
  dose: "dose & frequency",
  indication: "what it's for",
}

export interface PrescribingPacketBlocker {
  blocked: boolean
  warning: boolean
  message: string | null
}

/**
 * Legacy repeat requests (paid before dose+indication were required at checkout)
 * can still be missing required fields. Block Prescribe / Complete unless the
 * doctor has recorded a clinical note, in which case allow with a warning.
 */
export function getPrescribingPacketBlocker(
  packet: PrescribingPacket,
  doctorNotes: string | null | undefined,
): PrescribingPacketBlocker {
  if (packet.serviceKind !== "repeat_rx" || packet.missingRequiredFields.length === 0) {
    return { blocked: false, warning: false, message: null }
  }

  const fields = packet.missingRequiredFields.map((field) => REQUIRED_FIELD_LABELS[field]).join(", ")
  const hasNote = Boolean(doctorNotes && doctorNotes.trim())

  if (hasNote) {
    return {
      blocked: false,
      warning: true,
      message: `Patient did not provide ${fields}. A clinical note is recorded — confirm the details in Parchment.`,
    }
  }

  return {
    blocked: true,
    warning: false,
    message: `Patient did not provide ${fields}. Add a clinical note (or request the details) before prescribing.`,
  }
}
