"use server"

import { createElement } from "react"
import { renderEmailToHtml } from "./react-renderer-server"
import { sendViaResend } from "./resend"
import { VerificationCodeEmail, verificationCodeSubject } from "@/components/email/templates/verification-code"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("clerk-emails")

interface SendVerificationParams {
  to: string
  code: string
  requestedFrom?: string
  requestedAt?: string
}

/**
 * Send a branded verification code email via Resend.
 * Called from the Clerk webhook handler when "Delivered by Clerk" is OFF.
 */
export async function sendClerkVerificationEmail({
  to,
  code,
  requestedFrom,
  requestedAt,
}: SendVerificationParams): Promise<void> {
  if (!code) {
    log.error("No verification code provided", { to })
    throw new Error("Verification code is required")
  }

  const html = await renderEmailToHtml(
    createElement(VerificationCodeEmail, {
      code,
      requestedFrom,
      requestedAt,
    })
  )

  const subject = verificationCodeSubject(code)

  const result = await sendViaResend({
    to,
    subject,
    html,
    from: `InstantMed <notifications@instantmed.com.au>`,
    replyTo: "support@instantmed.com.au",
    tags: [
      { name: "email_type", value: "verification_code" },
      { name: "source", value: "clerk_webhook" },
    ],
  })

  if (!result.success) {
    log.error("Verification email send failed", { to, error: result.error })
    throw new Error(`Failed to send verification email: ${result.error}`)
  }

  log.info("Verification email sent", { to, resendId: result.id })
}
