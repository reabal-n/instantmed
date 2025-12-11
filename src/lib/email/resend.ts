import "server-only"

/**
 * Email delivery service using Resend
 * 
 * To enable actual email delivery:
 * 1. Sign up at https://resend.com
 * 2. Add RESEND_API_KEY to your environment variables
 * 3. Verify your domain in Resend dashboard
 */

interface ResendEmailParams {
  to: string
  from?: string
  subject: string
  html: string
  replyTo?: string
  tags?: { name: string; value: string }[]
}

interface ResendResponse {
  id?: string
  error?: { message: string; statusCode: number }
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.EMAIL_FROM || "InstantMed <noreply@instantmed.com.au>"
const REPLY_TO_EMAIL = process.env.EMAIL_REPLY_TO || "support@instantmed.com.au"

/**
 * Send email via Resend API
 */
export async function sendViaResend(params: ResendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const { to, from = FROM_EMAIL, subject, html, replyTo = REPLY_TO_EMAIL, tags } = params

  // If no API key, log and return success (development mode)
  if (!RESEND_API_KEY) {
    console.log(`[Email Dev Mode] Would send email to ${to}:`, { subject })
    return { success: true, id: `dev-${Date.now()}` }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        reply_to: replyTo,
        tags,
      }),
    })

    const data: ResendResponse = await response.json()

    if (!response.ok) {
      console.error("[Resend Error]", data.error)
      return { success: false, error: data.error?.message || "Failed to send email" }
    }

    return { success: true, id: data.id }
  } catch (error) {
    console.error("[Resend Error]", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Send welcome email to new patients
 */
export async function sendWelcomeEmail(to: string, patientName: string): Promise<{ success: boolean }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://instantmed.com.au/logo.png" alt="InstantMed" style="height: 40px;" />
      </div>
      
      <h1 style="color: #0A0F1C; font-size: 24px; margin-bottom: 16px;">Welcome to InstantMed! 👋</h1>
      
      <p>Hi ${patientName},</p>
      
      <p>Thanks for joining InstantMed. We're here to make healthcare simple and accessible.</p>
      
      <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #0A0F1C;">What you can do:</h3>
        <ul style="padding-left: 20px;">
          <li>Get medical certificates in hours, not days</li>
          <li>Request prescriptions from registered doctors</li>
          <li>Get specialist referrals without the wait</li>
          <li>Access pathology test referrals online</li>
        </ul>
      </div>
      
      <p>
        <a href="https://instantmed.com.au/start" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          Get Started
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Questions? Just reply to this email or visit our <a href="https://instantmed.com.au/contact" style="color: #00C9A7;">help center</a>.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        InstantMed Pty Ltd · Australia<br>
        <a href="https://instantmed.com.au/privacy" style="color: #999;">Privacy</a> · 
        <a href="https://instantmed.com.au/terms" style="color: #999;">Terms</a>
      </p>
    </body>
    </html>
  `

  return sendViaResend({
    to,
    subject: "Welcome to InstantMed! 🩺",
    html,
    tags: [{ name: "category", value: "welcome" }],
  })
}

/**
 * Send prescription ready notification
 */
export async function sendPrescriptionReadyEmail(
  to: string,
  patientName: string,
  medicationName: string,
  requestId: string
): Promise<{ success: boolean }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://instantmed.com.au/logo.png" alt="InstantMed" style="height: 40px;" />
      </div>
      
      <div style="background: linear-gradient(135deg, #dcfce7, #d1fae5); border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <span style="font-size: 48px;">✓</span>
        <h1 style="color: #166534; font-size: 24px; margin: 16px 0 0 0;">Your prescription is ready!</h1>
      </div>
      
      <p>Hi ${patientName},</p>
      
      <p>Great news! Your prescription for <strong>${medicationName}</strong> has been approved and sent to you via eScript.</p>
      
      <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #0A0F1C;">What happens next?</h3>
        <ol style="padding-left: 20px; margin-bottom: 0;">
          <li>Check your SMS for the eScript token</li>
          <li>Take it to any pharmacy in Australia</li>
          <li>Show the pharmacist your token or SMS</li>
          <li>Collect your medication</li>
        </ol>
      </div>
      
      <p>
        <a href="https://instantmed.com.au/patient/requests/${requestId}" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          View Request Details
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Need help finding a pharmacy? Use the <a href="https://www.findapharmacy.com.au/" style="color: #00C9A7;">Find a Pharmacy</a> tool.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        InstantMed Pty Ltd · Australia<br>
        <a href="https://instantmed.com.au/privacy" style="color: #999;">Privacy</a> · 
        <a href="https://instantmed.com.au/terms" style="color: #999;">Terms</a>
      </p>
    </body>
    </html>
  `

  return sendViaResend({
    to,
    subject: `Your prescription for ${medicationName} is ready 💊`,
    html,
    tags: [
      { name: "category", value: "prescription" },
      { name: "request_id", value: requestId },
    ],
  })
}

/**
 * Send reminder for prescription refill
 */
export async function sendRefillReminderEmail(
  to: string,
  patientName: string,
  medicationName: string,
  daysUntilEmpty: number
): Promise<{ success: boolean }> {
  const urgencyText = daysUntilEmpty <= 3 
    ? "Your supply is running low!" 
    : `You have about ${daysUntilEmpty} days of supply remaining.`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://instantmed.com.au/logo.png" alt="InstantMed" style="height: 40px;" />
      </div>
      
      <div style="background: ${daysUntilEmpty <= 3 ? '#fef3c7' : '#f0f9ff'}; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <span style="font-size: 48px;">${daysUntilEmpty <= 3 ? '⚠️' : '💊'}</span>
        <h1 style="color: ${daysUntilEmpty <= 3 ? '#92400e' : '#1e40af'}; font-size: 24px; margin: 16px 0 0 0;">Time to refill your prescription</h1>
      </div>
      
      <p>Hi ${patientName},</p>
      
      <p>${urgencyText}</p>
      
      <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0;"><strong>Medication:</strong> ${medicationName}</p>
      </div>
      
      <p>Request a repeat prescription now to avoid running out.</p>
      
      <p>
        <a href="https://instantmed.com.au/prescriptions?refill=${encodeURIComponent(medicationName)}" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          Request Repeat Prescription
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Most repeat prescriptions are processed within 2 hours.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        Don't want refill reminders? <a href="https://instantmed.com.au/patient/settings" style="color: #999;">Update your preferences</a><br><br>
        InstantMed Pty Ltd · Australia
      </p>
    </body>
    </html>
  `

  return sendViaResend({
    to,
    subject: `Reminder: Time to refill ${medicationName}`,
    html,
    tags: [{ name: "category", value: "refill_reminder" }],
  })
}
