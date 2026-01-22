/**
 * Intake Answers Data Layer
 * 
 * Provides encrypted storage and retrieval of PHI in intake_answers.
 * Uses envelope encryption when PHI_ENCRYPTION_ENABLED=true.
 */

import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import {
  encryptJSONB,
  decryptJSONB,
  isEncryptedPHI,
  type EncryptedPHI,
} from "@/lib/security/phi-encryption"

const logger = createLogger("intake-answers")

// Feature flag check
const isEncryptionEnabled = () => process.env.PHI_ENCRYPTION_ENABLED === "true"
const isWriteEnabled = () => process.env.PHI_ENCRYPTION_WRITE_ENABLED === "true"
const isReadEnabled = () => process.env.PHI_ENCRYPTION_READ_ENABLED === "true"

// ============================================================================
// TYPES
// ============================================================================

export interface IntakeAnswersInput {
  intake_id: string
  answers: Record<string, unknown>
  // Optional extracted fields
  has_allergies?: boolean
  allergy_details?: string
  has_current_medications?: boolean
  current_medications?: string[]
  has_medical_conditions?: boolean
  medical_conditions?: string[]
  symptom_duration?: string
  symptom_severity?: "mild" | "moderate" | "severe"
}

export interface IntakeAnswersRow {
  id: string
  intake_id: string
  answers: Record<string, unknown>
  answers_encrypted?: EncryptedPHI | null
  encryption_metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Save intake answers with optional encryption
 * 
 * When encryption is enabled:
 * - Encrypts the answers JSONB field
 * - Stores encrypted data in answers_encrypted
 * - Stores metadata for audit
 * - Also stores plaintext in answers (dual-write for migration)
 */
export async function saveIntakeAnswers(
  input: IntakeAnswersInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    // Base insert data
    const insertData: Record<string, unknown> = {
      intake_id: input.intake_id,
      answers: input.answers,
      // Extracted fields
      has_allergies: input.has_allergies,
      allergy_details: input.allergy_details,
      has_current_medications: input.has_current_medications,
      current_medications: input.current_medications,
      has_medical_conditions: input.has_medical_conditions,
      medical_conditions: input.medical_conditions,
      symptom_duration: input.symptom_duration,
      symptom_severity: input.symptom_severity,
    }

    // Encrypt if enabled
    if (isEncryptionEnabled() && isWriteEnabled()) {
      try {
        const encrypted = await encryptJSONB(input.answers)
        insertData.answers_encrypted = encrypted
        insertData.encryption_metadata = {
          keyId: encrypted.keyId,
          version: encrypted.version,
          encryptedAt: new Date().toISOString(),
        }
        logger.debug("Encrypted intake answers", { 
          intakeId: input.intake_id,
          keyId: encrypted.keyId 
        })
      } catch (encryptError) {
        // Log but don't fail - continue with plaintext
        logger.error("Failed to encrypt intake answers, continuing with plaintext", 
          { intakeId: input.intake_id },
          encryptError instanceof Error ? encryptError : new Error(String(encryptError))
        )
      }
    }

    const { data, error } = await supabase
      .from("intake_answers")
      .insert(insertData)
      .select("id")
      .single()

    if (error) {
      logger.error("Failed to save intake answers", { intakeId: input.intake_id }, error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data.id }
  } catch (error) {
    logger.error("Unexpected error saving intake answers", 
      { intakeId: input.intake_id },
      error instanceof Error ? error : new Error(String(error))
    )
    return { success: false, error: "Internal error" }
  }
}

/**
 * Update existing intake answers
 */
export async function updateIntakeAnswers(
  id: string,
  answers: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    const updateData: Record<string, unknown> = {
      answers,
      updated_at: new Date().toISOString(),
    }

    // Encrypt if enabled
    if (isEncryptionEnabled() && isWriteEnabled()) {
      try {
        const encrypted = await encryptJSONB(answers)
        updateData.answers_encrypted = encrypted
        updateData.encryption_metadata = {
          keyId: encrypted.keyId,
          version: encrypted.version,
          encryptedAt: new Date().toISOString(),
        }
      } catch (encryptError) {
        logger.error("Failed to encrypt intake answers on update", 
          { id },
          encryptError instanceof Error ? encryptError : new Error(String(encryptError))
        )
      }
    }

    const { error } = await supabase
      .from("intake_answers")
      .update(updateData)
      .eq("id", id)

    if (error) {
      logger.error("Failed to update intake answers", { id }, error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    logger.error("Unexpected error updating intake answers", 
      { id },
      error instanceof Error ? error : new Error(String(error))
    )
    return { success: false, error: "Internal error" }
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get intake answers by intake ID
 * 
 * When encryption is enabled:
 * - Attempts to read from answers_encrypted first
 * - Falls back to plaintext answers if decryption fails
 */
export async function getIntakeAnswers(
  intakeId: string
): Promise<Record<string, unknown> | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intake_answers")
    .select("id, answers, answers_encrypted, encryption_metadata")
    .eq("intake_id", intakeId)
    .single()

  if (error || !data) {
    if (error?.code !== "PGRST116") { // Not found is not an error
      logger.error("Failed to fetch intake answers", { intakeId }, error)
    }
    return null
  }

  return decryptAnswersRow(data as IntakeAnswersRow)
}

/**
 * Decrypt answers from a row, preferring encrypted if available
 */
export async function decryptAnswersRow(
  row: IntakeAnswersRow
): Promise<Record<string, unknown>> {
  // If encryption is enabled for reads and we have encrypted data
  if (
    isEncryptionEnabled() &&
    isReadEnabled() &&
    row.answers_encrypted &&
    isEncryptedPHI(row.answers_encrypted)
  ) {
    try {
      const decrypted = await decryptJSONB<Record<string, unknown>>(row.answers_encrypted)
      logger.debug("Decrypted intake answers", { 
        id: row.id,
        keyId: row.answers_encrypted.keyId 
      })
      return decrypted
    } catch (decryptError) {
      // Fall back to plaintext
      logger.error("Failed to decrypt intake answers, falling back to plaintext", 
        { id: row.id },
        decryptError instanceof Error ? decryptError : new Error(String(decryptError))
      )
    }
  }

  // Return plaintext answers
  return row.answers
}

/**
 * Batch decrypt answers for multiple rows
 */
export async function decryptAnswersRows(
  rows: IntakeAnswersRow[]
): Promise<Map<string, Record<string, unknown>>> {
  const result = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    const decrypted = await decryptAnswersRow(row)
    result.set(row.id, decrypted)
  }

  return result
}
