"use server"

/**
 * Draft Validation
 *
 * Staleness checks and input-hash computation for AI-generated drafts.
 * Split from draft-approval.ts for single-responsibility.
 */

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { computeIntakeHash } from "@/lib/data/intake-answer-hash"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Check if intake answers have changed since draft was generated
 */
export async function checkDraftStaleness(draftId: string): Promise<{
  isStale: boolean
  reason?: string
}> {
  const auth = await requireRoleOrNull(["doctor", "admin"])
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
