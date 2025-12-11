/**
 * Request State Machine
 *
 * States:
 * - draft: Initial form submission started but not complete
 * - awaiting_payment: Form complete, waiting for Stripe payment
 * - paid: Payment received, entering review queue
 * - awaiting_review: In the review queue (pending)
 * - in_review: Doctor has opened the request
 * - approved: Doctor approved, document generated
 * - declined: Doctor declined with reason
 * - needs_info: Doctor requested more information
 * - completed: Final state after document delivered
 */

export type RequestState =
  | "draft"
  | "awaiting_payment"
  | "paid"
  | "awaiting_review"
  | "in_review"
  | "approved"
  | "declined"
  | "needs_info"
  | "completed"

export type StateTransition = {
  from: RequestState
  to: RequestState
  trigger: string
  guard?: (context: TransitionContext) => boolean
}

export type TransitionContext = {
  requestId: string
  actorId?: string
  actorType: "patient" | "doctor" | "admin" | "system"
  metadata?: Record<string, unknown>
}

// Valid state transitions
export const STATE_TRANSITIONS: StateTransition[] = [
  // Patient flow
  { from: "draft", to: "awaiting_payment", trigger: "SUBMIT_FORM" },
  { from: "awaiting_payment", to: "paid", trigger: "PAYMENT_SUCCESS" },
  { from: "awaiting_payment", to: "draft", trigger: "PAYMENT_FAILED" },

  // System flow
  { from: "paid", to: "awaiting_review", trigger: "ENTER_QUEUE" },

  // Doctor flow
  { from: "awaiting_review", to: "in_review", trigger: "DOCTOR_OPENS" },
  { from: "in_review", to: "approved", trigger: "DOCTOR_APPROVES" },
  { from: "in_review", to: "declined", trigger: "DOCTOR_DECLINES" },
  { from: "in_review", to: "needs_info", trigger: "DOCTOR_REQUESTS_INFO" },
  { from: "in_review", to: "awaiting_review", trigger: "DOCTOR_RELEASES" },

  // Info follow-up
  { from: "needs_info", to: "awaiting_review", trigger: "PATIENT_RESPONDS" },

  // Completion
  { from: "approved", to: "completed", trigger: "DOCUMENT_SENT" },
  { from: "declined", to: "completed", trigger: "NOTIFICATION_SENT" },
]

// Map internal states to database status values (for backward compatibility)
export const STATE_TO_DB_STATUS: Record<RequestState, string> = {
  draft: "pending",
  awaiting_payment: "pending",
  paid: "pending",
  awaiting_review: "pending",
  in_review: "pending",
  approved: "approved",
  declined: "declined",
  needs_info: "needs_follow_up",
  completed: "approved", // Keep approved status for completed
}

// Map internal states to payment_status values
export const STATE_TO_PAYMENT_STATUS: Record<RequestState, string> = {
  draft: "pending_payment",
  awaiting_payment: "pending_payment",
  paid: "paid",
  awaiting_review: "paid",
  in_review: "paid",
  approved: "paid",
  declined: "paid",
  needs_info: "paid",
  completed: "paid",
}

/**
 * Check if a transition is valid
 */
export function canTransition(from: RequestState, to: RequestState): boolean {
  return STATE_TRANSITIONS.some((t) => t.from === from && t.to === to)
}

/**
 * Get the trigger name for a transition
 */
export function getTransitionTrigger(from: RequestState, to: RequestState): string | null {
  const transition = STATE_TRANSITIONS.find((t) => t.from === from && t.to === to)
  return transition?.trigger ?? null
}

/**
 * Get all valid next states from current state
 */
export function getValidNextStates(from: RequestState): RequestState[] {
  return STATE_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to)
}

/**
 * Email notifications triggered by state changes
 */
export const STATE_EMAIL_TRIGGERS: Partial<Record<RequestState, string>> = {
  awaiting_review: "request_received",
  paid: "payment_confirmed",
  approved: "request_approved",
  declined: "request_declined",
  needs_info: "needs_more_info",
}
