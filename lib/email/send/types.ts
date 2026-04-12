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
  | "repeat_rx_reminder"
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
  | "decline_reengagement"
  | "treatment_followup"
  | "abandoned_checkout_followup"
  | "subscription_nudge"
  | "follow_up_reminder"
  | "verification_code"
  // Review lifecycle emails (cron-triggered)
  | "review_request"
  | "review_followup"
  | "payment_retry"

// Email types that are marketing/engagement - get auto List-Unsubscribe headers
export const MARKETING_EMAIL_TYPES: ReadonlySet<EmailType> = new Set([
  "abandoned_checkout",
  "abandoned_checkout_followup",
  "subscription_nudge",
  "follow_up_reminder",
  "review_request",
  "review_followup",
  "repeat_rx_reminder",
  "decline_reengagement",
  "treatment_followup",
  "referral_credit",
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
}
