"use server"

/**
 * Shared types for draft actions.
 *
 * These were previously defined inline in draft-approval.ts. Every file
 * in app/actions/drafts/ can import from here, and the barrel re-export
 * in draft-approval.ts keeps existing consumers working.
 */

export interface DraftApprovalResult {
  success: boolean
  error?: string
  draftId?: string
}

export interface AIDraft {
  id: string
  intake_id: string
  type: "clinical_note" | "med_cert" | "repeat_rx" | "consult"
  content: Record<string, unknown>
  model: string
  is_ai_generated: boolean
  status: "ready" | "failed" | "pending"
  error: string | null
  validation_errors: unknown[] | null
  ground_truth_errors: unknown[] | null
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  version: number
  edited_content: Record<string, unknown> | null
  input_hash: string | null
  created_at: string
  updated_at: string
}

// Clinical note content structure (matches lib/ai/schemas/clinical-note.ts)
export interface ClinicalNoteContent {
  presentingComplaint: string
  historyOfPresentIllness: string
  relevantInformation?: string
  certificateDetails?: string
  flags?: {
    requiresReview: boolean
    flagReason: string | null
  }
}

export interface AuditEventParams {
  intakeId: string
  action: "generate" | "approve" | "reject" | "regenerate" | "edit"
  draftType: "clinical_note" | "med_cert" | null
  draftId: string | null
  actorId: string
  actorType: "system" | "doctor" | "patient"
  inputHash?: string
  outputHash?: string
  model?: string
  promptTokens?: number
  completionTokens?: number
  generationDurationMs?: number
  validationPassed?: boolean
  groundTruthPassed?: boolean
  validationErrors?: unknown[]
  groundTruthErrors?: unknown[]
  metadata?: Record<string, unknown>
  reason?: string
}
