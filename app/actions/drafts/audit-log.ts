"use server"

/**
 * Draft Audit Logging
 *
 * Writes to the ai_audit_log table for compliance. Used by approval,
 * rejection, and regeneration actions.
 */

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { AuditEventParams } from "./types"

const log = createLogger("draft-audit")

export async function logAuditEvent(params: AuditEventParams): Promise<{ success: boolean; error?: string }> {
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
    return { success: false, error: error.message }
  }

  return { success: true }
}
