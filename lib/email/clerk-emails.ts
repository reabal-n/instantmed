/**
 * Clerk email delivery via Resend.
 *
 * When "Delivered by Clerk" is disabled, Clerk fires a `email.created` webhook
 * and we send the email ourselves through Resend for consistent branding.
 */

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("clerk-emails")

interface ClerkVerificationEmailParams {
  to: string
  code: string
  requestedFrom?: string
  requestedAt?: string
}

/**
 * Send a verification code email via Resend.
 * Called from the Clerk webhook handler when slug === 'verification_code'.
 */
export async function sendClerkVerificationEmail({
  to,
  code,
  requestedFrom,
  requestedAt,
}: ClerkVerificationEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "InstantMed <noreply@instantmed.com.au>"

  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured")
  }

  if (!code) {
    throw new Error("Verification code is required")
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <img src="https://instantmed.com.au/branding/logo.png" alt="InstantMed" style="height: 32px; margin-bottom: 32px;" />
      <h1 style="font-size: 22px; font-weight: 600; color: #0f172a; margin: 0 0 8px;">Your verification code</h1>
      <p style="font-size: 15px; color: #475569; margin: 0 0 24px;">Use this code to verify your email address. It expires in 10 minutes.</p>
      <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a; font-variant-numeric: tabular-nums;">${code}</span>
      </div>
      ${requestedFrom ? `<p style="font-size: 13px; color: #94a3b8; margin: 0;">Requested from: ${requestedFrom}${requestedAt ? ` at ${requestedAt}` : ""}</p>` : ""}
      <p style="font-size: 13px; color: #94a3b8; margin: 16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #cbd5e1; margin: 0;">InstantMed Pty Ltd · Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010</p>
    </div>
  `

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject: `${code} is your InstantMed verification code`,
      html,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    log.error("Clerk verification email send failed", { to, status: response.status, body })
    throw new Error(`Resend API error: ${response.status}`)
  }

  log.info("Clerk verification email sent", { to })
}
