"use server"

/**
 * Clinical Note Sync
 *
 * Helpers that sync an approved clinical-note draft into intake.doctor_notes.
 * Extracted from draft-approval.ts so approval actions stay focused on
 * orchestration rather than content formatting.
 */

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { ClinicalNoteContent } from "./types"

const log = createLogger("clinical-note-sync")

/**
 * Check if content is a valid ClinicalNoteContent JSON structure
 */
function isClinicalNoteJson(content: unknown): content is ClinicalNoteContent {
  if (!content || typeof content !== 'object') return false
  const c = content as Record<string, unknown>
  // Must have at least presentingComplaint or historyOfPresentIllness
  return (
    typeof c.presentingComplaint === 'string' ||
    typeof c.historyOfPresentIllness === 'string'
  )
}

/**
 * Format clinical note JSON content into SOAP-format text for intake.doctor_notes
 *
 * DETERMINISTIC: Same input always produces same output.
 * Section order: Subjective, Objective, Assessment, Plan.
 */
function formatClinicalNoteAsText(content: ClinicalNoteContent): string {
  const sections: string[] = []

  if (content.presentingComplaint?.trim()) {
    sections.push(`Subjective:\n${content.presentingComplaint.trim()}`)
  }
  if (content.historyOfPresentIllness?.trim()) {
    sections.push(`Objective:\n${content.historyOfPresentIllness.trim()}`)
  }
  if (content.relevantInformation?.trim()) {
    sections.push(`Assessment:\n${content.relevantInformation.trim()}`)
  }
  if (content.certificateDetails?.trim()) {
    sections.push(`Plan:\n${content.certificateDetails.trim()}`)
  }

  return sections.join("\n\n")
}

/**
 * Extract doctor_notes text from draft content
 *
 * RULES:
 * 1. If editedContent exists and is non-empty, use editedContent (doctor's edits take priority)
 * 2. If content is JSON (ClinicalNoteContent), format it as readable text
 * 3. If content is plain text (string), use it as-is
 * 4. If content is empty/invalid, return null
 */
function extractDoctorNotesFromDraft(
  content: Record<string, unknown>,
  editedContent: Record<string, unknown> | null
): { text: string | null; source: 'edited' | 'original' } {
  // Prefer edited_content if it exists and has content
  const sourceContent = editedContent && Object.keys(editedContent).length > 0
    ? editedContent
    : content

  const source = editedContent && Object.keys(editedContent).length > 0
    ? 'edited' as const
    : 'original' as const

  // Handle JSON clinical note structure
  if (isClinicalNoteJson(sourceContent)) {
    const formatted = formatClinicalNoteAsText(sourceContent)
    return { text: formatted.trim() || null, source }
  }

  // Handle plain text (if stored as { text: "..." } or similar)
  if ('text' in sourceContent && typeof sourceContent.text === 'string') {
    return { text: sourceContent.text.trim() || null, source }
  }

  // Try to stringify any other object structure as fallback
  // This handles edge cases where content format is unexpected
  try {
    const stringified = JSON.stringify(sourceContent)
    if (stringified && stringified !== '{}' && stringified !== '[]') {
      log.warn('Unexpected clinical note content format, storing as JSON string', {
        contentKeys: Object.keys(sourceContent)
      })
      return { text: stringified, source }
    }
  } catch {
    // Ignore stringify errors
  }

  return { text: null, source }
}

/**
 * Sync approved clinical note to intake.doctor_notes
 *
 * BEHAVIOR:
 * - Stores pure clinical note text in doctor_notes (no footer/metadata)
 * - Stores draft reference in synced_clinical_note_draft_id column
 * - Idempotent: same draft always produces identical doctor_notes
 * - Logs to Sentry on failure
 */
export async function syncClinicalNoteToIntake(
  intakeId: string,
  draftId: string,
  content: Record<string, unknown>,
  editedContent: Record<string, unknown> | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    // Extract formatted notes from content (prefers edited_content)
    const { text: formattedNotes, source } = extractDoctorNotesFromDraft(content, editedContent)

    if (!formattedNotes) {
      const error = "Clinical note content is empty or invalid"
      log.warn("Sync skipped - empty content", { intakeId, draftId })

      Sentry.captureMessage("clinical_note_sync_failed", {
        level: "warning",
        tags: {
          intake_id: intakeId,
          draft_id: draftId,
        },
        extra: {
          error,
          contentSource: source,
          hasContent: !!content,
          hasEditedContent: !!editedContent,
        },
      })

      return { success: false, error }
    }

    // Fetch current intake to check for idempotency
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select("doctor_notes, synced_clinical_note_draft_id")
      .eq("id", intakeId)
      .single()

    if (fetchError) {
      log.error("Failed to fetch intake for sync", { intakeId, draftId }, fetchError)

      Sentry.captureMessage("clinical_note_sync_failed", {
        level: "warning",
        tags: {
          intake_id: intakeId,
          draft_id: draftId,
        },
        extra: {
          error: "Failed to fetch intake",
          errorCode: fetchError.code,
          errorDetails: fetchError.details,
        },
      })

      return { success: false, error: "Failed to fetch intake" }
    }

    // Idempotency: skip update if already synced from this draft with same content
    if (
      intake.synced_clinical_note_draft_id === draftId &&
      intake.doctor_notes === formattedNotes
    ) {
      log.info("Clinical note already synced from this draft, skipping", { intakeId, draftId })
      return { success: true }
    }

    // Update intake with synced clinical notes
    // Store draft reference separately - NO footer mutation
    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        doctor_notes: formattedNotes,
        synced_clinical_note_draft_id: draftId,
      })
      .eq("id", intakeId)

    if (updateError) {
      log.error("Failed to sync clinical note to intake", { intakeId, draftId }, updateError)

      Sentry.captureMessage("clinical_note_sync_failed", {
        level: "warning",
        tags: {
          intake_id: intakeId,
          draft_id: draftId,
        },
        extra: {
          error: "Database update failed",
          errorCode: updateError.code,
          errorDetails: updateError.details,
        },
      })

      return { success: false, error: "Failed to update intake" }
    }

    log.info("Clinical note synced to intake", {
      intakeId,
      draftId,
      contentSource: source,
      notesLength: formattedNotes.length,
    })
    return { success: true }

  } catch (error) {
    log.error("Error syncing clinical note", { intakeId, draftId }, error)

    Sentry.captureMessage("clinical_note_sync_failed", {
      level: "warning",
      tags: {
        intake_id: intakeId,
        draft_id: draftId,
      },
      extra: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })

    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
