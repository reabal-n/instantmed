"use server"

/**
 * Server action to fetch chat transcript for doctor UI
 * 
 * Used by doctor intake detail view to display full AI chat conversation.
 */

import { createLogger } from "@/lib/observability/logger"
import { getTranscriptByIntake, getTranscriptBySession, type ChatTranscript, type TranscriptMessage } from "@/lib/chat/audit-trail"
import { requireRole } from "@/lib/auth"

const log = createLogger("get-chat-transcript")

export interface GetTranscriptResult {
  success: boolean
  transcript?: {
    id: string
    sessionId: string
    intakeId: string | null
    messages: TranscriptMessage[]
    serviceType: string | null
    modelVersion: string
    totalTurns: number
    isComplete: boolean
    hadSafetyFlags: boolean
    safetyFlags: string[]
    startedAt: string
    completedAt: string | null
  }
  error?: string
}

/**
 * Get chat transcript for an intake (doctor use)
 */
export async function getChatTranscriptForIntake(intakeId: string): Promise<GetTranscriptResult> {
  try {
    // Require authenticated doctor or admin (redirects if not authorized)
    await requireRole(["doctor", "admin"])
    
    const transcript = await getTranscriptByIntake(intakeId)
    
    if (!transcript) {
      // No transcript found - may be a non-chat intake
      return { success: true, transcript: undefined }
    }
    
    return {
      success: true,
      transcript: mapTranscriptToResult(transcript),
    }
  } catch (error) {
    log.error("Failed to get transcript for intake", { intakeId }, error)
    return { success: false, error: "Failed to fetch transcript" }
  }
}

/**
 * Get chat transcript by session ID (admin/audit use)
 */
export async function getChatTranscriptBySession(sessionId: string): Promise<GetTranscriptResult> {
  try {
    // Require authenticated admin (redirects if not authorized)
    await requireRole(["admin"])
    
    const transcript = await getTranscriptBySession(sessionId)
    
    if (!transcript) {
      return { success: false, error: "Transcript not found" }
    }
    
    return {
      success: true,
      transcript: mapTranscriptToResult(transcript),
    }
  } catch (error) {
    log.error("Failed to get transcript by session", { sessionId }, error)
    return { success: false, error: "Failed to fetch transcript" }
  }
}

/**
 * Map database transcript to API result
 */
function mapTranscriptToResult(transcript: ChatTranscript): GetTranscriptResult["transcript"] {
  return {
    id: transcript.id,
    sessionId: transcript.session_id,
    intakeId: transcript.intake_id,
    messages: transcript.messages,
    serviceType: transcript.service_type,
    modelVersion: transcript.model_version,
    totalTurns: transcript.total_turns,
    isComplete: transcript.is_complete,
    hadSafetyFlags: transcript.had_safety_flags,
    safetyFlags: transcript.safety_flags,
    startedAt: transcript.started_at,
    completedAt: transcript.completed_at,
  }
}
