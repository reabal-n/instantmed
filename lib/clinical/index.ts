/**
 * Clinical Module
 * 
 * Central exports for clinical triage, boundaries, and decision rules.
 * See CLINICAL_BOUNDARIES_AND_DECISION_RULES.md for full documentation.
 */

// Triage types and definitions
export * from "./triage-types"

// Triage rules engine
export {
  applyFinalSafetyRule,
  checkAsyncBlocked,
  checkAutoReject,
  checkEmergencySymptoms,
  checkRedFlagPatterns,
  EMERGENCY_KEYWORDS,
  evaluateTriage,
  type TriageInput,
  validateClinicianDecision,
} from "./triage-rules-engine"

// Intake validation
export {
  EMERGENCY_SYMPTOM_PATTERNS,
  type IntakeValidationResult,
  isControlledSubstance,
  isHighRiskFirstTime,
  isOutsideGPScope,
  quickEmergencyCheck,
  validateIntake,
} from "./intake-validation"
