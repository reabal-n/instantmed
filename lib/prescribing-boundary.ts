/**
 * Prescribing Workflow Boundary Enforcement
 * 
 * See PRESCRIBING_WORKFLOW_BOUNDARY.md for full documentation.
 * 
 * Core Principle: InstantMed Health does NOT prescribe.
 * It facilitates intake, triage, and clinician review.
 * All prescribing decisions and actions occur OUTSIDE the platform.
 */

/**
 * Actions that are PERMITTED within InstantMed Health
 */
export const PERMITTED_ACTIONS = [
  "collect_patient_information",
  "present_intake_to_clinician", 
  "support_triage_decision",
  "record_clinician_outcome",
  "indicate_external_prescribing",
  "display_intake_data",
  "export_for_external_use",
] as const

/**
 * Actions that are PROHIBITED within InstantMed Health
 */
export const PROHIBITED_ACTIONS = [
  "generate_prescription",
  "create_dosage_instructions",
  "create_prescription_artefact",
  "imply_prescription_approval",
  "auto_populate_prescription",
  "submit_prescription",
  "auto_initiate_prescription",
  "auto_suggest_medication",
  "auto_complete_prescribing",
] as const

export type PermittedAction = typeof PERMITTED_ACTIONS[number]
export type ProhibitedAction = typeof PROHIBITED_ACTIONS[number]

/**
 * Boundary violation error
 */
export class PrescribingBoundaryViolation extends Error {
  constructor(action: string) {
    super(
      `PRESCRIBING BOUNDARY VIOLATION: "${action}" is not permitted within InstantMed Health. ` +
      `Prescribing must occur in external systems. See PRESCRIBING_WORKFLOW_BOUNDARY.md`
    )
    this.name = "PrescribingBoundaryViolation"
  }
}

/**
 * Guard function - throws if action is prohibited
 */
export function assertNotPrescribingAction(action: string): void {
  if (PROHIBITED_ACTIONS.includes(action as ProhibitedAction)) {
    throw new PrescribingBoundaryViolation(action)
  }
}

/**
 * Check if an action is permitted
 */
export function isPermittedAction(action: string): action is PermittedAction {
  return PERMITTED_ACTIONS.includes(action as PermittedAction)
}

/**
 * Compliant copy for prescription-related outcomes
 * Use these instead of language that implies platform prescribing
 */
export const BOUNDARY_COMPLIANT_COPY = {
  outcomeApproved: "Your request has been reviewed and approved. If prescribing is appropriate, it will occur separately.",
  outcomeDeclined: "After clinical review, this request was not approved.",
  outcomeNeedsReview: "A clinician will review your information.",
  prescribingNote: "Any prescribing occurs separately, at the clinician's discretion.",
  externalPrescribing: "Prescriptions are issued through external prescribing systems, not within this platform.",
} as const
