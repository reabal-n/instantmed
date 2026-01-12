/**
 * Transactional Email Templates
 * 
 * Email templates for request status updates and re-engagement.
 * All templates follow the Lumen Health brand style.
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 24px; font-weight: bold; color: #00C9A7; margin-bottom: 8px;">
        Lumen Health
      </div>
    </div>
    
    <!-- Status Banner -->
    <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 48px;">👨‍⚕️</span>
      <h1 style="color: #1e40af; font-size: 22px; margin: 16px 0 0 0; font-weight: 600;">
        Your request is being reviewed
      </h1>
    </div>
    
    <!-- Greeting -->
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${patientName},</p>
    
    <p style="font-size: 16px; margin-bottom: 24px;">
      ${doctorName ? `Dr. ${doctorName} is now reviewing` : "A doctor is now reviewing"} your ${serviceType} request. 
      We'll email you as soon as there's an update.
    </p>
    
    <!-- Timeline -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 20px;">⏱️</span>
        <div>
          <div style="font-weight: 600; color: #0A0F1C;">Estimated review time</div>
          <div style="color: #475569; font-size: 14px;">${estimatedTime}</div>
        </div>
      </div>
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        Most requests are reviewed within an hour during business hours.
      </p>
    </div>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Track Your Request
      </a>
    </div>
    
    <!-- Help -->
    <p style="font-size: 14px; color: #666; margin-top: 24px;">
      Questions? Just reply to this email.
    </p>
    
    <!-- Footer -->
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px 0;" />
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Lumen Health Pty Ltd · Australia<br>
      <a href="${baseUrl}/privacy" style="color: #9ca3af;">Privacy</a> · <a href="${baseUrl}/terms" style="color: #9ca3af;">Terms</a>
    </p>
  </div>
</body>
</html>`
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 24px; font-weight: bold; color: #00C9A7; margin-bottom: 8px;">
        Lumen Health
      </div>
    </div>
    
    <!-- Success Banner -->
    <div style="background: linear-gradient(135deg, #dcfce7, #d1fae5); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 48px;">✓</span>
      <h1 style="color: #166534; font-size: 22px; margin: 16px 0 0 0; font-weight: 600;">
        Your ${serviceType} is ready
      </h1>
    </div>
    
    <!-- Greeting -->
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${patientName},</p>
    
    <p style="font-size: 16px; margin-bottom: 24px;">
      ${doctorName ? `Dr. ${doctorName} has reviewed and approved` : "Your"} ${serviceType} request. 
      You can now access your document from your dashboard.
    </p>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
        View & Download
      </a>
    </div>
    
    <!-- What's Next -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #0A0F1C; font-size: 16px; font-weight: 600;">What happens next?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
        <li style="margin-bottom: 8px;">Download your document from your dashboard</li>
        <li style="margin-bottom: 8px;">Forward it to your employer, pharmacy, or relevant institution</li>
        <li>Keep a copy for your records</li>
      </ul>
    </div>
    
    <!-- Help -->
    <p style="font-size: 14px; color: #666; margin-top: 24px;">
      Questions? Just reply to this email.
    </p>
    
    <!-- Footer -->
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px 0;" />
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Lumen Health Pty Ltd · Australia<br>
      <a href="${baseUrl}/privacy" style="color: #9ca3af;">Privacy</a> · <a href="${baseUrl}/terms" style="color: #9ca3af;">Terms</a>
    </p>
  </div>
</body>
</html>`
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 24px; font-weight: bold; color: #00C9A7; margin-bottom: 8px;">
        Lumen Health
      </div>
    </div>
    
    <!-- Banner -->
    <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 48px;">👋</span>
      <h1 style="color: #92400e; font-size: 22px; margin: 16px 0 0 0; font-weight: 600;">
        Checking in
      </h1>
    </div>
    
    <!-- Greeting -->
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${patientName},</p>
    
    <p style="font-size: 16px; margin-bottom: 24px;">
      It's been ${lastVisitDays} days since your last visit. We hope you're doing well!
    </p>
    
    <p style="font-size: 16px; margin-bottom: 24px;">
      If you need a medical certificate, prescription renewal, or have any health questions, 
      we're here to help. Our doctors typically review requests within an hour.
    </p>
    
    <!-- Services -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #0A0F1C; font-size: 16px; font-weight: 600;">How we can help</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
        <li style="margin-bottom: 8px;">Medical certificates for work or study</li>
        <li style="margin-bottom: 8px;">Prescription renewals for medications you already take</li>
        <li>General health consultations</li>
      </ul>
    </div>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${baseUrl}/start" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Start a Request
      </a>
    </div>
    
    <!-- Footer -->
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px 0;" />
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Lumen Health Pty Ltd · Australia<br>
      <a href="${baseUrl}/privacy" style="color: #9ca3af;">Privacy</a> · <a href="${baseUrl}/terms" style="color: #9ca3af;">Terms</a><br>
      <a href="${baseUrl}/unsubscribe" style="color: #9ca3af;">Unsubscribe from these emails</a>
    </p>
  </div>
</body>
</html>`
}

/**
 * Cart abandonment email - sent when a user starts checkout but doesn't complete
 */
export function renderCartAbandonmentEmail({
  patientName,
  dashboardUrl,
  serviceType,
  resumeUrl,
}: CartAbandonmentEmailProps): string {
  const baseUrl = dashboardUrl.split("/patient")[0]

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 24px; font-weight: bold; color: #00C9A7; margin-bottom: 8px;">
        Lumen Health
      </div>
    </div>
    
    <!-- Banner -->
    <div style="background: linear-gradient(135deg, #e0e7ff, #c7d2fe); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 48px;">📋</span>
      <h1 style="color: #3730a3; font-size: 22px; margin: 16px 0 0 0; font-weight: 600;">
        Your request is waiting
      </h1>
    </div>
    
    <!-- Greeting -->
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${patientName},</p>
    
    <p style="font-size: 16px; margin-bottom: 24px;">
      You started a ${serviceType} request but didn't complete checkout. 
      No worries — your information is saved and you can pick up where you left off.
    </p>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resumeUrl}" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Complete Your Request
      </a>
    </div>
    
    <!-- Trust signals -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #475569;">
        ✓ AHPRA-registered doctors<br>
        ✓ Reviewed in under 30 minutes<br>
        ✓ Pay only if approved
      </p>
    </div>
    
    <!-- Help -->
    <p style="font-size: 14px; color: #666; margin-top: 24px;">
      Need help? Just reply to this email.
    </p>
    
    <!-- Footer -->
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px 0;" />
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Lumen Health Pty Ltd · Australia<br>
      <a href="${baseUrl}/privacy" style="color: #9ca3af;">Privacy</a> · <a href="${baseUrl}/terms" style="color: #9ca3af;">Terms</a>
    </p>
  </div>
</body>
</html>`
}
