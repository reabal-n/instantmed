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
  RequestDeclinedEmail,
  requestDeclinedEmailSubject,
} from "@/components/email/templates"

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
