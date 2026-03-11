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
import { toError } from "@/lib/errors"

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
        toError(error))
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
          toError(error))
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
        toError(error))
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
          toError(error))
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
        toError(error))
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
          toError(error))
      }
    }
  }

  return record.messages ?? null
}

// ============================================================================
// PATIENT NOTES CONTENT (patient_notes.content / content_enc)
// ============================================================================

export interface PatientNoteContentWriteResult {
  /** Plaintext value (for backward compatibility during migration) */
  content: string | null
  /** Encrypted value (for new storage) */
  content_enc: EncryptedPHI | null
}

/**
 * Prepare patient note content for database write
 */
export async function preparePatientNoteContentWrite(
  content: string | null
): Promise<PatientNoteContentWriteResult> {
  if (!content) {
    return { content: null, content_enc: null }
  }

  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const encrypted = await encryptPHI(content)
      return {
        content: content, // Keep plaintext during migration
        content_enc: encrypted,
      }
    } catch (error) {
      logger.error("Failed to encrypt patient_notes.content, falling back to plaintext", {},
        toError(error))
      return { content: content, content_enc: null }
    }
  }

  return { content: content, content_enc: null }
}

/**
 * Read patient note content from database record
 */
export async function readPatientNoteContent(record: {
  content?: string | null
  content_enc?: EncryptedPHI | null
}): Promise<string | null> {
  if (isEncryptionEnabled() && isReadEnabled() && record.content_enc) {
    if (isEncryptedPHI(record.content_enc)) {
      try {
        return await decryptPHI(record.content_enc)
      } catch (error) {
        logger.error("Failed to decrypt patient_notes.content, falling back to plaintext", {},
          toError(error))
      }
    }
  }

  return record.content ?? null
}

// ============================================================================
// CERTIFICATE PATIENT NAME (issued_certificates.patient_name / patient_name_enc)
// ============================================================================

export interface CertificatePatientNameWriteResult {
  /** Plaintext value (for backward compatibility during migration) */
  patient_name: string
  /** Encrypted value (for new storage) */
  patient_name_enc: EncryptedPHI | null
}

/**
 * Prepare certificate patient name for database write
 */
export async function prepareCertificatePatientNameWrite(
  patientName: string
): Promise<CertificatePatientNameWriteResult> {
  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const encrypted = await encryptPHI(patientName)
      return {
        patient_name: patientName, // Keep plaintext during migration
        patient_name_enc: encrypted,
      }
    } catch (error) {
      logger.error("Failed to encrypt issued_certificates.patient_name, falling back to plaintext", {},
        toError(error))
      return { patient_name: patientName, patient_name_enc: null }
    }
  }

  return { patient_name: patientName, patient_name_enc: null }
}

/**
 * Read certificate patient name from database record
 */
export async function readCertificatePatientName(record: {
  patient_name?: string | null
  patient_name_enc?: EncryptedPHI | null
}): Promise<string | null> {
  if (isEncryptionEnabled() && isReadEnabled() && record.patient_name_enc) {
    if (isEncryptedPHI(record.patient_name_enc)) {
      try {
        return await decryptPHI(record.patient_name_enc)
      } catch (error) {
        logger.error("Failed to decrypt issued_certificates.patient_name, falling back to plaintext", {},
          toError(error))
      }
    }
  }

  return record.patient_name ?? null
}

// ============================================================================
// DOCUMENT DRAFT DATA (document_drafts.data / data_enc)
// ============================================================================

export interface DocumentDraftDataWriteResult {
  /** Plaintext value (for backward compatibility during migration) */
  data: Record<string, unknown> | null
  /** Encrypted value (for new storage) */
  data_enc: EncryptedPHI | null
}

/**
 * Prepare document draft data for database write
 * Supersedes the older data_encrypted column pattern
 */
export async function prepareDocumentDraftDataWrite(
  data: Record<string, unknown> | null
): Promise<DocumentDraftDataWriteResult> {
  if (!data) {
    return { data: null, data_enc: null }
  }

  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const plaintext = JSON.stringify(data)
      const encrypted = await encryptPHI(plaintext)
      return {
        data: data, // Keep plaintext during migration
        data_enc: encrypted,
      }
    } catch (error) {
      logger.error("Failed to encrypt document_drafts.data, falling back to plaintext", {},
        toError(error))
      return { data: data, data_enc: null }
    }
  }

  return { data: data, data_enc: null }
}

/**
 * Read document draft data from database record
 */
export async function readDocumentDraftData(record: {
  data?: Record<string, unknown> | null
  data_enc?: EncryptedPHI | null
}): Promise<Record<string, unknown> | null> {
  if (isEncryptionEnabled() && isReadEnabled() && record.data_enc) {
    if (isEncryptedPHI(record.data_enc)) {
      try {
        const plaintext = await decryptPHI(record.data_enc)
        return JSON.parse(plaintext) as Record<string, unknown>
      } catch (error) {
        logger.error("Failed to decrypt document_drafts.data, falling back to plaintext", {},
          toError(error))
      }
    }
  }

  return record.data ?? null
}

// ============================================================================
// DOCUMENT DRAFT EDITED CONTENT (document_drafts.edited_content / edited_content_enc)
// ============================================================================

export interface DocumentDraftEditedContentWriteResult {
  /** Plaintext value (for backward compatibility during migration) */
  edited_content: Record<string, unknown> | null
  /** Encrypted value (for new storage) */
  edited_content_enc: EncryptedPHI | null
}

/**
 * Prepare document draft edited content for database write
 */
export async function prepareDocumentDraftEditedContentWrite(
  editedContent: Record<string, unknown> | null
): Promise<DocumentDraftEditedContentWriteResult> {
  if (!editedContent) {
    return { edited_content: null, edited_content_enc: null }
  }

  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const plaintext = JSON.stringify(editedContent)
      const encrypted = await encryptPHI(plaintext)
      return {
        edited_content: editedContent, // Keep plaintext during migration
        edited_content_enc: encrypted,
      }
    } catch (error) {
      logger.error("Failed to encrypt document_drafts.edited_content, falling back to plaintext", {},
        toError(error))
      return { edited_content: editedContent, edited_content_enc: null }
    }
  }

  return { edited_content: editedContent, edited_content_enc: null }
}

/**
 * Read document draft edited content from database record
 */
export async function readDocumentDraftEditedContent(record: {
  edited_content?: Record<string, unknown> | null
  edited_content_enc?: EncryptedPHI | null
}): Promise<Record<string, unknown> | null> {
  if (isEncryptionEnabled() && isReadEnabled() && record.edited_content_enc) {
    if (isEncryptedPHI(record.edited_content_enc)) {
      try {
        const plaintext = await decryptPHI(record.edited_content_enc)
        return JSON.parse(plaintext) as Record<string, unknown>
      } catch (error) {
        logger.error("Failed to decrypt document_drafts.edited_content, falling back to plaintext", {},
          toError(error))
      }
    }
  }

  return record.edited_content ?? null
}

// ============================================================================
// ALLERGY DETAILS (intake_answers.allergy_details / allergy_details_enc)
// ============================================================================

export interface AllergyDetailsWriteResult {
  /** Plaintext value (for backward compatibility during migration) */
  allergy_details: string | null
  /** Encrypted value (for new storage) */
  allergy_details_enc: EncryptedPHI | null
}

/**
 * Prepare allergy details for database write
 */
export async function prepareAllergyDetailsWrite(
  allergyDetails: string | null
): Promise<AllergyDetailsWriteResult> {
  if (!allergyDetails) {
    return { allergy_details: null, allergy_details_enc: null }
  }

  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const encrypted = await encryptPHI(allergyDetails)
      return {
        allergy_details: allergyDetails, // Keep plaintext during migration
        allergy_details_enc: encrypted,
      }
    } catch (error) {
      logger.error("Failed to encrypt intake_answers.allergy_details, falling back to plaintext", {},
        toError(error))
      return { allergy_details: allergyDetails, allergy_details_enc: null }
    }
  }

  return { allergy_details: allergyDetails, allergy_details_enc: null }
}

/**
 * Read allergy details from database record
 */
export async function readAllergyDetails(record: {
  allergy_details?: string | null
  allergy_details_enc?: EncryptedPHI | null
}): Promise<string | null> {
  if (isEncryptionEnabled() && isReadEnabled() && record.allergy_details_enc) {
    if (isEncryptedPHI(record.allergy_details_enc)) {
      try {
        return await decryptPHI(record.allergy_details_enc)
      } catch (error) {
        logger.error("Failed to decrypt intake_answers.allergy_details, falling back to plaintext", {},
          toError(error))
      }
    }
  }

  return record.allergy_details ?? null
}

// ============================================================================
// MEDICAL CONDITIONS (intake_answers.medical_conditions / medical_conditions_enc)
// ============================================================================

export interface MedicalConditionsWriteResult {
  /** Plaintext value (for backward compatibility during migration) */
  medical_conditions: string[] | null
  /** Encrypted value (for new storage) */
  medical_conditions_enc: EncryptedPHI | null
}

/**
 * Prepare medical conditions for database write
 */
export async function prepareMedicalConditionsWrite(
  conditions: string[] | null
): Promise<MedicalConditionsWriteResult> {
  if (!conditions || conditions.length === 0) {
    return { medical_conditions: null, medical_conditions_enc: null }
  }

  if (isEncryptionEnabled() && isWriteEnabled()) {
    try {
      const plaintext = JSON.stringify(conditions)
      const encrypted = await encryptPHI(plaintext)
      return {
        medical_conditions: conditions, // Keep plaintext during migration
        medical_conditions_enc: encrypted,
      }
    } catch (error) {
      logger.error("Failed to encrypt intake_answers.medical_conditions, falling back to plaintext", {},
        toError(error))
      return { medical_conditions: conditions, medical_conditions_enc: null }
    }
  }

  return { medical_conditions: conditions, medical_conditions_enc: null }
}

/**
 * Read medical conditions from database record
 */
export async function readMedicalConditions(record: {
  medical_conditions?: string[] | null
  medical_conditions_enc?: EncryptedPHI | null
}): Promise<string[] | null> {
  if (isEncryptionEnabled() && isReadEnabled() && record.medical_conditions_enc) {
    if (isEncryptedPHI(record.medical_conditions_enc)) {
      try {
        const plaintext = await decryptPHI(record.medical_conditions_enc)
        return JSON.parse(plaintext) as string[]
      } catch (error) {
        logger.error("Failed to decrypt intake_answers.medical_conditions, falling back to plaintext", {},
          toError(error))
      }
    }
  }

  return record.medical_conditions ?? null
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Check if a record needs encryption migration.
 * Returns true if plaintext exists but no encrypted counterpart.
 */
export function needsEncryptionMigration(record: Record<string, unknown>): boolean {
  // Phase 1 fields
  if ('doctor_notes' in record) {
    return !!record.doctor_notes && !record.doctor_notes_enc
  }
  if ('answers' in record && 'answers_enc' in record) {
    return !!record.answers && !record.answers_enc
  }
  if ('messages' in record) {
    return !!record.messages && !record.messages_enc
  }

  // Phase 2 fields
  if ('content' in record && 'content_enc' in record) {
    return !!record.content && !record.content_enc
  }
  if ('patient_name' in record && 'patient_name_enc' in record) {
    return !!record.patient_name && !record.patient_name_enc
  }
  if ('data' in record && 'data_enc' in record) {
    return !!record.data && !record.data_enc
  }
  if ('edited_content' in record && 'edited_content_enc' in record) {
    return !!record.edited_content && !record.edited_content_enc
  }
  if ('allergy_details' in record && 'allergy_details_enc' in record) {
    return !!record.allergy_details && !record.allergy_details_enc
  }
  if ('medical_conditions' in record && 'medical_conditions_enc' in record) {
    return !!record.medical_conditions && !record.medical_conditions_enc
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
