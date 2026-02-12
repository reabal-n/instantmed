import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface AbandonedCheckoutEmailProps {
  patientName: string
  serviceName: string
  resumeUrl: string
  appUrl?: string
  hoursAgo: number
}

/**
 * Abandoned Checkout Email
 * 
 * Sent when a patient starts a request but doesn't complete payment.
 * Uses the React BaseLayout system for consistent styling.
 */
export function AbandonedCheckoutEmail({
  patientName,
  serviceName,
  resumeUrl,
  appUrl = APP_URL,
  hoursAgo,
}: AbandonedCheckoutEmailProps) {
  return (
    <BaseLayout previewText={`Your ${serviceName} request is waiting`} appUrl={appUrl}>
      <h1>Your request is waiting</h1>
      <p>Hi {patientName},</p>
      <p>
        You started a <strong>{serviceName}</strong> request about {hoursAgo} hours ago 
        but didn&apos;t complete checkout. No worries -- your information is saved 
        and ready when you are.
      </p>

      <p>
        <a href={resumeUrl} className="button">
          Resume your request
        </a>
      </p>

      <div className="info-box">
        <h3 style={{ margin: "0 0 12px 0", fontSize: "15px" }}>What happens when you complete checkout?</h3>
        <ul style={{ margin: 0, paddingLeft: "20px", color: "#475569" }}>
          <li>A doctor reviews your request (usually within an hour)</li>
          <li>You&apos;ll receive your document via email</li>
          <li>No phone call required for most requests</li>
        </ul>
      </div>

      <p style={{ fontSize: "13px", color: "#6b7280" }}>
        Questions? Just reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: "#0A0F1C", fontWeight: 500 }}>help center</a>.
      </p>

      <p style={{ fontSize: "12px", color: "#9ca3af" }}>
        If you&apos;ve already completed your request or no longer need it, 
        you can safely ignore this email.
      </p>
    </BaseLayout>
  )
}

/**
 * Legacy HTML render function -- kept for backward compatibility with email dispatcher.
 * Delegates to the React component internally.
 */
export function renderAbandonedCheckoutEmail(props: AbandonedCheckoutEmailProps): string {
  // This function is imported by the email dispatcher which expects an HTML string.
  // The dispatcher should be updated to use renderEmailToHtml(AbandonedCheckoutEmail, props)
  // For now, return a minimal HTML string that the dispatcher can use.
  const { patientName, serviceName, resumeUrl, appUrl = APP_URL, hoursAgo } = props

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #0A0F1C; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #fafafa;">
  <div style="background: #ffffff; border-radius: 12px; padding: 40px 32px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="${appUrl}/branding/logo.svg" alt="InstantMed" style="height: 28px;" />
    </div>

    <h1 style="color: #0A0F1C; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; line-height: 1.3;">Your request is waiting</h1>
    
    <p style="font-size: 15px; color: #374151; margin: 0 0 16px 0;">Hi ${patientName},</p>
    
    <p style="font-size: 15px; color: #374151; margin: 0 0 20px 0;">
      You started a <strong>${serviceName}</strong> request about ${hoursAgo} hours ago 
      but didn't complete checkout. No worries -- your information is saved and ready when you are.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${resumeUrl}" style="display: inline-block; background-color: #0A0F1C; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
        Resume your request
      </a>
    </div>

    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #0A0F1C;">What happens when you complete checkout?</p>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
        <li style="margin-bottom: 6px;">A doctor reviews your request (usually within an hour)</li>
        <li style="margin-bottom: 6px;">You'll receive your document via email</li>
        <li>No phone call required for most requests</li>
      </ul>
    </div>

    <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0 0;">
      If you've already completed your request or no longer need it, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 28px 0 20px 0;" />
    
    <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0; line-height: 1.6;">
      InstantMed Pty Ltd &middot; Australia<br>
      <a href="${appUrl}/privacy" style="color: #9ca3af; text-decoration: underline;">Privacy</a> &middot; 
      <a href="${appUrl}/terms" style="color: #9ca3af; text-decoration: underline;">Terms</a> &middot;
      <a href="${appUrl}/patient/settings" style="color: #9ca3af; text-decoration: underline;">Email Preferences</a>
    </p>
  </div>
</body>
</html>`
}
