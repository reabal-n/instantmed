/**
 * Email Templates Index
 * 
 * Re-exports all email templates for easy importing.
 */

export { WelcomeEmail, welcomeEmailSubject } from "./welcome"
export type { WelcomeEmailProps } from "./welcome"

export { MedCertPatientEmail, medCertPatientEmailSubject } from "./med-cert-patient"
export type { MedCertPatientEmailProps } from "./med-cert-patient"

export { MedCertEmployerEmail, medCertEmployerEmailSubject } from "./med-cert-employer"
export type { MedCertEmployerEmailProps } from "./med-cert-employer"

export { ScriptSentEmail, scriptSentEmailSubject } from "./script-sent"
export type { ScriptSentEmailProps } from "./script-sent"

export { RequestDeclinedEmail, requestDeclinedEmailSubject } from "./request-declined"
export type { RequestDeclinedEmailProps } from "./request-declined"

export { PaymentReceiptEmail, paymentReceiptEmailSubject } from "./payment-receipt"
export type { PaymentReceiptEmailProps } from "./payment-receipt"

export { ConsultApprovedEmail } from "./consult-approved"
export type { ConsultApprovedEmailProps } from "./consult-approved"

export { EdApprovedEmail } from "./ed-approved"
export type { EdApprovedEmailProps } from "./ed-approved"

export { HairLossApprovedEmail } from "./hair-loss-approved"
export type { HairLossApprovedEmailProps } from "./hair-loss-approved"

export { WeightLossApprovedEmail } from "./weight-loss-approved"
export type { WeightLossApprovedEmailProps } from "./weight-loss-approved"

export { WomensHealthApprovedEmail } from "./womens-health-approved"
export type { WomensHealthApprovedEmailProps } from "./womens-health-approved"

export { PrescriptionApprovedEmail } from "./prescription-approved"
export type { PrescriptionApprovedEmailProps } from "./prescription-approved"
