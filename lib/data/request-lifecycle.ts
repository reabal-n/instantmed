import "server-only"
import type { RequestStatus, PaymentStatus } from "@/types/db"
import { logger } from "@/lib/logger"

// ============================================
// REQUEST LIFECYCLE STATE MACHINE
// ============================================
//
// This module enforces a strict state machine for request status transitions.
// All status updates MUST go through this module to ensure data integrity.
//
// PAYMENT STATUS LIFECYCLE:
//   pending_payment → paid      (Stripe webhook ONLY)
//   pending_payment → failed    (Stripe webhook ONLY)
//   paid → refunded             (Stripe webhook / admin ONLY)
//
// REQUEST STATUS LIFECYCLE (requires paid=true):
//   pending → approved          (doctor)
//   pending → declined          (doctor)
//   pending → needs_follow_up   (doctor)
//   needs_follow_up → approved  (doctor)
//   needs_follow_up → declined  (doctor)
//   needs_follow_up → pending   (patient responds to info request)
//
//   PRESCRIPTION WORKFLOW:
//   pending → awaiting_prescribe  (doctor approves script - needs external Parchment entry)
//   awaiting_prescribe → approved (doctor marks eScript sent)
//
// ============================================

// Valid status transitions for request workflow status
const VALID_STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending: ["approved", "declined", "needs_follow_up", "awaiting_prescribe"],
  approved: [], // Terminal state - no further transitions
  declined: [], // Terminal state - no further transitions
  needs_follow_up: ["approved", "declined", "pending", "awaiting_prescribe"], // Can go back to pending when patient responds
  awaiting_prescribe: ["approved"], // Doctor marks eScript sent → approved
}

// Valid payment status transitions (for reference - enforced at webhook level)
const VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending_payment: ["paid", "failed"],
  paid: ["refunded"],
  failed: ["pending_payment"], // Can retry payment
  refunded: [], // Terminal state
}

// Statuses that require payment to be completed first
const STATUSES_REQUIRING_PAYMENT: RequestStatus[] = ["approved", "declined", "needs_follow_up", "awaiting_prescribe"]

// Terminal statuses that cannot be changed
const TERMINAL_STATUSES: RequestStatus[] = ["approved", "declined"]

export interface TransitionValidation {
  valid: boolean
  error?: string
  code?: "INVALID_TRANSITION" | "PAYMENT_REQUIRED" | "TERMINAL_STATE" | "INVALID_STATUS"
}

/**
 * Validate if a status transition is allowed
 */
export function validateStatusTransition(
  currentStatus: RequestStatus,
  newStatus: RequestStatus,
  paymentStatus: PaymentStatus
): TransitionValidation {
  // Validate status values
  if (!isValidRequestStatus(currentStatus)) {
    return {
      valid: false,
      error: `Invalid current status: ${currentStatus}`,
      code: "INVALID_STATUS",
    }
  }

  if (!isValidRequestStatus(newStatus)) {
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

  // Check if payment is required for this transition
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
 * Check if request is paid
 */
export function isRequestPaid(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "paid"
}

/**
 * Check if request can be approved/declined by doctor
 */
export function canDoctorApprove(
  currentStatus: RequestStatus,
  paymentStatus: PaymentStatus
): TransitionValidation {
  if (!isRequestPaid(paymentStatus)) {
    return {
      valid: false,
      error: "Cannot approve unpaid request",
      code: "PAYMENT_REQUIRED",
    }
  }

  if (TERMINAL_STATUSES.includes(currentStatus)) {
    return {
      valid: false,
      error: `Request already in terminal state: ${currentStatus}`,
      code: "TERMINAL_STATE",
    }
  }

  if (!["pending", "needs_follow_up", "awaiting_prescribe"].includes(currentStatus)) {
    return {
      valid: false,
      error: `Cannot approve request in status: ${currentStatus}`,
      code: "INVALID_TRANSITION",
    }
  }

  return { valid: true }
}

/**
 * Check if request can be declined by doctor
 */
export function canDoctorDecline(
  currentStatus: RequestStatus,
  paymentStatus: PaymentStatus
): TransitionValidation {
  // Same rules as approve
  return canDoctorApprove(currentStatus, paymentStatus)
}

/**
 * Check if request can be set to needs_follow_up
 */
export function canRequestFollowUp(
  currentStatus: RequestStatus,
  paymentStatus: PaymentStatus
): TransitionValidation {
  if (!isRequestPaid(paymentStatus)) {
    return {
      valid: false,
      error: "Cannot request follow-up on unpaid request",
      code: "PAYMENT_REQUIRED",
    }
  }

  if (currentStatus !== "pending") {
    return {
      valid: false,
      error: `Cannot request follow-up on request in status: ${currentStatus}`,
      code: "INVALID_TRANSITION",
    }
  }

  return { valid: true }
}

/**
 * Type guard for RequestStatus
 */
export function isValidRequestStatus(status: string): status is RequestStatus {
  return ["pending", "approved", "declined", "needs_follow_up"].includes(status)
}

/**
 * Type guard for PaymentStatus
 */
export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return ["pending_payment", "paid", "failed", "refunded"].includes(status)
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: RequestStatus): string {
  const labels: Record<RequestStatus, string> = {
    pending: "Pending Review",
    approved: "Approved",
    declined: "Declined",
    needs_follow_up: "Needs Follow-up",
    awaiting_prescribe: "Awaiting eScript",
  }
  return labels[status] || status
}

/**
 * Get human-readable payment status label
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    pending_payment: "Awaiting Payment",
    paid: "Paid",
    failed: "Payment Failed",
    refunded: "Refunded",
  }
  return labels[status] || status
}

// ============================================
// LIFECYCLE ERROR CLASS
// ============================================

export class RequestLifecycleError extends Error {
  code: TransitionValidation["code"]
  currentStatus?: RequestStatus
  attemptedStatus?: RequestStatus
  paymentStatus?: PaymentStatus

  constructor(
    message: string,
    code: TransitionValidation["code"],
    details?: {
      currentStatus?: RequestStatus
      attemptedStatus?: RequestStatus
      paymentStatus?: PaymentStatus
    }
  ) {
    super(message)
    this.name = "RequestLifecycleError"
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
  requestId: string,
  currentStatus: RequestStatus,
  newStatus: RequestStatus,
  paymentStatus: PaymentStatus,
  actorId: string,
  actorRole: "doctor" | "patient" | "system"
): void {
  logger.debug("[RequestLifecycle] Transition attempt", {
    requestId,
    currentStatus,
    newStatus,
    paymentStatus,
    actorId,
    actorRole,
    timestamp: new Date().toISOString(),
  })
}

export function logTransitionSuccess(
  requestId: string,
  previousStatus: RequestStatus,
  newStatus: RequestStatus,
  actorId: string
): void {
  logger.info("[RequestLifecycle] Transition SUCCESS", {
    requestId,
    previousStatus,
    newStatus,
    actorId,
    timestamp: new Date().toISOString(),
  })
}

export function logTransitionFailure(
  requestId: string,
  currentStatus: RequestStatus,
  attemptedStatus: RequestStatus,
  reason: string,
  actorId: string
): void {
  logger.warn("[RequestLifecycle] Transition BLOCKED", {
    requestId,
    currentStatus,
    attemptedStatus,
    reason,
    actorId,
    timestamp: new Date().toISOString(),
  })
}
