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
        but didn&apos;t complete checkout. No worries — your information is saved
        and ready when you are.
      </p>

      <div style={{ textAlign: "center" }}>
        <a href={resumeUrl} className="button">
          Resume your request
        </a>
      </div>

      <div style={{ background: "#F5F5F4", borderRadius: "8px", padding: "16px 20px", margin: "20px 0", border: "1px solid #E7E5E4" }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600, color: "#1C1917" }}>What happens when you complete checkout?</h3>
        <ul style={{ margin: 0 }}>
          <li>A doctor reviews your request (usually within an hour)</li>
          <li>You&apos;ll receive your document via email</li>
          <li>No phone call required for most requests</li>
        </ul>
      </div>

      <p style={{ fontSize: "13px", color: "#78716C" }}>
        Questions? Just reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: "#0D9488", fontWeight: 500, textDecoration: "none" }}>help center</a>.
      </p>

      <p style={{ fontSize: "12px", color: "#A8A29E" }}>
        If you&apos;ve already completed your request or no longer need it,
        you can safely ignore this email.
      </p>
    </BaseLayout>
  )
}

/**
 * Legacy HTML render function — kept for backward compatibility with email dispatcher.
 */
export function renderAbandonedCheckoutEmail(props: AbandonedCheckoutEmailProps): string {
  const { patientName, serviceName, resumeUrl, appUrl = APP_URL, hoursAgo } = props

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #44403C; margin: 0; padding: 0; background-color: #FAFAF9; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAFAF9;">
    <tr>
      <td style="padding: 48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E7E5E4; overflow: hidden;">
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <a href="${appUrl}" style="text-decoration: none; font-size: 17px; font-weight: 700; color: #0C1220; letter-spacing: -0.4px;">Instant<span style="color: #0D9488;">Med</span></a>
            </td>
          </tr>
          <tr><td style="padding: 20px 40px 0 40px;"><div style="border-top: 1px solid #F5F5F4;"></div></td></tr>
          <tr>
            <td style="padding: 28px 40px 36px 40px;">
              <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 16px 0; letter-spacing: -0.4px;">Your request is waiting</h1>
              <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">Hi ${patientName},</p>
              <p style="font-size: 15px; color: #44403C; margin: 0 0 20px 0;">
                You started a <strong>${serviceName}</strong> request about ${hoursAgo} hours ago
                but didn't complete checkout. No worries — your information is saved and ready when you are.
              </p>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${resumeUrl}" style="display: inline-block; background-color: #0C1220; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Resume your request
                </a>
              </div>

              <div style="background: #F5F5F4; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border: 1px solid #E7E5E4;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1C1917;">What happens when you complete checkout?</p>
                <ul style="margin: 0; padding-left: 18px; color: #44403C; font-size: 14px; line-height: 1.8;">
                  <li style="margin-bottom: 4px;">A doctor reviews your request (usually within an hour)</li>
                  <li style="margin-bottom: 4px;">You'll receive your document via email</li>
                  <li>No phone call required for most requests</li>
                </ul>
              </div>

              <p style="font-size: 12px; color: #A8A29E; margin: 24px 0 0 0;">
                If you've already completed your request or no longer need it, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #F5F5F4; background: #FAFAF9;">
              <p style="color: #A8A29E; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                <a href="${appUrl}/privacy" style="color: #A8A29E; text-decoration: none;">Privacy</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${appUrl}/terms" style="color: #A8A29E; text-decoration: none;">Terms</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${appUrl}/patient/settings" style="color: #A8A29E; text-decoration: none;">Email Preferences</a>
              </p>
              <p style="color: #A8A29E; font-size: 11px; text-align: center; margin: 0;">
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
}
