/**
 * Transactional Email Templates
 *
 * Clean, minimal email templates for request status updates.
 * Design: Warm stone palette, teal accents, premium healthcare aesthetic.
 */

interface BaseEmailProps {
  patientName: string
  dashboardUrl: string
}

interface RequestInReviewEmailProps extends BaseEmailProps {
  serviceType: string
  doctorName?: string
  estimatedTime?: string
}

interface RequestApprovedEmailProps extends BaseEmailProps {
  serviceType: string
  doctorName?: string
}

interface ReEngagementEmailProps extends BaseEmailProps {
  lastVisitDays: number
}

interface CartAbandonmentEmailProps extends BaseEmailProps {
  serviceType: string
  resumeUrl: string
}

const emailShell = (content: string, baseUrl: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #44403C; margin: 0; padding: 0; background-color: #FAFAF9; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAFAF9;">
    <tr>
      <td style="padding: 48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E7E5E4; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <a href="${baseUrl}" style="text-decoration: none; display: inline-block; font-size: 17px; font-weight: 700; color: #0C1220; letter-spacing: -0.4px;">
                Instant<span style="color: #0D9488;">Med</span>
              </a>
            </td>
          </tr>
          <tr><td style="padding: 20px 40px 0 40px;"><div style="border-top: 1px solid #F5F5F4;"></div></td></tr>
          <!-- Content -->
          <tr>
            <td style="padding: 28px 40px 36px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #F5F5F4; background: #FAFAF9;">
              <p style="color: #A8A29E; font-size: 12px; text-align: center; margin: 0 0 10px 0; line-height: 1.8;">
                <a href="${baseUrl}/privacy" style="color: #A8A29E; text-decoration: none;">Privacy</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${baseUrl}/terms" style="color: #A8A29E; text-decoration: none;">Terms</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${baseUrl}/contact" style="color: #A8A29E; text-decoration: none;">Contact</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${baseUrl}/account?tab=notifications" style="color: #A8A29E; text-decoration: none;">Preferences</a>
              </p>
              <p style="color: #A8A29E; font-size: 11px; text-align: center; margin: 0; letter-spacing: 0.02em;">
                InstantMed Pty Ltd &middot; ABN 64 694 559 334 &middot; Australia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

/**
 * Email sent when a request is being reviewed by a doctor
 */
export function renderRequestInReviewEmail({
  patientName,
  dashboardUrl,
  serviceType,
  doctorName,
  estimatedTime = "under an hour",
}: RequestInReviewEmailProps): string {
  const baseUrl = dashboardUrl.split("/patient")[0]

  const content = `
    <!-- Status -->
    <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 14px 20px; margin-bottom: 24px;">
      <p style="color: #0369A1; font-size: 14px; margin: 0; font-weight: 600; line-height: 1.4;">
        Your request is being reviewed
      </p>
    </div>

    <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">Hi ${patientName},</p>

    <p style="font-size: 15px; color: #44403C; margin: 0 0 20px 0;">
      ${doctorName ? `Dr. ${doctorName} is now reviewing` : "A doctor is now reviewing"} your ${serviceType} request.
      We'll email you as soon as there's an update.
    </p>

    <!-- Estimated Time -->
    <div style="background: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 4px 0; font-size: 11px; color: #78716C; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Estimated review time</p>
      <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1C1917;">${estimatedTime}</p>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #A8A29E;">
        Most requests are reviewed within an hour during business hours.
      </p>
    </div>

    <!-- CTA -->
    <div style="margin: 24px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #0C1220; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.01em;">
        Track Your Request
      </a>
    </div>

    <p style="font-size: 13px; color: #A8A29E; margin: 20px 0 0 0;">
      Questions? Reply to this email and we'll get back to you.
    </p>`

  return emailShell(content, baseUrl)
}

/**
 * Email sent when a request is approved
 */
export function renderRequestApprovedEmail({
  patientName,
  dashboardUrl,
  serviceType,
  doctorName,
}: RequestApprovedEmailProps): string {
  const baseUrl = dashboardUrl.split("/patient")[0]

  const content = `
    <!-- Status -->
    <div style="background: #F0FDFA; border: 1px solid #99F6E4; border-radius: 8px; padding: 14px 20px; margin-bottom: 24px;">
      <p style="color: #0F766E; font-size: 14px; margin: 0; font-weight: 600; line-height: 1.4;">
        Your ${serviceType} is ready
      </p>
    </div>

    <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">Hi ${patientName},</p>

    <p style="font-size: 15px; color: #44403C; margin: 0 0 20px 0;">
      ${doctorName ? `Dr. ${doctorName} has reviewed and approved` : "Your"} ${serviceType} request.
      You can now access your document from your dashboard.
    </p>

    <!-- CTA -->
    <div style="margin: 24px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #0C1220; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.01em;">
        View &amp; Download
      </a>
    </div>

    <!-- What's Next -->
    <div style="background: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1C1917;">What happens next?</p>
      <ul style="margin: 0; padding-left: 18px; color: #44403C; font-size: 14px; line-height: 1.8;">
        <li style="margin-bottom: 4px; padding-left: 2px;">Download your document from your dashboard</li>
        <li style="margin-bottom: 4px; padding-left: 2px;">Forward it to your employer, pharmacy, or institution</li>
        <li style="padding-left: 2px;">Keep a copy for your records</li>
      </ul>
    </div>

    <p style="font-size: 13px; color: #A8A29E; margin: 20px 0 0 0;">
      Questions? Reply to this email and we'll get back to you.
    </p>`

  return emailShell(content, baseUrl)
}

/**
 * Re-engagement email for patients who haven't visited in a while
 */
export function renderReEngagementEmail({
  patientName,
  dashboardUrl,
  lastVisitDays,
}: ReEngagementEmailProps): string {
  const baseUrl = dashboardUrl.split("/patient")[0]

  const content = `
    <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">Hi ${patientName},</p>

    <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">
      It's been ${lastVisitDays} days since your last visit. We hope you're doing well.
    </p>

    <p style="font-size: 15px; color: #44403C; margin: 0 0 24px 0;">
      If you need a medical certificate, prescription renewal, or have any health questions,
      we're here to help. Our doctors typically review requests within an hour.
    </p>

    <!-- Services -->
    <div style="background: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1C1917;">How we can help</p>
      <ul style="margin: 0; padding-left: 18px; color: #44403C; font-size: 14px; line-height: 1.8;">
        <li style="margin-bottom: 4px; padding-left: 2px;">Medical certificates for work or study</li>
        <li style="margin-bottom: 4px; padding-left: 2px;">Prescription renewals for ongoing medications</li>
        <li style="padding-left: 2px;">General health consultations</li>
      </ul>
    </div>

    <!-- CTA -->
    <div style="margin: 24px 0;">
      <a href="${baseUrl}/start" style="display: inline-block; background: #0C1220; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.01em;">
        Start a Request
      </a>
    </div>

    <p style="font-size: 12px; color: #A8A29E; margin: 20px 0 0 0;">
      <a href="${baseUrl}/unsubscribe" style="color: #A8A29E; text-decoration: underline;">Unsubscribe</a> from these emails.
    </p>`

  return emailShell(content, baseUrl)
}

/**
 * Cart abandonment email
 */
export function renderCartAbandonmentEmail({
  patientName,
  dashboardUrl,
  serviceType,
  resumeUrl,
}: CartAbandonmentEmailProps): string {
  const baseUrl = dashboardUrl.split("/patient")[0]

  const content = `
    <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">Hi ${patientName},</p>

    <p style="font-size: 15px; color: #44403C; margin: 0 0 20px 0;">
      You started a ${serviceType} request but didn't complete checkout.
      Your information is saved and you can pick up where you left off.
    </p>

    <!-- CTA -->
    <div style="margin: 24px 0;">
      <a href="${resumeUrl}" style="display: inline-block; background: #0C1220; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.01em;">
        Complete Your Request
      </a>
    </div>

    <!-- Trust signals -->
    <div style="background: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #44403C; line-height: 1.8;">
        AHPRA-registered doctors<br>
        Reviewed in under an hour<br>
        Pay only if approved
      </p>
    </div>

    <p style="font-size: 13px; color: #A8A29E; margin: 20px 0 0 0;">
      Need help? Reply to this email.
    </p>`

  return emailShell(content, baseUrl)
}
