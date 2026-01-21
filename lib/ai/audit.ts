/**
 * AI Audit Logging Utility
 * 
 * Shared audit logging for all AI endpoints.
 * Logs to ai_chat_audit_log for TGA compliance.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createLogger } from '@/lib/observability/logger'
import { PROMPT_VERSION } from './prompts'

const log = createLogger('ai-audit')

export interface AIAuditParams {
  endpoint: string
  sessionId?: string
  userId?: string
  patientId?: string
  requestType?: string
  inputPreview: string
  outputPreview: string
  inputTokens?: number
  outputTokens?: number
  responseTimeMs: number
  modelVersion: string
  wasBlocked?: boolean
  blockReason?: string
  confidence?: number
  metadata?: Record<string, unknown>
}

/**
 * Log an AI interaction to the audit trail
 */
export async function logAIAudit(params: AIAuditParams): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    
    const entry = {
      session_id: params.sessionId || `${params.endpoint}_${Date.now()}`,
      patient_id: params.patientId || params.userId || null,
      service_type: params.requestType || params.endpoint,
      turn_number: 1,
      user_input_preview: params.inputPreview.slice(0, 200),
      ai_output_preview: params.outputPreview.slice(0, 500),
      user_input_length: params.inputPreview.length,
      ai_output_length: params.outputPreview.length,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      response_time_ms: params.responseTimeMs,
      model_version: params.modelVersion,
      prompt_version: PROMPT_VERSION,
      safety_flags: [],
      had_flags: false,
      was_blocked: params.wasBlocked || false,
      block_reason: params.blockReason,
      metadata: {
        endpoint: params.endpoint,
        confidence: params.confidence,
        ...params.metadata,
      },
      created_at: new Date().toISOString(),
    }
    
    const { error } = await supabase
      .from('ai_chat_audit_log')
      .insert(entry)
    
    if (error) {
      log.error('Failed to write AI audit entry', { error, endpoint: params.endpoint })
    }
  } catch (error) {
    log.error('AI audit error', { error, endpoint: params.endpoint })
  }
}

/**
 * Track token usage for cost monitoring
 */
export async function trackTokenUsage(params: {
  endpoint: string
  userId?: string
  modelVersion: string
  inputTokens: number
  outputTokens: number
  responseTimeMs: number
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    
    // Insert into token usage tracking table (create if doesn't exist)
    const { error } = await supabase
      .from('ai_token_usage')
      .insert({
        endpoint: params.endpoint,
        user_id: params.userId,
        model_version: params.modelVersion,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        total_tokens: params.inputTokens + params.outputTokens,
        response_time_ms: params.responseTimeMs,
        created_at: new Date().toISOString(),
      })
    
    if (error && !error.message.includes('does not exist')) {
      log.warn('Token usage tracking failed', { error })
    }
  } catch {
    // Silent fail - token tracking is non-critical
  }
}

/**
 * Log doctor feedback on AI drafts
 */
export async function logDoctorFeedback(params: {
  draftId: string
  draftType: 'clinical_note' | 'med_cert' | 'review_summary'
  doctorId: string
  originalOutput: string
  editedOutput: string
  wasSignificantEdit: boolean
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    
    // Calculate edit distance ratio
    const editRatio = calculateEditRatio(params.originalOutput, params.editedOutput)
    
    const { error } = await supabase
      .from('ai_doctor_feedback')
      .insert({
        draft_id: params.draftId,
        draft_type: params.draftType,
        doctor_id: params.doctorId,
        original_length: params.originalOutput.length,
        edited_length: params.editedOutput.length,
        edit_ratio: editRatio,
        was_significant_edit: params.wasSignificantEdit || editRatio > 0.3,
        created_at: new Date().toISOString(),
      })
    
    if (error && !error.message.includes('does not exist')) {
      log.warn('Doctor feedback logging failed', { error })
    }
  } catch {
    // Silent fail - feedback tracking is non-critical
  }
}

/**
 * Simple edit distance ratio calculation
 */
function calculateEditRatio(original: string, edited: string): number {
  if (original === edited) return 0
  if (!original || !edited) return 1
  
  const maxLen = Math.max(original.length, edited.length)
  const minLen = Math.min(original.length, edited.length)
  
  // Quick heuristic based on length difference
  const lengthDiff = Math.abs(original.length - edited.length) / maxLen
  
  // Sample character differences
  let differences = 0
  for (let i = 0; i < minLen; i += 10) {
    if (original[i] !== edited[i]) differences++
  }
  const charDiff = differences / (minLen / 10)
  
  return Math.min(1, (lengthDiff + charDiff) / 2)
}
