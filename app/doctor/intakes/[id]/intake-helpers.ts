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
 * Format AI draft content into a brief plain-text clinical note paragraph.
 * Field order: presentingComplaint, historyOfPresentIllness, relevantInformation,
 * certificateDetails — joined as flowing sentences, no SOAP labels.
 */
export function formatDraftAsNote(content: Record<string, unknown>): string {
  return [
    content.presentingComplaint,
    content.historyOfPresentIllness,
    content.relevantInformation,
    content.certificateDetails,
  ]
    .map((piece) => String(piece || "").trim())
    .filter((piece) => piece.length > 0)
    .join(" ")
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

/**
 * Staff-facing one-liner for intakes the auto-approval engine deliberately
 * routed to a doctor (auto_approval_state = needs_doctor / failed_retrying).
 * Reasons are machine-shaped ("high_stakes_use_case: exam deferral");
 * humanise the prefix and keep it short — the full raw reason belongs in the
 * tooltip, not the chip.
 */
export function formatAutoApprovalReason(reason: string): string {
  const firstLine = reason.split("\n")[0] ?? reason
  const humanised = firstLine.replace(/^([a-z0-9_]+):/i, (m) => m.replace(/_/g, " "))
  return humanised.length > 64 ? `${humanised.slice(0, 61)}...` : humanised
}
