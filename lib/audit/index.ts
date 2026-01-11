/**
 * Audit Module
 * 
 * Provides compliance audit logging per AUDIT_LOGGING_REQUIREMENTS.md
 * 
 * Core principle: If an action affects clinical care or access to care,
 * it must be reconstructable after the fact.
 */

export {
  // Types
  type ComplianceEventType,
  type RequestType,
  type ActorRole,
  type TriageOutcome,
  type ComplianceAuditEntry,
  type AuditReadinessResult,
  
  // Core function
  logComplianceEvent,
  
  // Section 1: Request Lifecycle
  logRequestCreated,
  logRequestReviewed,
  logOutcomeAssigned,
  
  // Section 2: Clinician Involvement
  logClinicianOpenedRequest,
  logClinicianReviewedRequest,
  logClinicianSelectedOutcome,
  
  // Section 3: Triage Outcome
  logTriageApproved,
  logTriageNeedsCall,
  logTriageDeclined,
  logTriageOutcomeChanged,
  
  // Section 4: Synchronous Contact Indicators
  logCallRequiredFlagged,
  logCallInitiated,
  logCallCompleted,
  logDecisionAfterCall,
  
  // Section 5: Prescribing Boundary Evidence
  logNoPrescribingInPlatform,
  logExternalPrescribingIndicated,
  
  // Audit Readiness
  checkAuditReadiness,
  getComplianceTimeline,
} from "./compliance-audit"
