/**
 * AI Interaction Audit Trail
 * 
 * Logs all AI chat interactions for TGA compliance and incident investigation.
 * Stored in Supabase for querying and retention.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('ai-audit-trail')

// =============================================================================
// TYPES
// =============================================================================

export interface AIAuditEntry {
  sessionId: string
  patientId?: string
  serviceType: string | null
  turnNumber: number
  userInput: string
  aiOutput: string
  inputTokens?: number
  outputTokens?: number
  responseTimeMs: number
  modelVersion: string
  promptVersion: string
  safetyFlags: string[]
  wasBlocked: boolean
  blockReason?: string
  metadata?: Record<string, unknown>
}

export interface AuditQueryFilters {
  patientId?: string
  sessionId?: string
  serviceType?: string
  startDate?: Date
  endDate?: Date
  hadFlags?: boolean
  wasBlocked?: boolean
  limit?: number
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log an AI interaction to the audit trail
 * CRITICAL: This must be called for every AI interaction for TGA compliance
 */
export async function logAIInteraction(entry: AIAuditEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    
    // Sanitize sensitive data - don't store full content, just metadata
    const sanitizedEntry = {
      session_id: entry.sessionId,
      patient_id: entry.patientId || null,
      service_type: entry.serviceType,
      turn_number: entry.turnNumber,
      // Store truncated versions for audit, not full content
      user_input_preview: entry.userInput.slice(0, 200),
      ai_output_preview: entry.aiOutput.slice(0, 500),
      user_input_length: entry.userInput.length,
      ai_output_length: entry.aiOutput.length,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      response_time_ms: entry.responseTimeMs,
      model_version: entry.modelVersion,
      prompt_version: entry.promptVersion,
      safety_flags: entry.safetyFlags,
      had_flags: entry.safetyFlags.length > 0,
      was_blocked: entry.wasBlocked,
      block_reason: entry.blockReason,
      metadata: entry.metadata,
      created_at: new Date().toISOString(),
    }
    
    const { error } = await supabase
      .from('ai_chat_audit_log')
      .insert(sanitizedEntry)
    
    if (error) {
      // Log error but don't throw - audit shouldn't break the flow
      log.error('Failed to write audit entry', { error, sessionId: entry.sessionId })
    }
  } catch (error) {
    log.error('Audit trail error', { error, sessionId: entry.sessionId })
  }
}

/**
 * Log a safety block event
 */
export async function logSafetyBlock(
  sessionId: string,
  patientId: string | undefined,
  blockType: 'emergency' | 'crisis' | 'controlled_substance' | 'injection',
  triggerContent: string,
  modelVersion: string
): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    
    const { error } = await supabase
      .from('ai_safety_blocks')
      .insert({
        session_id: sessionId,
        patient_id: patientId || null,
        block_type: blockType,
        trigger_preview: triggerContent.slice(0, 100),
        model_version: modelVersion,
        created_at: new Date().toISOString(),
      })
    
    if (error) {
      log.error('Failed to log safety block', { error, sessionId })
    }
    
    // Also log to observability
    log.warn('AI safety block triggered', {
      sessionId,
      blockType,
      patientId,
    })
  } catch (error) {
    log.error('Safety block logging error', { error })
  }
}

/**
 * Log intake completion
 */
export async function logIntakeCompletion(
  sessionId: string,
  patientId: string | undefined,
  serviceType: string,
  totalTurns: number,
  totalTimeMs: number,
  collectedFields: string[],
  flags: string[]
): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    
    const { error } = await supabase
      .from('ai_intake_completions')
      .insert({
        session_id: sessionId,
        patient_id: patientId || null,
        service_type: serviceType,
        total_turns: totalTurns,
        total_time_ms: totalTimeMs,
        collected_fields: collectedFields,
        flags: flags,
        had_flags: flags.length > 0,
        created_at: new Date().toISOString(),
      })
    
    if (error) {
      log.error('Failed to log intake completion', { error, sessionId })
    }
  } catch (error) {
    log.error('Intake completion logging error', { error })
  }
}

// =============================================================================
// AUDIT QUERIES (for admin/compliance)
// =============================================================================

/**
 * Query audit trail for compliance review
 */
export async function queryAuditTrail(filters: AuditQueryFilters) {
  try {
    const supabase = createServiceRoleClient()
    
    let query = supabase
      .from('ai_chat_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100)
    
    if (filters.patientId) {
      query = query.eq('patient_id', filters.patientId)
    }
    if (filters.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }
    if (filters.serviceType) {
      query = query.eq('service_type', filters.serviceType)
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString())
    }
    if (filters.hadFlags !== undefined) {
      query = query.eq('had_flags', filters.hadFlags)
    }
    if (filters.wasBlocked !== undefined) {
      query = query.eq('was_blocked', filters.wasBlocked)
    }
    
    const { data, error } = await query
    
    if (error) {
      log.error('Audit query failed', { error, filters })
      return []
    }
    
    return data
  } catch (error) {
    log.error('Audit query error', { error })
    return []
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PROMPT_VERSION = '2.1' // Increment when system prompt changes
