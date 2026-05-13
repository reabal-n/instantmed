export type EmailSequenceStatus = "active" | "inactive"

export interface EmailSequenceDefinition {
  id: string
  name: string
  status: EmailSequenceStatus
  owner: string
  trigger: string
  cadence: string
  guard: string
}

export const EMAIL_SEQUENCES: readonly EmailSequenceDefinition[] = [
  {
    id: "request_received",
    name: "Request received",
    status: "active",
    owner: "Stripe checkout",
    trigger: "Payment confirmation",
    cadence: "Immediate",
    guard: "One row per intake via outbox idempotency key",
  },
  {
    id: "partial_intake_recovery",
    name: "Draft recovery",
    status: "active",
    owner: "Pre-checkout draft",
    trigger: "Captured email, no submitted intake",
    cadence: "Hourly at :15",
    guard: "Excludes review and checkout steps",
  },
  {
    id: "abandoned_checkout",
    name: "Checkout recovery",
    status: "active",
    owner: "Submitted unpaid intake",
    trigger: "Pending payment after checkout creation",
    cadence: "1h nudge, 24h follow-up",
    guard: "Requires pending_payment intake status",
  },
  {
    id: "follow_up_reminder",
    name: "Med cert follow-up",
    status: "active",
    owner: "Certificate lifecycle",
    trigger: "Approved med cert",
    cadence: "Day 3",
    guard: "One per intake",
  },
  {
    id: "review_request",
    name: "Review request",
    status: "active",
    owner: "Post-approval lifecycle",
    trigger: "Approved or completed request",
    cadence: "Day 2 and day 7",
    guard: "Review sent timestamps on intake",
  },
  {
    id: "decline_reengagement",
    name: "Decline re-engagement",
    status: "inactive",
    owner: "Manual-only legacy marketing",
    trigger: "None",
    cadence: "Not scheduled",
    guard: "Route remains cron-auth protected for audit compatibility",
  },
  {
    id: "treatment_followup",
    name: "Treatment follow-up",
    status: "active",
    owner: "ED and hair-loss follow-ups",
    trigger: "Due follow-up milestone",
    cadence: "Daily",
    guard: "Follow-up log caps reminder count",
  },
  {
    id: "repeat_rx_reminder",
    name: "Repeat Rx reminder",
    status: "inactive",
    owner: "Retired subscription model",
    trigger: "None",
    cadence: "Removed",
    guard: "Route and template removed",
  },
  {
    id: "subscription_nudge",
    name: "Subscription nudge",
    status: "inactive",
    owner: "Retired subscription model",
    trigger: "None",
    cadence: "Removed",
    guard: "Not scheduled and not in patient acquisition",
  },
] as const

export const ACTIVE_EMAIL_SEQUENCES = EMAIL_SEQUENCES.filter((sequence) => sequence.status === "active")
export const INACTIVE_EMAIL_SEQUENCES = EMAIL_SEQUENCES.filter((sequence) => sequence.status === "inactive")
