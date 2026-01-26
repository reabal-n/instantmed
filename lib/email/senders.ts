"use server"

/**
 * Convenience wrapper functions for sending specific email types
 * 
 * These functions provide a simpler API for common email sends
 * while still using the centralized sendEmail system.
 */

import { sendEmail } from "./send-email"
import { env } from "@/lib/env"
import {
  WelcomeEmail,
  welcomeEmailSubject,
  MedCertPatientEmail,
  medCertPatientEmailSubject,
  ScriptSentEmail,
  scriptSentEmailSubject,
  RequestDeclinedEmail,
  requestDeclinedEmailSubject,
} from "@/components/email/templates"

// ============================================
// WELCOME EMAIL
// ============================================

interface SendWelcomeEmailParams {
  to: string
  patientName: string
  patientId?: string
}

export async function sendWelcomeEmailNew(params: SendWelcomeEmailParams) {
  const { to, patientName, patientId } = params

  return sendEmail({
    to,
    toName: patientName,
    subject: welcomeEmailSubject,
    template: WelcomeEmail({
      patientName,
      appUrl: env.appUrl,
    }),
    emailType: "welcome",
    patientId,
  })
}

// ============================================
// MEDICAL CERTIFICATE - PATIENT
// ============================================

interface SendMedCertPatientEmailParams {
  to: string
  patientName: string
  patientId: string
  intakeId: string
  certificateId?: string
  verificationCode?: string
  certType?: "work" | "study" | "carer"
}

export async function sendMedCertPatientEmailNew(params: SendMedCertPatientEmailParams) {
  const { 
    to, 
    patientName, 
    patientId, 
    intakeId, 
    certificateId, 
    verificationCode,
    certType = "work",
  } = params

  const dashboardUrl = `${env.appUrl}/patient/intakes/${intakeId}`

  return sendEmail({
    to,
    toName: patientName,
    subject: medCertPatientEmailSubject,
    template: MedCertPatientEmail({
      patientName,
      dashboardUrl,
      verificationCode,
      certType,
      appUrl: env.appUrl,
    }),
    emailType: "med_cert_patient",
    intakeId,
    patientId,
    certificateId,
    metadata: {
      verification_code: verificationCode,
      cert_type: certType,
    },
    tags: [
      { name: "category", value: "med_cert_approved" },
      { name: "intake_id", value: intakeId },
    ],
  })
}

// ============================================
// SCRIPT SENT
// ============================================

interface SendScriptSentEmailParams {
  to: string
  patientName: string
  patientId: string
  intakeId: string
  escriptReference?: string
}

export async function sendScriptSentEmailNew(params: SendScriptSentEmailParams) {
  const { to, patientName, patientId, intakeId, escriptReference } = params

  return sendEmail({
    to,
    toName: patientName,
    subject: scriptSentEmailSubject,
    template: ScriptSentEmail({
      patientName,
      requestId: intakeId,
      escriptReference,
      appUrl: env.appUrl,
    }),
    emailType: "script_sent",
    intakeId,
    patientId,
    metadata: {
      has_escript_reference: !!escriptReference,
    },
    tags: [
      { name: "category", value: "script_sent" },
      { name: "intake_id", value: intakeId },
    ],
  })
}

// ============================================
// REQUEST DECLINED
// ============================================

interface SendRequestDeclinedEmailParams {
  to: string
  patientName: string
  patientId: string
  intakeId: string
  requestType: string
  reason?: string
}

export async function sendRequestDeclinedEmailNew(params: SendRequestDeclinedEmailParams) {
  const { to, patientName, patientId, intakeId, requestType, reason } = params

  return sendEmail({
    to,
    toName: patientName,
    subject: requestDeclinedEmailSubject(requestType),
    template: RequestDeclinedEmail({
      patientName,
      requestType,
      requestId: intakeId,
      reason,
      appUrl: env.appUrl,
    }),
    emailType: "request_declined",
    intakeId,
    patientId,
    metadata: {
      request_type: requestType,
      has_reason: !!reason,
    },
    tags: [
      { name: "category", value: "request_declined" },
      { name: "intake_id", value: intakeId },
    ],
  })
}
