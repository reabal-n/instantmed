/**
 * Email Templates Index
 *
 * Canonical barrel export for ALL email templates.
 * Every template lives in components/email/templates/.
 */

// --- Welcome ---
export type { WelcomeEmailProps } from "./welcome"
export { WelcomeEmail, welcomeEmailSubject } from "./welcome"

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

// --- Payment Receipt ---
export type { PaymentReceiptEmailProps } from "./payment-receipt"
export { PaymentReceiptEmail, paymentReceiptEmailSubject } from "./payment-receipt"

// --- Payment Confirmed ---
export type { PaymentConfirmedEmailProps } from "./payment-confirmed"
export { PaymentConfirmedEmail, paymentConfirmedSubject } from "./payment-confirmed"

// --- Payment Failed ---
export type { PaymentFailedEmailProps } from "./payment-failed"
export { PaymentFailedEmail, paymentFailedSubject } from "./payment-failed"

// --- Payment Retry ---
export type { PaymentRetryEmailProps } from "./payment-retry"
export { PaymentRetryEmail, paymentRetrySubject } from "./payment-retry"

// --- Needs More Info ---
export type { NeedsMoreInfoEmailProps } from "./needs-more-info"
export { NeedsMoreInfoEmail, needsMoreInfoSubject } from "./needs-more-info"

// --- Guest Complete Account ---
export type { GuestCompleteAccountEmailProps } from "./guest-complete-account"
export { GuestCompleteAccountEmail, guestCompleteAccountSubject } from "./guest-complete-account"

// --- Abandoned Checkout ---
export type { AbandonedCheckoutEmailProps } from "./abandoned-checkout"
export { AbandonedCheckoutEmail, abandonedCheckoutSubject } from "./abandoned-checkout"

// --- Consult Approved ---
export type { ConsultApprovedEmailProps } from "./consult-approved"
export { ConsultApprovedEmail, consultApprovedSubject } from "./consult-approved"

// --- ED Approved ---
export type { EdApprovedEmailProps } from "./ed-approved"
export { EdApprovedEmail, edApprovedSubject } from "./ed-approved"

// --- Hair Loss Approved ---
export type { HairLossApprovedEmailProps } from "./hair-loss-approved"
export { HairLossApprovedEmail, hairLossApprovedSubject } from "./hair-loss-approved"

// --- Weight Loss Approved ---
export type { WeightLossApprovedEmailProps } from "./weight-loss-approved"
export { WeightLossApprovedEmail, weightLossApprovedSubject } from "./weight-loss-approved"

// --- Women's Health Approved ---
export type { WomensHealthApprovedEmailProps } from "./womens-health-approved"
export { WomensHealthApprovedEmail, womensHealthApprovedSubject } from "./womens-health-approved"

// --- Prescription Approved ---
export type { PrescriptionApprovedEmailProps } from "./prescription-approved"
export { PrescriptionApprovedEmail, prescriptionApprovedSubject } from "./prescription-approved"

// --- Repeat Rx Reminder ---
export type { RepeatRxReminderEmailProps } from "./repeat-rx-reminder"
export { RepeatRxReminderEmail, repeatRxReminderSubject } from "./repeat-rx-reminder"

// --- Referral Credit ---
export type { ReferralCreditEmailProps } from "./referral-credit"
export { ReferralCreditEmail, referralCreditSubject } from "./referral-credit"

// --- Intake Submitted ---
export type { IntakeSubmittedEmailProps } from "./intake-submitted"
export { IntakeSubmittedEmail, intakeSubmittedSubject } from "./intake-submitted"

// --- Request Received (merged payment + review status) ---
export type { RequestReceivedEmailProps } from "./request-received"
export { RequestReceivedEmail, requestReceivedSubject } from "./request-received"

// --- Refund Issued ---
export type { RefundIssuedEmailProps } from "./refund-issued"
export { RefundIssuedEmail, refundIssuedEmailSubject } from "./refund-issued"

// --- Verification Code (OTP via Resend) ---
export type { VerificationCodeEmailProps } from "./verification-code"
export { VerificationCodeEmail, verificationCodeSubject } from "./verification-code"

// --- Follow-Up Reminder (day-3 post med cert approval) ---
export type { FollowUpReminderEmailProps } from "./follow-up-reminder"
export { FollowUpReminderEmail, followUpReminderSubject } from "./follow-up-reminder"

// --- Still Reviewing (45-min follow-up for pending requests) ---
export type { StillReviewingEmailProps } from "./still-reviewing"
export { StillReviewingEmail, stillReviewingSubject } from "./still-reviewing"


// --- Decline Re-Engagement (2h post-decline) ---
export type { DeclineReengagementEmailProps } from "./decline-reengagement"
export { DeclineReengagementEmail, declineReengagementSubject } from "./decline-reengagement"

// --- Treatment Follow-Up (ED/hair-loss milestone check-ins) ---
export type { FollowupMilestone,FollowupSubtype, TreatmentFollowupEmailProps } from "./treatment-followup"
export { TreatmentFollowupEmail, treatmentFollowupSubject } from "./treatment-followup"

// --- Abandoned Checkout Follow-Up (urgency reminder) ---
export type { AbandonedCheckoutFollowupProps } from "./abandoned-checkout-followup"
export { AbandonedCheckoutFollowupEmail, abandonedCheckoutFollowupSubject } from "./abandoned-checkout-followup"


// --- Review Request (day-2 post-approval) ---
export type { ReviewRequestEmailProps } from "./review-request"
export { ReviewRequestEmail, reviewRequestSubject } from "./review-request"

// --- Review Follow-Up (day-7 nudge) ---
export type { ReviewFollowupEmailProps } from "./review-followup"
export { ReviewFollowupEmail, reviewFollowupSubject } from "./review-followup"

// --- Subscription Nudge (repeat Rx upsell) ---
export type { SubscriptionNudgeEmailProps } from "./subscription-nudge"
export { SubscriptionNudgeEmail, subscriptionNudgeSubject } from "./subscription-nudge"

// --- Subscription Cancelled ---
export type { SubscriptionCancelledEmailProps } from "./subscription-cancelled"
export { SubscriptionCancelledEmail, subscriptionCancelledSubject } from "./subscription-cancelled"

// --- Magic Link (Supabase auth hook) ---
export type { MagicLinkEmailProps } from "./magic-link"
export { MagicLinkEmail, magicLinkEmailSubject } from "./magic-link"
