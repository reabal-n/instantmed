"use server"

/**
 * Draft Approval Server Actions
 *
 * Provides actions for doctors to approve, reject, and regenerate AI-generated drafts.
 * All actions are logged to the ai_audit_log for compliance.
 *
 * Retrieval, validation, clinical-note sync, audit logging, and types live in
 * app/actions/drafts/. This file re-exports them for backward compatibility.
 */

import { revalidatePath } from "next/cache"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { createLogger } from "@/lib/observability/logger"
import { prepareDocumentDraftEditedContentWrite } from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { logAuditEvent } from "./drafts/audit-log"
import { syncClinicalNoteToIntake } from "./drafts/clinical-note-sync"
import { computeIntakeHash } from "./drafts/draft-validation"
import type { DraftApprovalResult } from "./drafts/types"

// ── Re-exports for backward compatibility ──────────────────────────────
// Type-only re-exports are safe in "use server" files (erased at compile time).
// Non-async function re-exports (getAIDraftsForIntake, checkDraftStaleness)
// must be imported directly from their sub-modules.
export type { AIDraft, AuditEventParams, ClinicalNoteContent, DraftApprovalResult } from "./drafts/types"

const log = createLogger("draft-approval")

// ── Actions ────────────────────────────────────────────────────────────

/**
 * Approve an AI-generated draft
 * Optionally accepts edited content if the doctor made changes
 */
export async function approveDraft(
  draftId: string,
  editedContent?: Record<string, unknown>
): Promise<DraftApprovalResult> {
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) {
    return { success: false, error: "Only doctors can approve drafts" }
  }

  const supabase = createServiceRoleClient()

  // Fetch the draft to verify it exists and get intake_id
  const { data: draft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("id, intake_id, type, content, approved_at, rejected_at, input_hash, version, edited_content, edited_content_enc")
    .eq("id", draftId)
    .single()

  if (fetchError || !draft) {
    log.error("Draft not found", { draftId }, fetchError)
    return { success: false, error: "Draft not found" }
  }

  // Verify doctor is assigned to this intake (or is admin)
  if (auth.profile.role === "doctor") {
    const { data: intake } = await supabase
      .from("intakes")
      .select("assigned_doctor_id")
      .eq("id", draft.intake_id)
      .single()

    if (intake?.assigned_doctor_id && intake.assigned_doctor_id !== auth.profile.id) {
      log.warn("Doctor not assigned to intake", {
        draftId,
        intakeId: draft.intake_id,
        doctorId: auth.profile.id,
        assignedDoctorId: intake.assigned_doctor_id,
      })
      return { success: false, error: "You are not assigned to this intake" }
    }
  }

  // Check if already approved or rejected
  if (draft.approved_at) {
    return { success: false, error: "Draft has already been approved" }
  }
  if (draft.rejected_at) {
    return { success: false, error: "Draft has been rejected - regenerate to create a new draft" }
  }

  // Check if intake answers have changed since draft was generated
  if (draft.input_hash) {
    const currentHash = await computeIntakeHash(draft.intake_id)
    if (currentHash && currentHash !== draft.input_hash) {
      log.warn("Intake answers changed since draft generation", {
        draftId,
        intakeId: draft.intake_id,
        originalHash: draft.input_hash,
        currentHash,
      })
      // Don't block, but log for audit
    }
  }

  // Update the draft with approval
  const { error: updateError } = await supabase
    .from("document_drafts")
    .update({
      approved_by: auth.profile.id,
      approved_at: new Date().toISOString(),
      ...(await prepareDocumentDraftEditedContentWrite(editedContent || null)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)

  if (updateError) {
    log.error("Failed to approve draft", { draftId }, updateError)
    return { success: false, error: "Failed to approve draft" }
  }

  // Log to audit table
  await logAuditEvent({
    intakeId: draft.intake_id,
    action: "approve",
    draftType: draft.type,
    draftId,
    actorId: auth.profile.id,
    actorType: "doctor",
    metadata: {
      has_edits: !!editedContent,
      original_content_length: JSON.stringify(draft.content).length,
      edited_content_length: editedContent ? JSON.stringify(editedContent).length : null,
    },
  })

  // Sync clinical_note content to intake.doctor_notes
  if (draft.type === "clinical_note") {
    const syncResult = await syncClinicalNoteToIntake(
      draft.intake_id,
      draftId,
      draft.content,
      editedContent || null
    )
    if (!syncResult.success) {
      log.warn("Failed to sync clinical note to intake", {
        draftId,
        intakeId: draft.intake_id,
        error: syncResult.error,
      })
      // Don't fail the approval - draft is still approved, just log the sync failure
    }
  }

  log.info("Draft approved", {
    draftId,
    intakeId: draft.intake_id,
    doctorId: auth.profile.id,
    hasEdits: !!editedContent,
    syncedToIntake: draft.type === "clinical_note",
  })

  revalidatePath(`/doctor/intakes/${draft.intake_id}`)

  return { success: true, draftId }
}

/**
 * Reject an AI-generated draft
 */
export async function rejectDraft(
  draftId: string,
  reason: string
): Promise<DraftApprovalResult> {
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) {
    return { success: false, error: "Only doctors can reject drafts" }
  }

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "Please provide a reason for rejection" }
  }

  const supabase = createServiceRoleClient()

  // Fetch the draft
  const { data: draft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("id, intake_id, type, approved_at, rejected_at")
    .eq("id", draftId)
    .single()

  if (fetchError || !draft) {
    return { success: false, error: "Draft not found" }
  }

  // Verify doctor is assigned to this intake (or is admin)
  if (auth.profile.role === "doctor") {
    const { data: intake } = await supabase
      .from("intakes")
      .select("assigned_doctor_id")
      .eq("id", draft.intake_id)
      .single()

    if (intake?.assigned_doctor_id && intake.assigned_doctor_id !== auth.profile.id) {
      log.warn("Doctor not assigned to intake", {
        draftId,
        intakeId: draft.intake_id,
        doctorId: auth.profile.id,
        assignedDoctorId: intake.assigned_doctor_id,
      })
      return { success: false, error: "You are not assigned to this intake" }
    }
  }

  if (draft.approved_at) {
    return { success: false, error: "Cannot reject an already approved draft" }
  }
  if (draft.rejected_at) {
    return { success: false, error: "Draft has already been rejected" }
  }

  // Update the draft with rejection
  const { error: updateError } = await supabase
    .from("document_drafts")
    .update({
      rejected_by: auth.profile.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)

  if (updateError) {
    log.error("Failed to reject draft", { draftId }, updateError)
    return { success: false, error: "Failed to reject draft" }
  }

  // Log to audit table
  await logAuditEvent({
    intakeId: draft.intake_id,
    action: "reject",
    draftType: draft.type,
    draftId,
    actorId: auth.profile.id,
    actorType: "doctor",
    reason: reason.trim(),
  })

  log.info("Draft rejected", {
    draftId,
    intakeId: draft.intake_id,
    doctorId: auth.profile.id,
    reason: reason.trim(),
  })

  revalidatePath(`/doctor/intakes/${draft.intake_id}`)

  return { success: true, draftId }
}

/**
 * Regenerate drafts for an intake
 * Creates new draft with incremented version
 */
export async function regenerateDrafts(intakeId: string): Promise<DraftApprovalResult> {
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) {
    return { success: false, error: "Only doctors can regenerate drafts" }
  }

  const supabase = createServiceRoleClient()

  // Verify doctor is assigned to this intake (or is admin)
  if (auth.profile.role === "doctor") {
    const { data: intake } = await supabase
      .from("intakes")
      .select("assigned_doctor_id")
      .eq("id", intakeId)
      .single()

    if (intake?.assigned_doctor_id && intake.assigned_doctor_id !== auth.profile.id) {
      log.warn("Doctor not assigned to intake for regeneration", {
        intakeId,
        doctorId: auth.profile.id,
        assignedDoctorId: intake.assigned_doctor_id,
      })
      return { success: false, error: "You are not assigned to this intake" }
    }
  }

  // Get current draft version
  const { data: existingDrafts } = await supabase
    .from("document_drafts")
    .select("id, version, type")
    .eq("intake_id", intakeId)
    .eq("is_ai_generated", true)

  const maxVersion = existingDrafts?.reduce((max, d) => Math.max(max, d.version || 1), 0) || 0

  // Delete existing drafts (they're archived in audit log)
  if (existingDrafts && existingDrafts.length > 0) {
    const { error: deleteError } = await supabase
      .from("document_drafts")
      .delete()
      .eq("intake_id", intakeId)
      .eq("is_ai_generated", true)

    if (deleteError) {
      log.error("Failed to delete existing drafts", { intakeId }, deleteError)
      return { success: false, error: "Failed to prepare for regeneration" }
    }
  }

  // Log regeneration request
  await logAuditEvent({
    intakeId,
    action: "regenerate",
    draftType: null,
    draftId: null,
    actorId: auth.profile.id,
    actorType: "doctor",
    metadata: {
      previous_version: maxVersion,
      new_version: maxVersion + 1,
    },
  })

  // Import and call the draft generation function
  const { generateDraftsForIntake } = await import("@/app/actions/generate-drafts")

  try {
    const result = await generateDraftsForIntake(intakeId, true) // force = true

    if (!result.success) {
      return { success: false, error: result.error || "Failed to generate new drafts" }
    }

    // Surface clinical note failure - doctor clicked "Generate AI draft" for notes
    if (result.clinicalNote?.status === "failed") {
      return {
        success: false,
        error: result.clinicalNote.error || "Failed to generate clinical note",
      }
    }

    log.info("Drafts regenerated", {
      intakeId,
      doctorId: auth.profile.id,
      newVersion: maxVersion + 1,
    })

    revalidatePath(`/doctor/intakes/${intakeId}`)

    return { success: true }
  } catch (error) {
    log.error("Error regenerating drafts", { intakeId }, error)
    return { success: false, error: "Failed to regenerate drafts" }
  }
}
