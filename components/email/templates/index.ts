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
export { PaymentRetryEmail, paymentRetrySubject, renderPaymentRetryEmailToHtml } from "./payment-retry"
export type { PaymentRetryEmailProps } from "./payment-retry"

// --- Needs More Info ---
export { NeedsMoreInfoEmail, needsMoreInfoSubject } from "./needs-more-info"
export type { NeedsMoreInfoEmailProps } from "./needs-more-info"

// --- Guest Complete Account ---
export { GuestCompleteAccountEmail, guestCompleteAccountSubject } from "./guest-complete-account"
export type { GuestCompleteAccountEmailProps } from "./guest-complete-account"

// --- Abandoned Checkout ---
export { AbandonedCheckoutEmail, abandonedCheckoutSubject, renderAbandonedCheckoutEmail } from "./abandoned-checkout"
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
