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
