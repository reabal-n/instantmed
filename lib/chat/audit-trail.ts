/**
 * AI Interaction Audit Trail
 * 
 * Logs all AI chat interactions for TGA compliance and incident investigation.
 * Stored in Supabase for querying and retention.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createLogger } from '@/lib/observability/logger'
import * as Sentry from '@sentry/nextjs'

const log = createLogger('ai-audit-trail')

// =============================================================================
// TRANSCRIPT LIMITS (to prevent unbounded growth)
// =============================================================================

/** Maximum number of messages per transcript (truncate oldest if exceeded) */
export const MAX_TRANSCRIPT_MESSAGES = 100

/** Maximum JSON size in bytes for messages field (~500KB) */
export const MAX_TRANSCRIPT_JSON_SIZE = 500 * 1024

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
      .select('id, session_id, patient_id, service_type, turn_number, user_input_preview, ai_output_preview, user_input_length, ai_output_length, input_tokens, output_tokens, response_time_ms, model_version, prompt_version, safety_flags, had_flags, was_blocked, block_reason, metadata, created_at')
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
// TRANSCRIPT STORAGE (Full conversation for doctor review)
// =============================================================================

export interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatTranscript {
  id: string
  session_id: string
  patient_id: string | null
  intake_id: string | null
  messages: TranscriptMessage[]
  service_type: string | null
  model_version: string
  prompt_version: string
  total_turns: number
  is_complete: boolean
  completion_status: string | null
  had_safety_flags: boolean
  safety_flags: string[]
  was_blocked: boolean
  block_reason: string | null
  started_at: string
  last_activity_at: string
  completed_at: string | null
}

// Patterns to redact from transcript content
const REDACTION_PATTERNS = [
  // API keys and tokens
  /\b(sk-[a-zA-Z0-9]{20,})\b/gi,
  /\b(Bearer\s+[a-zA-Z0-9._-]+)\b/gi,
  /\b(api[_-]?key[=:]\s*[a-zA-Z0-9._-]+)\b/gi,
  // Database connection strings
  /\b(postgres:\/\/[^\s]+)\b/gi,
  /\b(mongodb:\/\/[^\s]+)\b/gi,
  /\b(mysql:\/\/[^\s]+)\b/gi,
  // Supabase/service URLs with keys
  /\b(supabase[^\s]*key[=:][^\s]+)\b/gi,
  // Generic secrets
  /\b(secret[=:]\s*[a-zA-Z0-9._-]{10,})\b/gi,
  /\b(password[=:]\s*[^\s]+)\b/gi,
]

/**
 * Redact sensitive content from text
 */
function redactSensitiveContent(text: string): string {
  let redacted = text
  for (const pattern of REDACTION_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]')
  }
  return redacted
}

/**
 * Truncate messages array if it exceeds limits
 * Keeps most recent messages, removes oldest (except first user message for context)
 */
function truncateMessagesIfNeeded(
  messages: TranscriptMessage[],
  sessionId: string
): { messages: TranscriptMessage[]; wasTruncated: boolean } {
  // Check message count
  if (messages.length > MAX_TRANSCRIPT_MESSAGES) {
    log.warn('Transcript message count exceeded limit, truncating oldest messages', {
      sessionId,
      originalCount: messages.length,
      limit: MAX_TRANSCRIPT_MESSAGES,
    })
    
    // Keep first message (initial context) and most recent messages
    const firstMessage = messages[0]
    const recentMessages = messages.slice(-(MAX_TRANSCRIPT_MESSAGES - 1))
    
    // Add truncation marker
    const truncationMarker: TranscriptMessage = {
      role: 'assistant',
      content: `[... ${messages.length - MAX_TRANSCRIPT_MESSAGES} earlier messages truncated for storage limits ...]`,
      timestamp: new Date().toISOString(),
    }
    
    return {
      messages: [firstMessage, truncationMarker, ...recentMessages],
      wasTruncated: true,
    }
  }
  
  // Check JSON size
  const jsonSize = JSON.stringify(messages).length
  if (jsonSize > MAX_TRANSCRIPT_JSON_SIZE) {
    log.warn('Transcript JSON size exceeded limit, truncating', {
      sessionId,
      jsonSize,
      limit: MAX_TRANSCRIPT_JSON_SIZE,
    })
    
    // Progressively remove oldest messages until under limit
    const truncatedMessages = [...messages]
    while (JSON.stringify(truncatedMessages).length > MAX_TRANSCRIPT_JSON_SIZE && truncatedMessages.length > 2) {
      // Remove second message (keep first for context)
      truncatedMessages.splice(1, 1)
    }
    
    // Add truncation marker at position 1
    const truncationMarker: TranscriptMessage = {
      role: 'assistant',
      content: `[... earlier messages truncated due to size limits ...]`,
      timestamp: new Date().toISOString(),
    }
    truncatedMessages.splice(1, 0, truncationMarker)
    
    return { messages: truncatedMessages, wasTruncated: true }
  }
  
  return { messages, wasTruncated: false }
}

/**
 * Upsert (create or update) a chat transcript
 * Called after each turn to maintain full conversation history
 * 
 * RELIABILITY: This function is designed to be failure-tolerant:
 * - Truncates messages if they exceed limits
 * - Logs errors to Sentry with context tags
 * - Never throws - failures are logged but don't break the chat flow
 */
export async function upsertChatTranscript(params: {
  sessionId: string
  patientId?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  serviceType?: string | null
  modelVersion: string
  promptVersion: string
  safetyFlags?: string[]
  wasBlocked?: boolean
  blockReason?: string
  intakeId?: string // Optional intake ID if already known
}): Promise<{ success: boolean; wasTruncated?: boolean }> {
  try {
    const supabase = createServiceRoleClient()
    
    // Convert messages to transcript format with redaction
    let transcriptMessages: TranscriptMessage[] = params.messages.map(m => ({
      role: m.role,
      content: redactSensitiveContent(m.content),
      timestamp: new Date().toISOString(),
    }))
    
    // Apply truncation guards
    const truncationResult = truncateMessagesIfNeeded(transcriptMessages, params.sessionId)
    transcriptMessages = truncationResult.messages
    
    const totalTurns = Math.ceil(params.messages.filter(m => m.role === 'user').length)
    const hadFlags = (params.safetyFlags?.length || 0) > 0
    
    const upsertData: Record<string, unknown> = {
      session_id: params.sessionId,
      patient_id: params.patientId || null,
      messages: transcriptMessages,
      service_type: params.serviceType || null,
      model_version: params.modelVersion,
      prompt_version: params.promptVersion,
      total_turns: totalTurns,
      had_safety_flags: hadFlags,
      safety_flags: params.safetyFlags || [],
      was_blocked: params.wasBlocked || false,
      block_reason: params.blockReason || null,
      last_activity_at: new Date().toISOString(),
    }
    
    // Include intake_id if provided
    if (params.intakeId) {
      upsertData.intake_id = params.intakeId
    }
    
    const { error } = await supabase
      .from('ai_chat_transcripts')
      .upsert(upsertData, {
        onConflict: 'session_id',
        ignoreDuplicates: false,
      })
    
    if (error) {
      log.error('Failed to upsert chat transcript', { error, sessionId: params.sessionId })
      
      // Capture to Sentry with context tags
      Sentry.captureException(new Error(`Chat transcript upsert failed: ${error.message}`), {
        tags: {
          feature: 'chat_transcript',
          route: '/api/ai/chat-intake',
          session_id: params.sessionId,
          intake_id: params.intakeId || 'none',
        },
        extra: {
          errorCode: error.code,
          errorDetails: error.details,
          messageCount: params.messages.length,
          wasTruncated: truncationResult.wasTruncated,
        },
      })
      
      return { success: false }
    }
    
    return { success: true, wasTruncated: truncationResult.wasTruncated }
  } catch (error) {
    log.error('Chat transcript upsert error', { error, sessionId: params.sessionId })
    
    // Capture unexpected errors to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'chat_transcript',
        route: '/api/ai/chat-intake',
        session_id: params.sessionId,
        intake_id: params.intakeId || 'none',
      },
      extra: {
        messageCount: params.messages.length,
      },
    })
    
    return { success: false }
  }
}

/**
 * Mark transcript as complete and optionally link to intake
 * 
 * RELIABILITY: Logs errors to Sentry with context tags
 */
export async function completeTranscript(
  sessionId: string,
  intakeId?: string,
  status: 'submitted' | 'abandoned' | 'blocked' = 'submitted'
): Promise<{ success: boolean }> {
  try {
    const supabase = createServiceRoleClient()
    
    const updateData: Record<string, unknown> = {
      is_complete: true,
      completion_status: status,
      completed_at: new Date().toISOString(),
    }
    
    if (intakeId) {
      updateData.intake_id = intakeId
    }
    
    const { error } = await supabase
      .from('ai_chat_transcripts')
      .update(updateData)
      .eq('session_id', sessionId)
    
    if (error) {
      log.error('Failed to complete transcript', { error, sessionId, intakeId })
      
      // Capture to Sentry with context tags
      Sentry.captureException(new Error(`Chat transcript completion failed: ${error.message}`), {
        tags: {
          feature: 'chat_transcript',
          route: '/api/ai/chat-intake',
          session_id: sessionId,
          intake_id: intakeId || 'none',
        },
        extra: {
          errorCode: error.code,
          errorDetails: error.details,
          completionStatus: status,
        },
      })
      
      return { success: false }
    }
    
    return { success: true }
  } catch (error) {
    log.error('Transcript completion error', { error, sessionId })
    
    // Capture unexpected errors to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'chat_transcript',
        route: '/api/ai/chat-intake',
        session_id: sessionId,
        intake_id: intakeId || 'none',
      },
      extra: {
        completionStatus: status,
      },
    })
    
    return { success: false }
  }
}

/**
 * Get transcript by session ID
 */
export async function getTranscriptBySession(sessionId: string): Promise<ChatTranscript | null> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from('ai_chat_transcripts')
      .select('id, session_id, patient_id, intake_id, messages, service_type, model_version, prompt_version, total_turns, is_complete, completion_status, had_safety_flags, safety_flags, was_blocked, block_reason, started_at, last_activity_at, completed_at')
      .eq('session_id', sessionId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      log.error('Failed to fetch transcript by session', { error, sessionId })
      return null
    }
    
    return data as ChatTranscript
  } catch (error) {
    log.error('Transcript fetch error', { error, sessionId })
    return null
  }
}

/**
 * Get transcript by intake ID (for doctor UI)
 */
export async function getTranscriptByIntake(intakeId: string): Promise<ChatTranscript | null> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from('ai_chat_transcripts')
      .select('id, session_id, patient_id, intake_id, messages, service_type, model_version, prompt_version, total_turns, is_complete, completion_status, had_safety_flags, safety_flags, was_blocked, block_reason, started_at, last_activity_at, completed_at')
      .eq('intake_id', intakeId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      log.error('Failed to fetch transcript by intake', { error, intakeId })
      return null
    }
    
    return data as ChatTranscript
  } catch (error) {
    log.error('Transcript fetch by intake error', { error, intakeId })
    return null
  }
}

/**
 * Get transcripts for a patient
 */
export async function getTranscriptsForPatient(
  patientId: string,
  limit: number = 20
): Promise<ChatTranscript[]> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from('ai_chat_transcripts')
      .select('id, session_id, patient_id, intake_id, messages, service_type, model_version, prompt_version, total_turns, is_complete, completion_status, had_safety_flags, safety_flags, was_blocked, block_reason, started_at, last_activity_at, completed_at')
      .eq('patient_id', patientId)
      .order('started_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      log.error('Failed to fetch patient transcripts', { error, patientId })
      return []
    }
    
    return data as ChatTranscript[]
  } catch (error) {
    log.error('Patient transcripts fetch error', { error, patientId })
    return []
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PROMPT_VERSION = '2.1' // Increment when system prompt changes
