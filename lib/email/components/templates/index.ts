/**
 * Email Templates Index
 *
 * Canonical barrel export for ALL email templates.
 * Every template lives in components/email/templates/.
 */

// --- Med Cert (patient) ---
export type { MedCertPatientEmailProps } from "./med-cert-patient"
export { MedCertPatientEmail, medCertPatientEmailSubject } from "./med-cert-patient"

// --- Med Cert (employer) ---
export type { MedCertEmployerEmailProps } from "./med-cert-employer"
export { MedCertEmployerEmail, medCertEmployerEmailSubject } from "./med-cert-employer"

// --- Script Sent ---
export type { ScriptSentEmailProps } from "./script-sent"
export { ScriptSentEmail, scriptSentEmailSubject } from "./script-sent"

// --- Request Declined ---
export type { RequestDeclinedEmailProps } from "./request-declined"
export { RequestDeclinedEmail, requestDeclinedEmailSubject } from "./request-declined"

// --- Payment Confirmed ---
export type { PaymentConfirmedEmailProps } from "./payment-confirmed"
export { PaymentConfirmedEmail, paymentConfirmedSubject } from "./payment-confirmed"

// --- Payment Failed ---
export type { PaymentFailedEmailProps } from "./payment-failed"
export { PaymentFailedEmail, paymentFailedSubject } from "./payment-failed"

// --- Session Expired ---
export { SessionExpiredEmail, sessionExpiredSubject } from "./session-expired"

// --- Stripe Dispute Alert ---
export { DisputeAlertEmail, disputeAlertSubject } from "./dispute-alert"

// --- Needs More Info ---
export type { NeedsMoreInfoEmailProps } from "./needs-more-info"
export { NeedsMoreInfoEmail, needsMoreInfoSubject } from "./needs-more-info"

// --- Guest Complete Account ---
export type { GuestCompleteAccountEmailProps } from "./guest-complete-account"
export { GuestCompleteAccountEmail, guestCompleteAccountSubject } from "./guest-complete-account"

// --- Partial Intake Recovery ---
export type { PartialIntakeRecoveryEmailProps } from "./partial-intake-recovery"
export { PartialIntakeRecoveryEmail, partialIntakeRecoverySubject } from "./partial-intake-recovery"

// --- Abandoned Checkout ---
export type { AbandonedCheckoutEmailProps } from "./abandoned-checkout"
export { AbandonedCheckoutEmail, abandonedCheckoutSubject } from "./abandoned-checkout"

// --- Consult Approved ---
export type { ConsultApprovedEmailProps } from "./consult-approved"
export { ConsultApprovedEmail, consultApprovedSubject } from "./consult-approved"

// --- Request Received (merged payment + review status) ---
export type { RequestReceivedEmailProps } from "./request-received"
export { RequestReceivedEmail, requestReceivedSubject } from "./request-received"

// --- Refund Issued ---
export type { RefundIssuedEmailProps } from "./refund-issued"
export { RefundIssuedEmail, refundIssuedEmailSubject } from "./refund-issued"

// --- Still Reviewing (45-min follow-up for pending requests) ---
export type { StillReviewingEmailProps } from "./still-reviewing"
export { StillReviewingEmail, stillReviewingSubject } from "./still-reviewing"

// --- Abandoned Checkout Follow-Up ---
export type { AbandonedCheckoutFollowupProps } from "./abandoned-checkout-followup"
export { AbandonedCheckoutFollowupEmail, abandonedCheckoutFollowupSubject } from "./abandoned-checkout-followup"


// --- Review Request (once, 48h post-fulfilment) ---
export type { ReviewRequestEmailProps } from "./review-request"
export { ReviewRequestEmail, reviewRequestSubject } from "./review-request"

// --- Magic Link (Supabase auth hook) ---
export type { MagicLinkEmailProps } from "./magic-link"
export { MagicLinkEmail, magicLinkEmailSubject } from "./magic-link"

// --- Ops Test Email ---
export type { OpsTestEmailProps } from "./ops-test"
export { OpsTestEmail, opsTestEmailSubject } from "./ops-test"
