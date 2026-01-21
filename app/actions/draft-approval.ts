"use server"

/**
 * Draft Approval Server Actions
 * 
 * Provides actions for doctors to approve, reject, and edit AI-generated drafts.
 * All actions are logged to the ai_audit_log for compliance.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getApiAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

const log = createLogger("draft-approval")

// Types
export interface DraftApprovalResult {
  success: boolean
  error?: string
  draftId?: string
}

export interface AIDraft {
  id: string
  intake_id: string
  type: "clinical_note" | "med_cert"
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

/**
 * Get AI drafts for an intake
 */
export async function getAIDraftsForIntake(intakeId: string): Promise<AIDraft[]> {
  const auth = await getApiAuth()
  if (!auth || !["doctor", "admin"].includes(auth.profile.role)) {
    return []
  }

  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from("document_drafts")
    .select("*")
    .eq("intake_id", intakeId)
    .eq("is_ai_generated", true)
    .order("created_at", { ascending: false })

  if (error) {
    log.error("Failed to fetch AI drafts", { intakeId }, error)
    return []
  }

  return data as AIDraft[]
}

/**
 * Approve an AI-generated draft
 * Optionally accepts edited content if the doctor made changes
 */
export async function approveDraft(
  draftId: string,
  editedContent?: Record<string, unknown>
): Promise<DraftApprovalResult> {
  const auth = await getApiAuth()
  if (!auth) {
    return { success: false, error: "Unauthorized" }
  }

  if (!["doctor", "admin"].includes(auth.profile.role)) {
    return { success: false, error: "Only doctors can approve drafts" }
  }

  const supabase = createServiceRoleClient()

  // Fetch the draft to verify it exists and get intake_id
  const { data: draft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("*")
    .eq("id", draftId)
    .single()

  if (fetchError || !draft) {
    log.error("Draft not found", { draftId }, fetchError)
    return { success: false, error: "Draft not found" }
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
      edited_content: editedContent || null,
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

  log.info("Draft approved", {
    draftId,
    intakeId: draft.intake_id,
    doctorId: auth.profile.id,
    hasEdits: !!editedContent,
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
  const auth = await getApiAuth()
  if (!auth) {
    return { success: false, error: "Unauthorized" }
  }

  if (!["doctor", "admin"].includes(auth.profile.role)) {
    return { success: false, error: "Only doctors can reject drafts" }
  }

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "Please provide a reason for rejection" }
  }

  const supabase = createServiceRoleClient()

  // Fetch the draft
  const { data: draft, error: fetchError } = await supabase
    .from("document_drafts")
    .select("*")
    .eq("id", draftId)
    .single()

  if (fetchError || !draft) {
    return { success: false, error: "Draft not found" }
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
  const auth = await getApiAuth()
  if (!auth) {
    return { success: false, error: "Unauthorized" }
  }

  if (!["doctor", "admin"].includes(auth.profile.role)) {
    return { success: false, error: "Only doctors can regenerate drafts" }
  }

  const supabase = createServiceRoleClient()

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

/**
 * Check if intake answers have changed since draft was generated
 */
export async function checkDraftStaleness(draftId: string): Promise<{
  isStale: boolean
  reason?: string
}> {
  const auth = await getApiAuth()
  if (!auth) {
    return { isStale: false }
  }

  const supabase = createServiceRoleClient()

  const { data: draft } = await supabase
    .from("document_drafts")
    .select("intake_id, input_hash, created_at")
    .eq("id", draftId)
    .single()

  if (!draft) {
    return { isStale: false }
  }

  // Check if draft is older than 24 hours
  const draftAge = Date.now() - new Date(draft.created_at).getTime()
  const hoursOld = draftAge / (1000 * 60 * 60)
  
  if (hoursOld > 24) {
    return { isStale: true, reason: `Draft is ${Math.floor(hoursOld)} hours old` }
  }

  // Check if input hash has changed
  if (draft.input_hash) {
    const currentHash = await computeIntakeHash(draft.intake_id)
    if (currentHash && currentHash !== draft.input_hash) {
      return { isStale: true, reason: "Patient answers have been updated since draft was generated" }
    }
  }

  return { isStale: false }
}

// Helper functions

async function computeIntakeHash(intakeId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  
  const { data: answers } = await supabase
    .from("intake_answers")
    .select("answers")
    .eq("intake_id", intakeId)
    .single()

  if (!answers) {
    return null
  }

  // Create deterministic hash of answers
  const content = JSON.stringify(answers.answers, Object.keys(answers.answers).sort())
  return crypto.createHash("sha256").update(content).digest("hex")
}

interface AuditEventParams {
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

async function logAuditEvent(params: AuditEventParams): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("ai_audit_log")
    .insert({
      intake_id: params.intakeId,
      action: params.action,
      draft_type: params.draftType,
      draft_id: params.draftId,
      actor_id: params.actorId,
      actor_type: params.actorType,
      input_hash: params.inputHash || null,
      output_hash: params.outputHash || null,
      model: params.model || null,
      prompt_tokens: params.promptTokens || null,
      completion_tokens: params.completionTokens || null,
      generation_duration_ms: params.generationDurationMs || null,
      validation_passed: params.validationPassed ?? null,
      ground_truth_passed: params.groundTruthPassed ?? null,
      validation_errors: params.validationErrors || null,
      ground_truth_errors: params.groundTruthErrors || null,
      metadata: params.metadata || {},
      reason: params.reason || null,
    })

  if (error) {
    log.error("Failed to log audit event", { 
      action: params.action, 
      intakeId: params.intakeId,
      draftId: params.draftId 
    }, error)
  }
}
