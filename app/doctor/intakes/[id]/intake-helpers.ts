import type { AIDraft } from "@/app/actions/draft-approval"
import type { IntakeWithDetails, IntakeWithPatient } from "@/types/db"

// Re-export so existing consumers (intake-decline-dialog) keep working.
// Single source of truth lives at lib/doctor/decline-reasons.ts (Phase 2 extract).
export { DECLINE_REASONS } from "@/lib/doctor/decline-reasons"
export type { AIDraft }

export interface IntakeDetailClientProps {
  intake: IntakeWithDetails
  patientAge: number | null
  maskedMedicare: string
  previousIntakes?: IntakeWithPatient[]
  initialAction?: string
  aiDrafts?: AIDraft[]
  nextIntakeId?: string | null
  draftId?: string | null
}

/**
 * Format AI draft content into SOAP clinical note text.
 */
export function formatDraftAsNote(content: Record<string, unknown>): string {
  const sections: string[] = []
  const subj = String(content.presentingComplaint || "").trim()
  const obj = String(content.historyOfPresentIllness || "").trim()
  const assess = String(content.relevantInformation || "").trim()
  const plan = String(content.certificateDetails || "").trim()

  if (subj) sections.push(`Subjective:\n${subj}`)
  if (obj) sections.push(`Objective:\n${obj}`)
  if (assess) sections.push(`Assessment:\n${assess}`)
  if (plan) sections.push(`Plan:\n${plan}`)
  return sections.join("\n\n")
}

/** Find a usable clinical_note draft from the AI drafts list. */
export function findClinicalNoteDraft(drafts: AIDraft[]): AIDraft | null {
  return drafts.find(
    (d) => d.type === "clinical_note" && d.status === "ready" && !d.rejected_at
  ) ?? null
}

// Format consult subtype for display
export function formatConsultSubtype(subtype: string): string {
  const labels: Record<string, string> = {
    general: 'General consult',
    new_medication: 'New medication',
    ed: 'Erectile dysfunction',
    hair_loss: 'Hair loss',
    womens_health: "Women's health",
    weight_loss: 'Weight loss',
  }
  return labels[subtype] || subtype.replace(/_/g, ' ')
}
