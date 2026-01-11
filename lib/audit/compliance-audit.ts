import "server-only"
import { createClient } from "@supabase/supabase-js"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("compliance-audit")

/**
 * Compliance Audit Service
 * Implements AUDIT_LOGGING_REQUIREMENTS.md
 * 
 * Core Principle: If an action affects clinical care or access to care,
 * it must be reconstructable after the fact.
 */

export type ComplianceEventType =
  // Request Lifecycle (Section 1)
  | "request_created"
  | "request_reviewed"
  | "outcome_assigned"
  // Clinician Involvement (Section 2)
  | "clinician_opened_request"
  | "clinician_reviewed_request"
  | "clinician_selected_outcome"
  // Triage Outcome (Section 3)
  | "triage_approved"
  | "triage_needs_call"
  | "triage_declined"
  | "triage_outcome_changed"
  // Synchronous Contact Indicators (Section 4)
  | "call_required_flagged"
  | "call_initiated"
  | "call_completed"
  | "decision_after_call"
  // Prescribing Boundary Evidence (Section 5)
  | "no_prescribing_in_platform"
  | "external_prescribing_indicated"

export type RequestType = "med_cert" | "repeat_rx" | "intake"

export type ActorRole = "patient" | "clinician" | "admin" | "system"

export type TriageOutcome = "approved" | "needs_call" | "declined"

export interface ComplianceAuditEntry {
  eventType: ComplianceEventType
  requestId: string
  requestType: RequestType
  actorId?: string
  actorRole: ActorRole
  isHumanAction?: boolean
  outcome?: TriageOutcome
  previousOutcome?: TriageOutcome
  callRequired?: boolean
  callOccurred?: boolean
  callCompletedBeforeDecision?: boolean
  prescribingOccurredInPlatform?: boolean
  externalPrescribingReference?: string
  eventData?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    logger.warn("Missing Supabase credentials for compliance audit")
    return null
  }
  return createClient(url, key)
}

/**
 * Log a compliance audit event
 * This is the core function for all compliance logging
 */
export async function logComplianceEvent(entry: ComplianceAuditEntry): Promise<string | null> {
  const supabase = getServiceClient()

  if (!supabase) {
    logger.debug("[Compliance Audit - No DB]", { entry })
    return null
  }

  try {
    const { data, error } = await supabase.rpc("log_compliance_event", {
      p_event_type: entry.eventType,
      p_request_id: entry.requestId,
      p_request_type: entry.requestType,
      p_actor_id: entry.actorId || null,
      p_actor_role: entry.actorRole,
      p_is_human_action: entry.isHumanAction ?? true,
      p_outcome: entry.outcome || null,
      p_previous_outcome: entry.previousOutcome || null,
      p_call_required: entry.callRequired ?? null,
      p_call_occurred: entry.callOccurred ?? null,
      p_call_completed_before_decision: entry.callCompletedBeforeDecision ?? null,
      p_prescribing_occurred_in_platform: entry.prescribingOccurredInPlatform ?? false,
      p_external_prescribing_reference: entry.externalPrescribingReference || null,
      p_event_data: entry.eventData || {},
      p_ip_address: entry.ipAddress || null,
      p_user_agent: entry.userAgent || null,
    })

    if (error) {
      logger.error("Failed to log compliance event", { error, entry })
      return null
    }

    return data as string
  } catch (error) {
    logger.error("Compliance audit error", { error })
    return null
  }
}

// ============================================================================
// SECTION 1: Request Lifecycle Helpers
// ============================================================================

export async function logRequestCreated(
  requestId: string,
  requestType: RequestType,
  patientId: string,
  metadata?: Record<string, unknown>
) {
  return logComplianceEvent({
    eventType: "request_created",
    requestId,
    requestType,
    actorId: patientId,
    actorRole: "patient",
    isHumanAction: true,
    eventData: metadata,
  })
}

export async function logRequestReviewed(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return logComplianceEvent({
    eventType: "request_reviewed",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    ipAddress,
    userAgent,
  })
}

export async function logOutcomeAssigned(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  outcome: TriageOutcome,
  previousOutcome?: TriageOutcome,
  metadata?: Record<string, unknown>
) {
  return logComplianceEvent({
    eventType: "outcome_assigned",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    outcome,
    previousOutcome,
    eventData: metadata,
  })
}

// ============================================================================
// SECTION 2: Clinician Involvement Helpers
// ============================================================================

export async function logClinicianOpenedRequest(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return logComplianceEvent({
    eventType: "clinician_opened_request",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    ipAddress,
    userAgent,
  })
}

export async function logClinicianReviewedRequest(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  reviewDurationMs?: number,
  ipAddress?: string,
  userAgent?: string
) {
  return logComplianceEvent({
    eventType: "clinician_reviewed_request",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    eventData: reviewDurationMs ? { reviewDurationMs } : undefined,
    ipAddress,
    userAgent,
  })
}

export async function logClinicianSelectedOutcome(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  outcome: TriageOutcome,
  callRequired?: boolean,
  callCompletedBeforeDecision?: boolean,
  metadata?: Record<string, unknown>
) {
  return logComplianceEvent({
    eventType: "clinician_selected_outcome",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    outcome,
    callRequired,
    callCompletedBeforeDecision,
    eventData: metadata,
  })
}

// ============================================================================
// SECTION 3: Triage Outcome Helpers
// ============================================================================

export async function logTriageApproved(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  metadata?: Record<string, unknown>
) {
  return logComplianceEvent({
    eventType: "triage_approved",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    outcome: "approved",
    eventData: metadata,
  })
}

export async function logTriageNeedsCall(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  reason?: string
) {
  return logComplianceEvent({
    eventType: "triage_needs_call",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    outcome: "needs_call",
    callRequired: true,
    eventData: reason ? { reason } : undefined,
  })
}

export async function logTriageDeclined(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  rejectionReason: string
) {
  return logComplianceEvent({
    eventType: "triage_declined",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    outcome: "declined",
    eventData: { rejectionReason },
  })
}

export async function logTriageOutcomeChanged(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  newOutcome: TriageOutcome,
  previousOutcome: TriageOutcome,
  reason?: string
) {
  return logComplianceEvent({
    eventType: "triage_outcome_changed",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    outcome: newOutcome,
    previousOutcome,
    eventData: reason ? { changeReason: reason } : undefined,
  })
}

// ============================================================================
// SECTION 4: Synchronous Contact Indicators
// ============================================================================

export async function logCallRequiredFlagged(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  reason?: string
) {
  return logComplianceEvent({
    eventType: "call_required_flagged",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    callRequired: true,
    eventData: reason ? { reason } : undefined,
  })
}

export async function logCallInitiated(
  requestId: string,
  requestType: RequestType,
  clinicianId: string
) {
  return logComplianceEvent({
    eventType: "call_initiated",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    callRequired: true,
    callOccurred: true,
  })
}

export async function logCallCompleted(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  beforeDecision: boolean
) {
  return logComplianceEvent({
    eventType: "call_completed",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    callRequired: true,
    callOccurred: true,
    callCompletedBeforeDecision: beforeDecision,
  })
}

export async function logDecisionAfterCall(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  outcome: TriageOutcome
) {
  return logComplianceEvent({
    eventType: "decision_after_call",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    outcome,
    callRequired: true,
    callOccurred: true,
    callCompletedBeforeDecision: true,
  })
}

// ============================================================================
// SECTION 5: Prescribing Boundary Evidence
// ============================================================================

export async function logNoPrescribingInPlatform(
  requestId: string,
  requestType: RequestType,
  clinicianId: string
) {
  return logComplianceEvent({
    eventType: "no_prescribing_in_platform",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    prescribingOccurredInPlatform: false,
  })
}

export async function logExternalPrescribingIndicated(
  requestId: string,
  requestType: RequestType,
  clinicianId: string,
  externalSystem: string
) {
  return logComplianceEvent({
    eventType: "external_prescribing_indicated",
    requestId,
    requestType,
    actorId: clinicianId,
    actorRole: "clinician",
    isHumanAction: true,
    prescribingOccurredInPlatform: false,
    externalPrescribingReference: externalSystem,
  })
}

// ============================================================================
// AUDIT READINESS CHECK
// ============================================================================

export interface AuditReadinessResult {
  requestId: string
  reviewedBy: string | null
  decisionAt: string | null
  outcome: TriageOutcome | null
  callRequired: boolean | null
  callCompletedBeforeDecision: boolean | null
  prescribingLocation: string
  hasHumanReview: boolean
  isAuditReady: boolean
  missingElements: string[]
}

export async function checkAuditReadiness(requestId: string): Promise<AuditReadinessResult | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("compliance_audit_summary")
    .select("*")
    .eq("request_id", requestId)
    .single()

  if (error || !data) {
    logger.warn("Could not fetch audit readiness", { requestId, error })
    return null
  }

  const missingElements: string[] = []
  
  if (!data.reviewed_by) missingElements.push("reviewer")
  if (!data.decision_at) missingElements.push("decision_timestamp")
  if (!data.final_outcome) missingElements.push("outcome")
  if (!data.has_human_review) missingElements.push("human_review")
  if (data.prescribing_location === "IN_PLATFORM_ERROR") {
    missingElements.push("prescribing_boundary_violated")
  }

  return {
    requestId,
    reviewedBy: data.reviewed_by,
    decisionAt: data.decision_at,
    outcome: data.final_outcome,
    callRequired: data.call_required,
    callCompletedBeforeDecision: data.call_completed_before_decision,
    prescribingLocation: data.prescribing_location,
    hasHumanReview: data.has_human_review,
    isAuditReady: missingElements.length === 0,
    missingElements,
  }
}

/**
 * Get full audit timeline for a request
 */
export async function getComplianceTimeline(requestId: string) {
  const supabase = getServiceClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("compliance_audit_log")
    .select(`
      id,
      event_type,
      actor_id,
      actor_role,
      is_human_action,
      outcome,
      call_required,
      call_occurred,
      prescribing_occurred_in_platform,
      external_prescribing_reference,
      event_data,
      created_at
    `)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })

  if (error) {
    logger.error("Failed to fetch compliance timeline", { requestId, error })
    return []
  }

  return data || []
}
