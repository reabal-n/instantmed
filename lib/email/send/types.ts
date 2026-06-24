/**
 * Email service types and interfaces.
 */

export type EmailType =
  | "welcome"
  | "med_cert_patient"
  | "med_cert_employer"
  | "script_sent"
  | "request_declined"
  | "needs_more_info"
  | "prescription_approved"
  | "ed_approved"
  | "hair_loss_approved"
  | "womens_health_approved"
  | "weight_loss_approved"
  | "consult_approved"
  | "generic"
  // Database-template email types (sent via template-sender, retried via dispatcher)
  | "payment_received"
  | "refund_notification"
  | "payment_failed"
  | "guest_complete_account"
  | "payment_confirmed"
  // Cron-enqueued email types
  | "abandoned_checkout"
  // Status transition emails (migrated from send-status.ts)
  | "request_approved"
  // Lifecycle emails
  | "intake_submitted"
  // Merged email (replaces payment_confirmed + intake_submitted for new sends)
  | "request_received"
  | "referral_credit"
  | "refund_issued"
  | "still_reviewing"
  | "abandoned_checkout_followup"
  | "partial_intake_recovery"
  | "verification_code"
  // Review lifecycle emails (cron-triggered)
  | "review_request"
  // Reactivation / refill reminder (cron-triggered, marketing-consent gated)
  | "refill_reminder"
  // Med-cert reactivation nudge (cron-triggered, marketing-consent gated)
  | "cert_reactivation"
  // One-time self-reported attribution backfill (script-triggered, marketing-consent gated)
  | "heard_about_us_backfill"
  | "payment_retry"
  | "ops_test"

// Email types that are marketing/engagement - get auto List-Unsubscribe headers
export const MARKETING_EMAIL_TYPES: ReadonlySet<EmailType> = new Set([
  "abandoned_checkout",
  "abandoned_checkout_followup",
  "partial_intake_recovery",
  "review_request",
  "referral_credit",
  "refill_reminder",
  "cert_reactivation",
  "heard_about_us_backfill",
])

export interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  template: React.ReactElement
  emailType: EmailType
  // Context for logging/linking
  intakeId?: string
  patientId?: string
  certificateId?: string
  // Optional metadata (non-sensitive)
  metadata?: Record<string, unknown>
  // Optional overrides
  from?: string
  replyTo?: string
  tags?: { name: string; value: string }[]
  headers?: Record<string, string>
  // Optional file attachments (base64-encoded)
  attachments?: { filename: string; content: string; contentType?: string }[]
  idempotencyKey?: string
  /**
   * Optional ISO timestamp. When set, the email is queued in pending state
   * (no immediate Resend call) and the dispatcher waits until
   * `now() >= scheduledFor` before claiming it. NULL means send immediately.
   * Used by the 30s cert approval undo window.
   */
  scheduledFor?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  outboxId?: string
  error?: string
  skipped?: boolean  // True if skipped due to E2E mode
}

export interface OutboxEntry {
  email_type: EmailType
  to_email: string
  to_name?: string
  subject: string
  status: "pending" | "sent" | "failed" | "skipped_e2e"
  provider: string
  provider_message_id?: string
  error_message?: string
  intake_id?: string
  patient_id?: string
  certificate_id?: string
  metadata?: Record<string, unknown>
  sent_at?: string
  last_attempt_at?: string
  retry_count?: number
  idempotency_key?: string
  /** ISO timestamp the dispatcher must wait for before claiming this row. */
  scheduled_for?: string
}

export interface OutboxRow {
  id: string
  email_type: EmailType
  to_email: string
  to_name: string | null
  subject: string
  status: string
  retry_count: number
  last_attempt_at: string | null
  intake_id: string | null
  patient_id: string | null
  certificate_id: string | null
  metadata: Record<string, unknown> | null
  /** Present when the row was queued for deferred send. */
  scheduled_for?: string | null
}
