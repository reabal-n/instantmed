/**
 * Intake Analytics — AI Chat Interactions
 *
 * Tracks AI chat turn data for optimization and compliance audit.
 * Funnel step tracking lives in lib/posthog-server.ts (trackIntakeFunnelStep).
 */

import { getPostHogClient } from '@/lib/posthog-server'

export interface AIInteractionEvent {
  sessionId: string
  messageCount: number
  serviceType: string | null
  turnNumber: number
  inputLength: number
  outputLength: number
  responseTimeMs: number
  hasFlags: boolean
  flagTypes?: string[]
  modelVersion: string
  promptVersion: string
}

/**
 * Track AI chat interaction for audit and optimization.
 * Called server-side from the chat-intake route handler.
 */
export function trackAIInteraction(
  event: AIInteractionEvent,
  userId?: string
) {
  try {
    const client = getPostHogClient()
    const distinctId = userId || event.sessionId || 'anonymous'

    client.capture({
      distinctId,
      event: 'ai_chat_interaction',
      properties: {
        session_id: event.sessionId,
        message_count: event.messageCount,
        service_type: event.serviceType,
        turn_number: event.turnNumber,
        input_length: event.inputLength,
        output_length: event.outputLength,
        response_time_ms: event.responseTimeMs,
        has_flags: event.hasFlags,
        flag_types: event.flagTypes,
        model_version: event.modelVersion,
        prompt_version: event.promptVersion,
      },
    })
  } catch {
    // Non-blocking
  }
}
