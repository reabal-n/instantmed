interface AbandonedCheckoutEmailProps {
  patientName: string
  serviceName: string
  resumeUrl: string
  appUrl: string
  hoursAgo: number
}

export function renderAbandonedCheckoutEmail(props: AbandonedCheckoutEmailProps): string {
  const { patientName, serviceName, resumeUrl, appUrl, hoursAgo } = props

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${appUrl}/branding/logo.png" alt="InstantMed" style="height: 40px;" />
        </div>
        
        <!-- Reminder Banner -->
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <span style="font-size: 36px;">⏳</span>
          <h1 style="color: #92400e; font-size: 22px; margin: 12px 0 0 0;">
            Your request is waiting
          </h1>
        </div>
        
        <!-- Greeting -->
        <p style="font-size: 16px; color: #374151;">Hi ${patientName},</p>
        
        <p style="font-size: 16px; color: #374151;">
          You started a <strong>${serviceName}</strong> request about ${hoursAgo} hours ago 
          but didn't complete checkout. No worries — your information is saved 
          and ready when you are.
        </p>
        
        <!-- Resume Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resumeUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Resume your request
          </a>
        </div>
        
        <!-- What happens next -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; color: #0A0F1C; font-size: 16px;">What happens when you complete checkout?</h3>
          <ul style="margin: 0; padding-left: 20px; color: #475569;">
            <li>A doctor reviews your request (usually within an hour)</li>
            <li>You'll receive your document via email</li>
            <li>No phone call required for most requests</li>
          </ul>
        </div>
        
        <!-- Help -->
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          Questions? Just reply to this email or visit our 
          <a href="${appUrl}/contact" style="color: #00C9A7;">help center</a>.
        </p>
        
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
          If you've already completed your request or no longer need it, 
          you can safely ignore this email.
        </p>
        
        <!-- Footer -->
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px 0;" />
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          InstantMed Pty Ltd · Australia<br>
          <a href="${appUrl}/privacy" style="color: #9ca3af;">Privacy</a> · 
          <a href="${appUrl}/terms" style="color: #9ca3af;">Terms</a> ·
          <a href="${appUrl}/patient/settings" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `
}
