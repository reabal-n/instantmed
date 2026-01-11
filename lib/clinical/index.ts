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
  checkEmergencySymptoms,
  checkRedFlagPatterns,
  checkAsyncBlocked,
  checkAutoReject,
  evaluateTriage,
  validateClinicianDecision,
  applyFinalSafetyRule,
  type TriageInput,
} from "./triage-rules-engine"

// Intake validation
export {
  quickEmergencyCheck,
  validateIntake,
  isControlledSubstance,
  isHighRiskFirstTime,
  isOutsideGPScope,
  EMERGENCY_SYMPTOM_PATTERNS,
  type IntakeValidationResult,
} from "./intake-validation"

// Re-export prescribing boundary (for convenience)
export {
  PERMITTED_ACTIONS,
  PROHIBITED_ACTIONS,
  PrescribingBoundaryViolation,
  assertNotPrescribingAction,
  isPermittedAction,
  BOUNDARY_COMPLIANT_COPY,
} from "../prescribing-boundary"
