/**
 * Transactional Email Templates
 * 
 * Clean, minimal email templates for request status updates.
 * Design: Dark primary buttons, clean typography, no emojis,
 * subtle borders instead of heavy gradients.
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
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1A1A1A; margin: 0; padding: 0; background-color: #F8F9FA; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #F8F9FA;">
    <tr>
      <td style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px;">
              <a href="${baseUrl}" style="text-decoration: none; font-size: 18px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.3px;">
                InstantMed
              </a>
            </td>
          </tr>
          <tr><td style="padding: 0 32px;"><div style="border-top: 1px solid #F3F4F6;"></div></td></tr>
          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #F3F4F6; background: #FAFAFA;">
              <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0 0 8px 0; line-height: 1.6;">
                <a href="${baseUrl}/privacy" style="color: #9CA3AF; text-decoration: underline;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="${baseUrl}/terms" style="color: #9CA3AF; text-decoration: underline;">Terms</a>
                &nbsp;&middot;&nbsp;
                <a href="${baseUrl}/contact" style="color: #9CA3AF; text-decoration: underline;">Contact</a>
                &nbsp;&middot;&nbsp;
                <a href="${baseUrl}/account?tab=notifications" style="color: #9CA3AF; text-decoration: underline;">Preferences</a>
              </p>
              <p style="color: #9CA3AF; font-size: 11px; text-align: center; margin: 0;">
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
  estimatedTime = "under 30 minutes",
}: RequestInReviewEmailProps): string {
  const baseUrl = dashboardUrl.split("/patient")[0]

  const content = `
    <!-- Status -->
    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="color: #2563EB; font-size: 15px; margin: 0; font-weight: 600; line-height: 1.4;">
        Your request is being reviewed
      </p>
    </div>
    
    <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px 0;">Hi ${patientName},</p>
    
    <p style="font-size: 15px; color: #4B5563; margin: 0 0 20px 0;">
      ${doctorName ? `Dr. ${doctorName} is now reviewing` : "A doctor is now reviewing"} your ${serviceType} request. 
      We'll email you as soon as there's an update.
    </p>
    
    <!-- Estimated Time -->
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #9CA3AF; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Estimated review time</p>
      <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1A1A1A;">${estimatedTime}</p>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #9CA3AF;">
        Most requests are reviewed within an hour during business hours.
      </p>
    </div>
    
    <!-- CTA -->
    <div style="margin: 24px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #1A1A1A; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Track Your Request
      </a>
    </div>
    
    <p style="font-size: 13px; color: #9CA3AF; margin: 20px 0 0 0;">
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
    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="color: #059669; font-size: 15px; margin: 0; font-weight: 600; line-height: 1.4;">
        Your ${serviceType} is ready
      </p>
    </div>
    
    <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px 0;">Hi ${patientName},</p>
    
    <p style="font-size: 15px; color: #4B5563; margin: 0 0 20px 0;">
      ${doctorName ? `Dr. ${doctorName} has reviewed and approved` : "Your"} ${serviceType} request. 
      You can now access your document from your dashboard.
    </p>
    
    <!-- CTA -->
    <div style="margin: 24px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #1A1A1A; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        View & Download
      </a>
    </div>
    
    <!-- What's Next -->
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1A1A1A;">What happens next?</p>
      <ul style="margin: 0; padding-left: 20px; color: #4B5563; font-size: 13px; line-height: 1.7;">
        <li style="margin-bottom: 4px;">Download your document from your dashboard</li>
        <li style="margin-bottom: 4px;">Forward it to your employer, pharmacy, or institution</li>
        <li>Keep a copy for your records</li>
      </ul>
    </div>
    
    <p style="font-size: 13px; color: #9CA3AF; margin: 20px 0 0 0;">
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
    <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px 0;">Hi ${patientName},</p>
    
    <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px 0;">
      It's been ${lastVisitDays} days since your last visit. We hope you're doing well.
    </p>
    
    <p style="font-size: 15px; color: #4B5563; margin: 0 0 24px 0;">
      If you need a medical certificate, prescription renewal, or have any health questions, 
      we're here to help. Our doctors typically review requests within an hour.
    </p>
    
    <!-- Services -->
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1A1A1A;">How we can help</p>
      <ul style="margin: 0; padding-left: 20px; color: #4B5563; font-size: 13px; line-height: 1.7;">
        <li style="margin-bottom: 4px;">Medical certificates for work or study</li>
        <li style="margin-bottom: 4px;">Prescription renewals for ongoing medications</li>
        <li>General health consultations</li>
      </ul>
    </div>
    
    <!-- CTA -->
    <div style="margin: 24px 0;">
      <a href="${baseUrl}/start" style="display: inline-block; background: #1A1A1A; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Start a Request
      </a>
    </div>
    
    <p style="font-size: 12px; color: #9CA3AF; margin: 20px 0 0 0;">
      <a href="${baseUrl}/unsubscribe" style="color: #9CA3AF; text-decoration: underline;">Unsubscribe</a> from these emails.
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
    <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px 0;">Hi ${patientName},</p>
    
    <p style="font-size: 15px; color: #4B5563; margin: 0 0 20px 0;">
      You started a ${serviceType} request but didn't complete checkout. 
      Your information is saved and you can pick up where you left off.
    </p>
    
    <!-- CTA -->
    <div style="margin: 24px 0;">
      <a href="${resumeUrl}" style="display: inline-block; background: #1A1A1A; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Complete Your Request
      </a>
    </div>
    
    <!-- Trust signals -->
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 13px; color: #4B5563; line-height: 1.8;">
        AHPRA-registered doctors<br>
        Reviewed in under 30 minutes<br>
        Pay only if approved
      </p>
    </div>
    
    <p style="font-size: 13px; color: #9CA3AF; margin: 20px 0 0 0;">
      Need help? Reply to this email.
    </p>`

  return emailShell(content, baseUrl)
}
