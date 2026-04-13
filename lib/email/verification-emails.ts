"use server"

import { createElement } from "react"

import { CONTACT_EMAIL } from "@/lib/constants"
import { VerificationCodeEmail, verificationCodeSubject } from "@/lib/email/components/templates/verification-code"
import { createLogger } from "@/lib/observability/logger"

import { sendEmail } from "./send-email"

const log = createLogger("verification-emails")

interface SendVerificationParams {
  to: string
  code: string
  requestedFrom?: string
  requestedAt?: string
}

/**
 * Send a branded verification code email via Resend.
 */
export async function sendVerificationEmail({
  to,
  code,
  requestedFrom,
  requestedAt,
}: SendVerificationParams): Promise<void> {
  if (!code) {
    log.error("No verification code provided", { to })
    throw new Error("Verification code is required")
  }

  const subject = verificationCodeSubject(code)

  const result = await sendEmail({
    to,
    subject,
    template: createElement(VerificationCodeEmail, {
      code,
      requestedFrom,
      requestedAt,
    }),
    emailType: "verification_code",
    from: `InstantMed <notifications@instantmed.com.au>`,
    replyTo: CONTACT_EMAIL,
    tags: [
      { name: "email_type", value: "verification_code" },
      { name: "source", value: "auth" },
    ],
  })

  if (!result.success) {
    log.error("Verification email send failed", { to, error: result.error })
    throw new Error(`Failed to send verification email: ${result.error}`)
  }

  log.info("Verification email sent", { to, messageId: result.messageId })
}
