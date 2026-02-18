/**
 * Database helpers for document drafts
 * 
 * Provides upsert/fetch operations for AI-generated drafts.
 */

import "server-only"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("ai-drafts-db")

export type DraftType = "clinical_note" | "med_cert" | "repeat_rx" | "consult"
export type DraftStatus = "ready" | "failed" | "pending"

export interface DocumentDraft {
  id: string
  intake_id: string
  type: DraftType
  content: Record<string, unknown>
  model: string
  is_ai_generated: boolean
  status: DraftStatus
  error: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  generation_duration_ms: number | null
  validation_errors: unknown[] | null
  ground_truth_errors: unknown[] | null
  created_at: string
  updated_at: string
}

export interface UpsertDraftParams {
  intakeId: string
  type: DraftType
  content: Record<string, unknown>
  model?: string
  status: DraftStatus
  error?: string | null
  promptTokens?: number
  completionTokens?: number
  generationDurationMs?: number
  validationErrors?: unknown[]
  groundTruthErrors?: unknown[]
}

/**
 * Get service client for server-side operations
 */
function getServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
}

/**
 * Upsert a document draft (insert or update on conflict)
 * Uses the unique constraint on (intake_id, type) for idempotency
 */
export async function upsertDraft(params: UpsertDraftParams): Promise<DocumentDraft | null> {
  const supabase = getServiceClient()
  
  const { data, error } = await supabase
    .from("document_drafts")
    .upsert(
      {
        intake_id: params.intakeId,
        type: params.type,
        content: params.content,
        model: params.model || "openai/gpt-4o-mini",
        is_ai_generated: true,
        status: params.status,
        error: params.error || null,
        prompt_tokens: params.promptTokens || null,
        completion_tokens: params.completionTokens || null,
        generation_duration_ms: params.generationDurationMs || null,
        validation_errors: params.validationErrors || null,
        ground_truth_errors: params.groundTruthErrors || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "intake_id,type",
        ignoreDuplicates: false,
      }
    )
    .select("id, intake_id, type, content, model, is_ai_generated, status, error, prompt_tokens, completion_tokens, generation_duration_ms, validation_errors, ground_truth_errors, created_at, updated_at")
    .single()

  if (error) {
    log.error("Failed to upsert draft", { 
      intakeId: params.intakeId, 
      type: params.type 
    }, error)
    return null
  }

  return data as DocumentDraft
}

/**
 * Fetch drafts for an intake
 */
export async function getDraftsForIntake(intakeId: string): Promise<DocumentDraft[]> {
  const supabase = getServiceClient()
  
  const { data, error } = await supabase
    .from("document_drafts")
    .select("id, intake_id, type, content, model, is_ai_generated, status, error, prompt_tokens, completion_tokens, generation_duration_ms, validation_errors, ground_truth_errors, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, version, edited_content, input_hash, created_at, updated_at")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })

  if (error) {
    log.error("Failed to fetch drafts", { intakeId }, error)
    return []
  }

  return data as DocumentDraft[]
}

/**
 * Fetch a specific draft by intake and type
 */
export async function getDraft(
  intakeId: string, 
  type: DraftType
): Promise<DocumentDraft | null> {
  const supabase = getServiceClient()
  
  const { data, error } = await supabase
    .from("document_drafts")
    .select("id, intake_id, type, content, model, is_ai_generated, status, error, prompt_tokens, completion_tokens, generation_duration_ms, validation_errors, ground_truth_errors, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, version, edited_content, input_hash, created_at, updated_at")
    .eq("intake_id", intakeId)
    .eq("type", type)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // Not found - not an error
      return null
    }
    log.error("Failed to fetch draft", { intakeId, type }, error)
    return null
  }

  return data as DocumentDraft
}

/**
 * Check if drafts already exist for an intake
 */
export async function draftsExist(intakeId: string): Promise<boolean> {
  const supabase = getServiceClient()
  
  const { count, error } = await supabase
    .from("document_drafts")
    .select("id", { count: "exact", head: true })
    .eq("intake_id", intakeId)
    .eq("status", "ready")

  if (error) {
    log.error("Failed to check drafts existence", { intakeId }, error)
    return false
  }

  return (count || 0) > 0
}

/**
 * Delete drafts for an intake (used when regenerating)
 */
export async function deleteDrafts(intakeId: string): Promise<boolean> {
  const supabase = getServiceClient()
  
  const { error } = await supabase
    .from("document_drafts")
    .delete()
    .eq("intake_id", intakeId)

  if (error) {
    log.error("Failed to delete drafts", { intakeId }, error)
    return false
  }

  return true
}
