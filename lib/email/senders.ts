"use server"

/**
 * Convenience wrapper functions for sending specific email types
 *
 * These functions provide a simpler API for common email sends
 * while still using the centralized sendEmail system.
 */

import { env } from "@/lib/config/env"
import {
  RequestDeclinedEmail,
  requestDeclinedEmailSubject,
} from "@/lib/email/components/templates"
import { buildPatientRequestAccessUrl } from "@/lib/email/request-access-url"

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
  /** Structured decline-reason code (e.g. "requires_examination"). Drives next-step copy. */
  reasonCode?: string
}

export async function sendRequestDeclinedEmail(params: SendRequestDeclinedEmailParams) {
  const { to, patientName, patientId, intakeId, requestType, reason, reasonCode } = params

  return sendEmail({
    to,
    toName: patientName,
    subject: requestDeclinedEmailSubject(requestType),
    template: RequestDeclinedEmail({
      patientName,
      requestType,
      requestId: intakeId,
      requestAccessUrl: buildPatientRequestAccessUrl({ appUrl: env.appUrl, intakeId }),
      reason,
      reasonCode,
      appUrl: env.appUrl,
    }),
    emailType: "request_declined",
    intakeId,
    patientId,
    metadata: {
      request_type: requestType,
      has_reason: !!reason,
      reason_code: reasonCode || null,
    },
    tags: [
      { name: "category", value: "request_declined" },
      { name: "intake_id", value: intakeId },
    ],
  })
}
