/**
 * Intake Answers Data Layer
 * 
 * Provides encrypted storage and retrieval of PHI in intake_answers.
 * Uses envelope encryption when PHI_ENCRYPTION_ENABLED=true.
 */

import "server-only"

import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import {
  decryptJSONB,
  type EncryptedPHI,
  encryptJSONB,
  isEncryptedPHI,
} from "@/lib/security/phi-encryption"
import {
  PhiEncryptionWriteError,
  reportPhiEncryptionFailure,
} from "@/lib/security/phi-encryption-alarm"
import {
  prepareAllergyDetailsWrite,
  prepareMedicalConditionsWrite,
} from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("intake-answers")

// Feature flag check
const isEncryptionEnabled = () => process.env.PHI_ENCRYPTION_ENABLED === "true"
const isWriteEnabled = () => process.env.PHI_ENCRYPTION_WRITE_ENABLED === "true"
const isReadEnabled = () => process.env.PHI_ENCRYPTION_READ_ENABLED === "true"
const isAnswerRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

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
 * Build the column set for an intake_answers insert, encrypting when the PHI
 * flags are enabled. This is the SINGLE encryption seam for answers writes —
 * the live checkout paths (lib/stripe/checkout/persistence.ts and
 * lib/stripe/guest-checkout.ts) insert through it, as does saveIntakeAnswers.
 *
 * FAIL-CLOSED: with encryption enabled, an encrypt failure throws
 * PhiEncryptionWriteError (after firing the fatal Sentry alarm) rather than
 * silently storing plaintext-only. Instrumentation.ts verifies the key at boot,
 * so a runtime throw here means key material changed underneath a live deploy.
 */
export async function buildAnswersInsertColumns(
  intakeId: string,
  answers: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const columns: Record<string, unknown> = {
    intake_id: intakeId,
    // Dual-write: plaintext stays until the reader audit + backfill parity
    // check allow the plaintext column to be retired.
    answers,
  }

  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const encrypted = await encryptJSONB(answers)
      columns.answers_encrypted = encrypted
      columns.encryption_metadata = {
        keyId: encrypted.keyId,
        version: encrypted.version,
        encryptedAt: new Date().toISOString(),
      }
    } catch (encryptError) {
      await reportPhiEncryptionFailure(encryptError, {
        field: "intake_answers.answers",
        operation: "encrypt",
        recordId: intakeId,
      })
      throw new PhiEncryptionWriteError("intake_answers.answers")
    }
  }

  return columns
}

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
    // Encrypt extracted PHI fields (graceful fallback - logs but doesn't abort)
    const allergyFields = await prepareAllergyDetailsWrite(input.allergy_details ?? null)
    const conditionsFields = await prepareMedicalConditionsWrite(input.medical_conditions ?? null)

    // Answers columns (plaintext + encrypted) via the single encryption seam.
    // The helper throws (after alarming) rather than storing plaintext-only.
    let insertData: Record<string, unknown>
    try {
      insertData = await buildAnswersInsertColumns(input.intake_id, input.answers)
    } catch {
      // Fatal Sentry alarm already fired inside buildAnswersInsertColumns.
      return { success: false, error: "Encryption failed - please try again" }
    }

    Object.assign(insertData, {
      // Extracted fields
      has_allergies: input.has_allergies,
      has_current_medications: input.has_current_medications,
      current_medications: input.current_medications,
      has_medical_conditions: input.has_medical_conditions,
      symptom_duration: input.symptom_duration,
      symptom_severity: input.symptom_severity,
      // Dual-write: plaintext + encrypted PHI columns
      ...allergyFields,
      ...conditionsFields,
    })

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
      toError(error)
    )
    return { success: false, error: "Internal error" }
  }
}

/**
 * Update existing intake answers — NOT exported.
 * This function uses the service-role client (bypasses RLS) and has no ownership check.
 * Any future caller MUST verify that the authenticated user owns the parent intake before
 * calling this (SELECT intake_id FROM intake_answers WHERE id=X; assert intake.patient_id === caller).
 * Export only when a concrete, guarded caller exists.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function updateIntakeAnswers(
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
        // CRITICAL: Fail the update if encryption fails - never write plaintext PHI
        await reportPhiEncryptionFailure(encryptError, {
          field: "intake_answers.answers",
          operation: "encrypt",
          recordId: id,
        })
        return { success: false, error: "Failed to secure data. Please try again." }
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
      toError(error)
    )
    return { success: false, error: "Internal error" }
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get the authoritative answer blob for payment-safety revalidation.
 *
 * Once a row has an encrypted envelope, that envelope is the source of truth:
 * disabled reads, a malformed envelope, a missing key, or a decrypt failure all
 * fail closed. Plaintext is accepted only for a legacy row that has no encrypted
 * envelope at all.
 *
 * Auxiliary dual-write columns are deliberately not merged here. The complete
 * answers blob is the safety source of truth, and a stale duplicate field must
 * never overwrite successfully decrypted answers before retrying payment.
 */
export async function getIntakeAnswersForPaymentSafety(
  intakeId: string
): Promise<Record<string, unknown> | null> {
  const row = await getIntakeAnswersRow(intakeId)
  if (!row) return null

  if (row.answers_encrypted === null || row.answers_encrypted === undefined) {
    if (!isAnswerRecord(row.answers)) {
      logger.error(
        "Legacy intake answers are not a valid answer object",
        { intakeId, rowId: row.id },
        new Error("Invalid legacy intake answers"),
      )
      return null
    }
    return row.answers
  }

  if (!isEncryptionEnabled() || !isReadEnabled()) {
    logger.error(
      "Encrypted intake answers are authoritative but encrypted reads are disabled",
      { intakeId, rowId: row.id },
      new Error("Authoritative encrypted intake answers unavailable"),
    )
    return null
  }

  if (!isEncryptedPHI(row.answers_encrypted)) {
    logger.error(
      "Authoritative encrypted intake answers envelope is malformed",
      { intakeId, rowId: row.id },
      new Error("Malformed encrypted intake answers envelope"),
    )
    return null
  }

  try {
    const answers = await decryptJSONB<Record<string, unknown>>(row.answers_encrypted)
    if (!isAnswerRecord(answers)) {
      logger.error(
        "Decrypted authoritative intake answers are not a valid answer object",
        { intakeId, rowId: row.id },
        new Error("Invalid decrypted intake answers"),
      )
      return null
    }
    logger.debug("Decrypted authoritative intake answers", {
      id: row.id,
      keyId: row.answers_encrypted.keyId,
    })
    return answers
  } catch (decryptError) {
    logger.error(
      "Failed to decrypt authoritative intake answers",
      { intakeId, rowId: row.id },
      decryptError instanceof Error ? decryptError : new Error(String(decryptError)),
    )
    return null
  }
}

async function getIntakeAnswersRow(
  intakeId: string
): Promise<Pick<IntakeAnswersRow, "answers" | "answers_encrypted" | "id"> | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intake_answers")
    .select("id, answers, answers_encrypted")
    .eq("intake_id", intakeId)
    .single()

  if (error || !data) {
    if (error?.code !== "PGRST116") { // Not found is not an error
      logger.error("Failed to fetch intake answers", { intakeId }, error)
    }
    return null
  }

  // Supabase .select() returns an untyped row; the projected columns match.
  return data as unknown as Pick<IntakeAnswersRow, "answers" | "answers_encrypted" | "id">
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
