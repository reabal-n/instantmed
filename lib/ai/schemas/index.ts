/**
 * AI Output Schemas
 * 
 * Centralized exports for all AI output validation schemas.
 */

export {
  ClinicalNoteOutputSchema,
  type ClinicalNoteOutput,
  parseClinicalNoteOutput,
  safeParseClinicalNoteOutput,
} from "./clinical-note"

export {
  MedCertDraftOutputSchema,
  type MedCertDraftOutput,
  parseMedCertDraftOutput,
  safeParseMedCertDraftOutput,
} from "./med-cert-draft"
