import "server-only"

import { createLogger } from "@/lib/observability/logger"
const logger = createLogger("intake-lifecycle")

// ============================================
// INTAKE LIFECYCLE STATE MACHINE
// ============================================
//
// This module enforces a strict state machine for intake status transitions.
// All status updates MUST go through this module to ensure data integrity.
//
// INTAKE STATUS LIFECYCLE:
//   draft → pending_payment       (patient submits)
//   pending_payment → paid        (Stripe webhook)
//   checkout_failed → paid        (Stripe webhook after customer retries payment)
//   paid → in_review              (doctor starts review)
//   paid → approved               (doctor approves directly)
//   paid → declined               (doctor declines directly)
//   paid → pending_info           (doctor needs more info)
//   in_review → approved          (doctor approves)
//   in_review → awaiting_script   (doctor approves a prescription and must send script)
//   in_review → declined          (doctor declines)
//   in_review → pending_info      (doctor needs more info)
//   in_review → escalated         (doctor escalates)
//   pending_info → in_review      (patient responds)
//   pending_info → paid           (patient responds, back to queue)
//   approved → completed          (document delivered)
//   approved → awaiting_script    (script needs to be sent externally)
//   awaiting_script → completed   (script sent)
//
//   approved → in_review          (DB-TRIGGER-ONLY guarded reversal; see note
//                                  on VALID_STATUS_TRANSITIONS.approved below)
//
// ============================================

import type { IntakeStatus, PaymentStatus } from "@/types/intake"

export type { IntakeStatus, PaymentStatus }

// Valid status transitions
// Exported for the DB-trigger parity contract test
// (lib/__tests__/intake-state-machine-parity-contract.test.ts). The app layer
// must never permit a transition the DB trigger forbids — that mismatch caused
// the 2026-06-09 checkout_failed→paid stuck-intake incident.
export const VALID_STATUS_TRANSITIONS: Record<IntakeStatus, IntakeStatus[]> = {
  draft: ["pending_payment", "cancelled"],
  pending_payment: ["paid", "checkout_failed", "cancelled", "expired"],
  checkout_failed: ["pending_payment", "paid", "cancelled"], // Retry, pay on retry, or abandon
  paid: ["in_review", "approved", "awaiting_script", "cancelled"],
  in_review: ["approved", "declined", "pending_info", "escalated", "awaiting_script"],
  pending_info: ["in_review", "paid", "cancelled", "expired"],
  // `approved` is intentionally one-way for ordinary app-layer callers. The DB
  // trigger additionally permits a GUARDED `approved → in_review` reversal, but
  // only when the issued certificate is revoked (batch-review revocation and the
  // 30s approval undo, which both do a direct service-role update and bypass this
  // map). Do NOT add "in_review" here: the pure allowed-list can't express the
  // revoked-cert guard, so listing it would let an unguarded reopen pass app
  // validation that the DB then rejects — the wrong (app ⊋ DB) direction the
  // parity contract forbids. See migration 20260711193000.
  approved: ["completed", "awaiting_script"],
  awaiting_script: ["completed"],
  declined: [], // Terminal
  escalated: ["in_review", "approved", "declined"],
  completed: [], // Terminal
  cancelled: [], // Terminal
  expired: [], // Terminal
}

// Statuses that require payment
const STATUSES_REQUIRING_PAYMENT: IntakeStatus[] = [
  "in_review",
  "approved",
  "declined",
  "pending_info",
  "escalated",
  "completed",
  "awaiting_script",
]

// Terminal statuses
const TERMINAL_STATUSES: IntakeStatus[] = ["completed", "declined", "cancelled", "expired"]

export interface TransitionValidation {
  valid: boolean
  error?: string
  code?: "INVALID_TRANSITION" | "PAYMENT_REQUIRED" | "TERMINAL_STATE" | "INVALID_STATUS" | "CONCURRENT_MODIFICATION"
}

/**
 * Validate if a status transition is allowed
 */
export function validateIntakeStatusTransition(
  currentStatus: IntakeStatus,
  newStatus: IntakeStatus,
  paymentStatus: string
): TransitionValidation {
  // Validate status values
  if (!isValidIntakeStatus(currentStatus)) {
    return {
      valid: false,
      error: `Invalid current status: ${currentStatus}`,
      code: "INVALID_STATUS",
    }
  }

  if (!isValidIntakeStatus(newStatus)) {
    return {
      valid: false,
      error: `Invalid new status: ${newStatus}`,
      code: "INVALID_STATUS",
    }
  }

  // Check if current status is terminal
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    return {
      valid: false,
      error: `Cannot change status from terminal state: ${currentStatus}`,
      code: "TERMINAL_STATE",
    }
  }

  // Check if transition is valid
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus]
  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedTransitions.join(", ") || "none"}`,
      code: "INVALID_TRANSITION",
    }
  }

  // Check if payment is required
  if (STATUSES_REQUIRING_PAYMENT.includes(newStatus) && paymentStatus !== "paid") {
    return {
      valid: false,
      error: `Cannot set status to ${newStatus} - payment required (current: ${paymentStatus})`,
      code: "PAYMENT_REQUIRED",
    }
  }

  return { valid: true }
}

/**
 * Check if intake is paid
 */
export function isIntakePaid(paymentStatus: string): boolean {
  return paymentStatus === "paid"
}

/**
 * Check if doctor can approve/decline
 */
export function canDoctorApprove(
  currentStatus: IntakeStatus,
  paymentStatus: string
): TransitionValidation {
  if (!isIntakePaid(paymentStatus)) {
    return {
      valid: false,
      error: "Cannot approve unpaid intake",
      code: "PAYMENT_REQUIRED",
    }
  }

  if (TERMINAL_STATUSES.includes(currentStatus)) {
    return {
      valid: false,
      error: `Intake already in terminal state: ${currentStatus}`,
      code: "TERMINAL_STATE",
    }
  }

  if (!["paid", "in_review", "pending_info", "escalated", "awaiting_script"].includes(currentStatus)) {
    return {
      valid: false,
      error: `Cannot approve intake in status: ${currentStatus}`,
      code: "INVALID_TRANSITION",
    }
  }

  return { valid: true }
}

/**
 * Type guard for IntakeStatus
 */
export function isValidIntakeStatus(status: string): status is IntakeStatus {
  return [
    "draft",
    "pending_payment",
    "checkout_failed",
    "paid",
    "in_review",
    "pending_info",
    "approved",
    "declined",
    "escalated",
    "completed",
    "cancelled",
    "expired",
    "awaiting_script",
  ].includes(status)
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: IntakeStatus): string {
  const labels: Record<IntakeStatus, string> = {
    draft: "Draft",
    pending_payment: "Awaiting Payment",
    checkout_failed: "Checkout Failed",
    paid: "In queue",
    in_review: "Under Review",
    pending_info: "Needs Info",
    approved: "Approved",
    declined: "Declined",
    escalated: "Escalated",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
    awaiting_script: "Awaiting Script",
  }
  return labels[status] || status
}

// ============================================
// LIFECYCLE ERROR CLASS
// ============================================

export class IntakeLifecycleError extends Error {
  code: TransitionValidation["code"]
  currentStatus?: IntakeStatus
  attemptedStatus?: IntakeStatus
  paymentStatus?: string

  constructor(
    message: string,
    code: TransitionValidation["code"],
    details?: {
      currentStatus?: IntakeStatus
      attemptedStatus?: IntakeStatus
      paymentStatus?: string
    }
  ) {
    super(message)
    this.name = "IntakeLifecycleError"
    this.code = code
    this.currentStatus = details?.currentStatus
    this.attemptedStatus = details?.attemptedStatus
    this.paymentStatus = details?.paymentStatus
  }
}

// ============================================
// LOGGING HELPERS
// ============================================

export function logTransitionAttempt(
  intakeId: string,
  currentStatus: IntakeStatus,
  newStatus: IntakeStatus,
  paymentStatus: string,
  actorId: string,
  actorRole: "doctor" | "patient" | "system"
): void {
  logger.debug("[IntakeLifecycle] Transition attempt", {
    intakeId,
    currentStatus,
    newStatus,
    paymentStatus,
    actorId,
    actorRole,
    timestamp: new Date().toISOString(),
  })
}

export function logTransitionSuccess(
  intakeId: string,
  previousStatus: IntakeStatus,
  newStatus: IntakeStatus,
  actorId: string
): void {
  logger.info("[IntakeLifecycle] Transition SUCCESS", {
    intakeId,
    previousStatus,
    newStatus,
    actorId,
    timestamp: new Date().toISOString(),
  })
}

export function logTransitionFailure(
  intakeId: string,
  currentStatus: IntakeStatus,
  attemptedStatus: IntakeStatus,
  reason: string,
  actorId: string
): void {
  logger.warn("[IntakeLifecycle] Transition BLOCKED", {
    intakeId,
    currentStatus,
    attemptedStatus,
    reason,
    actorId,
    timestamp: new Date().toISOString(),
  })
}
