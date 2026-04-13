/**
 * AI Validation Utilities
 * 
 * Centralized exports for AI output validation.
 */

export {
  FORBIDDEN_DIAGNOSIS_TERMS,
  FORBIDDEN_MEDICATION_TERMS,
  type GroundTruthError,
  type GroundTruthValidationResult,
  validateClinicalNoteAgainstIntake,
  validateMedCertAgainstIntake,
} from "./ground-truth"
