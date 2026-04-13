"use server"

/**
 * Draft Retrieval
 *
 * Read-only query functions for fetching AI-generated drafts.
 * Split from draft-approval.ts for single-responsibility.
 */

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { createLogger } from "@/lib/observability/logger"
import { readDocumentDraftEditedContent } from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { AIDraft } from "./types"

const log = createLogger("draft-retrieval")

/**
 * Get AI drafts for an intake
 */
export async function getAIDraftsForIntake(intakeId: string): Promise<AIDraft[]> {
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) {
    return []
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("document_drafts")
    .select("id, intake_id, type, content, model, is_ai_generated, status, error, prompt_tokens, completion_tokens, generation_duration_ms, validation_errors, ground_truth_errors, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, version, edited_content, edited_content_enc, input_hash, created_at, updated_at")
    .eq("intake_id", intakeId)
    .eq("is_ai_generated", true)
    .order("created_at", { ascending: false })

  if (error) {
    log.error("Failed to fetch AI drafts", { intakeId }, error)
    return []
  }

  // Decrypt edited_content for each draft
  const decrypted = await Promise.all(
    data.map(async (row) => {
      const editedContent = await readDocumentDraftEditedContent(row)
      const { edited_content_enc: _enc, ...rest } = row
      return { ...rest, edited_content: editedContent } as AIDraft
    })
  )

  return decrypted
}
