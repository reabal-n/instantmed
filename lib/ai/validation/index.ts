/**
 * AI Validation Utilities
 * 
 * Centralized exports for AI output validation.
 */

export {
  validateMedCertAgainstIntake,
  validateClinicalNoteAgainstIntake,
  FORBIDDEN_DIAGNOSIS_TERMS,
  FORBIDDEN_MEDICATION_TERMS,
  type GroundTruthValidationResult,
  type GroundTruthError,
} from "./ground-truth"
