/**
 * Audit Module
 * 
 * Provides compliance audit logging per AUDIT_LOGGING_REQUIREMENTS.md
 * 
 * Core principle: If an action affects clinical care or access to care,
 * it must be reconstructable after the fact.
 */

export {
  type ActorRole,
  type AuditReadinessResult,
  // Audit Readiness
  checkAuditReadiness,
  type ComplianceAuditEntry,
  // Types
  type ComplianceEventType,
  getComplianceTimeline,
  logCallCompleted,
  logCallInitiated,
  // Section 4: Synchronous Contact Indicators
  logCallRequiredFlagged,
  // Section 2: Clinician Involvement
  logClinicianOpenedRequest,
  logClinicianReviewedRequest,
  logClinicianSelectedOutcome,
  // Core function
  logComplianceEvent,
  logDecisionAfterCall,
  logExternalPrescribingIndicated,
  // Section 5: Prescribing Boundary Evidence
  logNoPrescribingInPlatform,
  logOutcomeAssigned,
  // Section 1: Request Lifecycle
  logRequestCreated,
  logRequestReviewed,
  // Section 3: Triage Outcome
  logTriageApproved,
  logTriageDeclined,
  logTriageNeedsCall,
  logTriageOutcomeChanged,
  type RequestType,
  type TriageOutcome,
} from "./compliance-audit"
