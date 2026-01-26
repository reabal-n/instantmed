/**
 * PHI Field Read/Write Wrappers
 * 
 * Server-side wrappers for reading and writing encrypted PHI fields.
 * These provide a consistent interface during the migration period where
 * both plaintext and encrypted values may exist.
 * 
 * IMPORTANT: These functions are SERVER-ONLY. Never expose to client.
 */

import "server-only"
import { encryptPHI, decryptPHI, isEncryptedPHI, type EncryptedPHI } from "./phi-encryption"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("phi-field-wrappers")

// Feature flags for gradual rollout
const isWriteEnabled = () => process.env.PHI_ENCRYPTION_WRITE_ENABLED === "true"
const isReadEnabled = () => process.env.PHI_ENCRYPTION_READ_ENABLED === "true"
const isEncryptionEnabled = () => process.env.PHI_ENCRYPTION_ENABLED === "true"

// ============================================================================
// DOCTOR NOTES (intakes.doctor_notes / doctor_notes_enc)
// ============================================================================

export interface DoctorNotesWriteResult {
  /** Plaintext value (for backward compatibility during migration) */
  doctor_notes: string | null
  /** Encrypted value (for new storage) */
  doctor_notes_enc: EncryptedPHI | null
}

/**
 * Prepare doctor_notes for database write
 * 
 * During migration:
 * - If encryption enabled: writes both plaintext (for rollback) and encrypted
 * - If encryption disabled: writes plaintext only
 */
export async function prepareDoctorNotesWrite(
  notes: string | null
): Promise<DoctorNotesWriteResult> {
  if (!notes) {
    return { doctor_notes: null, doctor_notes_enc: null }
  }

  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const encrypted = await encryptPHI(notes)
      // During migration, write both for rollback capability
      return {
        doctor_notes: notes, // Keep plaintext during migration
        doctor_notes_enc: encrypted,
      }
    } catch (error) {
      logger.error("Failed to encrypt doctor_notes, falling back to plaintext", {}, 
        error instanceof Error ? error : new Error(String(error)))
      // Fallback to plaintext on encryption failure
      return { doctor_notes: notes, doctor_notes_enc: null }
    }
  }

  return { doctor_notes: notes, doctor_notes_enc: null }
}

/**
 * Read doctor_notes from database record
 * 
 * During migration:
 * - Prefers encrypted value if available and decryption enabled
 * - Falls back to plaintext if encrypted not available or decryption fails
 */
export async function readDoctorNotes(record: {
  doctor_notes?: string | null
  doctor_notes_enc?: EncryptedPHI | null
}): Promise<string | null> {
  // Try encrypted first if enabled
  if (isEncryptionEnabled() && isReadEnabled() && record.doctor_notes_enc) {
    if (isEncryptedPHI(record.doctor_notes_enc)) {
      try {
        return await decryptPHI(record.doctor_notes_enc)
      } catch (error) {
        logger.error("Failed to decrypt doctor_notes, falling back to plaintext", {},
          error instanceof Error ? error : new Error(String(error)))
        // Fall through to plaintext
      }
    }
  }

  // Fallback to plaintext
  return record.doctor_notes ?? null
}

// ============================================================================
// INTAKE ANSWERS (intake_answers.answers / answers_enc)
// ============================================================================

export interface AnswersWriteResult {
  /** Plaintext value (for backward compatibility during migration) */
  answers: Record<string, unknown> | null
  /** Encrypted value (for new storage) */
  answers_enc: EncryptedPHI | null
}

/**
 * Prepare answers for database write
 */
export async function prepareAnswersWrite(
  answers: Record<string, unknown> | null
): Promise<AnswersWriteResult> {
  if (!answers) {
    return { answers: null, answers_enc: null }
  }

  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const plaintext = JSON.stringify(answers)
      const encrypted = await encryptPHI(plaintext)
      return {
        answers: answers, // Keep plaintext during migration
        answers_enc: encrypted,
      }
    } catch (error) {
      logger.error("Failed to encrypt answers, falling back to plaintext", {},
        error instanceof Error ? error : new Error(String(error)))
      return { answers: answers, answers_enc: null }
    }
  }

  return { answers: answers, answers_enc: null }
}

/**
 * Read answers from database record
 */
export async function readAnswers(record: {
  answers?: Record<string, unknown> | null
  answers_enc?: EncryptedPHI | null
}): Promise<Record<string, unknown> | null> {
  if (isEncryptionEnabled() && isReadEnabled() && record.answers_enc) {
    if (isEncryptedPHI(record.answers_enc)) {
      try {
        const plaintext = await decryptPHI(record.answers_enc)
        return JSON.parse(plaintext) as Record<string, unknown>
      } catch (error) {
        logger.error("Failed to decrypt answers, falling back to plaintext", {},
          error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  return record.answers ?? null
}

// ============================================================================
// AI CHAT MESSAGES (ai_chat_transcripts.messages / messages_enc)
// ============================================================================

export interface MessagesWriteResult {
  /** Plaintext value (for backward compatibility during migration) */
  messages: unknown[] | null
  /** Encrypted value (for new storage) */
  messages_enc: EncryptedPHI | null
}

/**
 * Prepare chat messages for database write
 */
export async function prepareMessagesWrite(
  messages: unknown[] | null
): Promise<MessagesWriteResult> {
  if (!messages || messages.length === 0) {
    return { messages: null, messages_enc: null }
  }

  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const plaintext = JSON.stringify(messages)
      const encrypted = await encryptPHI(plaintext)
      return {
        messages: messages, // Keep plaintext during migration
        messages_enc: encrypted,
      }
    } catch (error) {
      logger.error("Failed to encrypt messages, falling back to plaintext", {},
        error instanceof Error ? error : new Error(String(error)))
      return { messages: messages, messages_enc: null }
    }
  }

  return { messages: messages, messages_enc: null }
}

/**
 * Read chat messages from database record
 */
export async function readMessages(record: {
  messages?: unknown[] | null
  messages_enc?: EncryptedPHI | null
}): Promise<unknown[] | null> {
  if (isEncryptionEnabled() && isReadEnabled() && record.messages_enc) {
    if (isEncryptedPHI(record.messages_enc)) {
      try {
        const plaintext = await decryptPHI(record.messages_enc)
        return JSON.parse(plaintext) as unknown[]
      } catch (error) {
        logger.error("Failed to decrypt messages, falling back to plaintext", {},
          error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  return record.messages ?? null
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Check if a record needs encryption migration
 */
export function needsEncryptionMigration(record: {
  doctor_notes?: string | null
  doctor_notes_enc?: EncryptedPHI | null
} | {
  answers?: Record<string, unknown> | null
  answers_enc?: EncryptedPHI | null
} | {
  messages?: unknown[] | null
  messages_enc?: EncryptedPHI | null
}): boolean {
  // Has plaintext but no encrypted version
  if ('doctor_notes' in record) {
    return !!record.doctor_notes && !record.doctor_notes_enc
  }
  if ('answers' in record) {
    return !!record.answers && !record.answers_enc
  }
  if ('messages' in record) {
    return !!record.messages && !record.messages_enc
  }
  return false
}

/**
 * Get encryption status for monitoring
 */
export function getEncryptionStatus(): {
  enabled: boolean
  writeEnabled: boolean
  readEnabled: boolean
} {
  return {
    enabled: isEncryptionEnabled(),
    writeEnabled: isWriteEnabled(),
    readEnabled: isReadEnabled(),
  }
}
