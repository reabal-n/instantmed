/**
 * Email Templates Index
 *
 * Canonical barrel export for ALL email templates.
 * Every template lives in components/email/templates/.
 */

// --- Welcome ---
export { WelcomeEmail, welcomeEmailSubject } from "./welcome"
export type { WelcomeEmailProps } from "./welcome"

// --- Med Cert (patient) ---
export { MedCertPatientEmail, medCertPatientEmailSubject } from "./med-cert-patient"
export type { MedCertPatientEmailProps } from "./med-cert-patient"

// --- Med Cert (employer) ---
export { MedCertEmployerEmail, medCertEmployerEmailSubject } from "./med-cert-employer"
export type { MedCertEmployerEmailProps } from "./med-cert-employer"

// --- Script Sent ---
export { ScriptSentEmail, scriptSentEmailSubject } from "./script-sent"
export type { ScriptSentEmailProps } from "./script-sent"

// --- Request Declined ---
export { RequestDeclinedEmail, requestDeclinedEmailSubject } from "./request-declined"
export type { RequestDeclinedEmailProps } from "./request-declined"

// --- Payment Receipt ---
export { PaymentReceiptEmail, paymentReceiptEmailSubject } from "./payment-receipt"
export type { PaymentReceiptEmailProps } from "./payment-receipt"

// --- Payment Confirmed ---
export { PaymentConfirmedEmail, paymentConfirmedSubject } from "./payment-confirmed"
export type { PaymentConfirmedEmailProps } from "./payment-confirmed"

// --- Payment Failed ---
export { PaymentFailedEmail, paymentFailedSubject } from "./payment-failed"
export type { PaymentFailedEmailProps } from "./payment-failed"

// --- Payment Retry ---
export { PaymentRetryEmail, paymentRetrySubject } from "./payment-retry"
export type { PaymentRetryEmailProps } from "./payment-retry"

// --- Needs More Info ---
export { NeedsMoreInfoEmail, needsMoreInfoSubject } from "./needs-more-info"
export type { NeedsMoreInfoEmailProps } from "./needs-more-info"

// --- Guest Complete Account ---
export { GuestCompleteAccountEmail, guestCompleteAccountSubject } from "./guest-complete-account"
export type { GuestCompleteAccountEmailProps } from "./guest-complete-account"

// --- Abandoned Checkout ---
export { AbandonedCheckoutEmail, abandonedCheckoutSubject } from "./abandoned-checkout"
export type { AbandonedCheckoutEmailProps } from "./abandoned-checkout"

// --- Consult Approved ---
export { ConsultApprovedEmail, consultApprovedSubject } from "./consult-approved"
export type { ConsultApprovedEmailProps } from "./consult-approved"

// --- ED Approved ---
export { EdApprovedEmail, edApprovedSubject } from "./ed-approved"
export type { EdApprovedEmailProps } from "./ed-approved"

// --- Hair Loss Approved ---
export { HairLossApprovedEmail, hairLossApprovedSubject } from "./hair-loss-approved"
export type { HairLossApprovedEmailProps } from "./hair-loss-approved"

// --- Weight Loss Approved ---
export { WeightLossApprovedEmail, weightLossApprovedSubject } from "./weight-loss-approved"
export type { WeightLossApprovedEmailProps } from "./weight-loss-approved"

// --- Women's Health Approved ---
export { WomensHealthApprovedEmail, womensHealthApprovedSubject } from "./womens-health-approved"
export type { WomensHealthApprovedEmailProps } from "./womens-health-approved"

// --- Prescription Approved ---
export { PrescriptionApprovedEmail, prescriptionApprovedSubject } from "./prescription-approved"
export type { PrescriptionApprovedEmailProps } from "./prescription-approved"

// --- Repeat Rx Reminder ---
export { RepeatRxReminderEmail, repeatRxReminderSubject } from "./repeat-rx-reminder"
export type { RepeatRxReminderEmailProps } from "./repeat-rx-reminder"

// --- Referral Credit ---
export { ReferralCreditEmail, referralCreditSubject } from "./referral-credit"
export type { ReferralCreditEmailProps } from "./referral-credit"

// --- Intake Submitted ---
export { IntakeSubmittedEmail, intakeSubmittedSubject } from "./intake-submitted"
export type { IntakeSubmittedEmailProps } from "./intake-submitted"

// --- Request Received (merged payment + review status) ---
export { RequestReceivedEmail, requestReceivedSubject } from "./request-received"
export type { RequestReceivedEmailProps } from "./request-received"

// --- Refund Issued ---
export { RefundIssuedEmail, refundIssuedEmailSubject } from "./refund-issued"
export type { RefundIssuedEmailProps } from "./refund-issued"

// --- Verification Code (OTP via Resend) ---
export { VerificationCodeEmail, verificationCodeSubject } from "./verification-code"
export type { VerificationCodeEmailProps } from "./verification-code"

// --- Follow-Up Reminder (day-3 post med cert approval) ---
export { FollowUpReminderEmail, followUpReminderSubject } from "./follow-up-reminder"
export type { FollowUpReminderEmailProps } from "./follow-up-reminder"

// --- Still Reviewing (45-min follow-up for pending requests) ---
export { StillReviewingEmail, stillReviewingSubject } from "./still-reviewing"
export type { StillReviewingEmailProps } from "./still-reviewing"

// --- Exit Intent Social Proof (email 2 of nurture sequence) ---
export { ExitIntentSocialProofEmail, exitIntentSocialProofSubject } from "./exit-intent-social-proof"
export type { ExitIntentSocialProofEmailProps } from "./exit-intent-social-proof"

// --- Exit Intent Last Chance (email 3 of nurture sequence) ---
export { ExitIntentLastChanceEmail, exitIntentLastChanceSubject } from "./exit-intent-last-chance"
export type { ExitIntentLastChanceEmailProps } from "./exit-intent-last-chance"

// --- Decline Re-Engagement (2h post-decline) ---
export { DeclineReengagementEmail, declineReengagementSubject } from "./decline-reengagement"
export type { DeclineReengagementEmailProps } from "./decline-reengagement"

// --- Treatment Follow-Up (ED/hair-loss milestone check-ins) ---
export { TreatmentFollowupEmail, treatmentFollowupSubject } from "./treatment-followup"
export type { TreatmentFollowupEmailProps, FollowupSubtype, FollowupMilestone } from "./treatment-followup"

// --- Abandoned Checkout Follow-Up (urgency reminder) ---
export { AbandonedCheckoutFollowupEmail, abandonedCheckoutFollowupSubject } from "./abandoned-checkout-followup"
export type { AbandonedCheckoutFollowupProps } from "./abandoned-checkout-followup"

// --- Exit Intent Reminder (email 1 of nurture sequence) ---
export { ExitIntentReminderEmail, exitIntentReminderSubject } from "./exit-intent-reminder"
export type { ExitIntentReminderEmailProps } from "./exit-intent-reminder"

// --- Review Request (day-2 post-approval) ---
export { ReviewRequestEmail, reviewRequestSubject } from "./review-request"
export type { ReviewRequestEmailProps } from "./review-request"

// --- Review Follow-Up (day-7 nudge) ---
export { ReviewFollowupEmail, reviewFollowupSubject } from "./review-followup"
export type { ReviewFollowupEmailProps } from "./review-followup"

// --- Subscription Nudge (repeat Rx upsell) ---
export { SubscriptionNudgeEmail, subscriptionNudgeSubject } from "./subscription-nudge"
export type { SubscriptionNudgeEmailProps } from "./subscription-nudge"
