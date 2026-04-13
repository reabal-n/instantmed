"use server"

/**
 * Convenience wrapper functions for sending specific email types
 *
 * These functions provide a simpler API for common email sends
 * while still using the centralized sendEmail system.
 */

import { env } from "@/lib/config/env"
import {
  DeclineReengagementEmail,
  declineReengagementSubject,
  RefundIssuedEmail,
  refundIssuedEmailSubject,
  RequestDeclinedEmail,
  requestDeclinedEmailSubject,
} from "@/lib/email/components/templates"

import { sendEmail } from "./send-email"

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

export async function sendRequestDeclinedEmail(params: SendRequestDeclinedEmailParams) {
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

// ============================================
// REFUND ISSUED
// ============================================

interface SendRefundIssuedEmailParams {
  to: string
  patientName: string
  patientId: string
  intakeId: string
  requestType: string
  amountFormatted?: string
}

export async function sendRefundIssuedEmail(params: SendRefundIssuedEmailParams) {
  const { to, patientName, patientId, intakeId, requestType, amountFormatted } = params

  return sendEmail({
    to,
    toName: patientName,
    subject: refundIssuedEmailSubject(requestType),
    template: RefundIssuedEmail({
      patientName,
      requestType,
      requestId: intakeId,
      amountFormatted,
      appUrl: env.appUrl,
    }),
    emailType: "refund_issued",
    intakeId,
    patientId,
    metadata: {
      request_type: requestType,
      has_amount: !!amountFormatted,
    },
    tags: [
      { name: "category", value: "refund_issued" },
      { name: "intake_id", value: intakeId },
    ],
  })
}

// ============================================
// DECLINE RE-ENGAGEMENT
// ============================================

interface SendDeclineReengagementEmailParams {
  to: string
  patientName: string
  patientId: string
  intakeId: string
  declinedService: string
}

export async function sendDeclineReengagementEmail(params: SendDeclineReengagementEmailParams) {
  const { to, patientName, patientId, intakeId, declinedService } = params

  return sendEmail({
    to,
    toName: patientName,
    subject: declineReengagementSubject(),
    template: DeclineReengagementEmail({
      patientName,
      declinedService,
      appUrl: env.appUrl,
    }),
    emailType: "decline_reengagement",
    intakeId,
    patientId,
    metadata: {
      declined_service: declinedService,
    },
    tags: [
      { name: "category", value: "decline_reengagement" },
      { name: "intake_id", value: intakeId },
    ],
  })
}
