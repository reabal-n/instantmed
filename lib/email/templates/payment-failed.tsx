import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface PaymentFailedEmailProps {
  patientName: string
  serviceName: string
  failureReason: string
  retryUrl: string
}

export function PaymentFailedEmail({ patientName, serviceName, failureReason, retryUrl }: PaymentFailedEmailProps) {
  return (
    <BaseLayout previewText={`Payment issue with your ${serviceName} request`} appUrl={APP_URL}>
      <h1>Payment could not be processed</h1>
      <p>Hi {patientName},</p>
      <p>
        We weren&apos;t able to process your payment for your <strong>{serviceName}</strong> request.
      </p>

      <div className="warning-box">
        <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "#92400E" }}>What happened:</p>
        <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#92400E" }}>{failureReason}</p>
      </div>

      <p>
        <strong>Your request is saved</strong> — you can complete payment whenever you&apos;re ready.
      </p>

      <div style={{ textAlign: "center" }}>
        <a href={retryUrl} className="button">
          Complete Payment
        </a>
      </div>

      <div style={{ background: "#F5F5F4", borderRadius: "8px", padding: "16px 20px", margin: "20px 0", border: "1px solid #E7E5E4" }}>
        <p style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 600, color: "#1C1917" }}>Common reasons for payment issues:</p>
        <ul style={{ margin: 0, fontSize: "13px" }}>
          <li>Card expired or incorrect details</li>
          <li>Insufficient funds</li>
          <li>Bank declined the transaction</li>
        </ul>
        <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#78716C" }}>
          If the issue persists, try a different payment method or contact your bank.
        </p>
      </div>

      <p style={{ fontSize: "13px", color: "#A8A29E" }}>
        Need help? Reply to this email and we&apos;ll assist you.
      </p>
    </BaseLayout>
  )
}

export function renderPaymentFailedEmail(props: PaymentFailedEmailProps): string {
  const { patientName, serviceName, failureReason, retryUrl } = props

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
              <a href="${APP_URL}" style="text-decoration: none; font-size: 17px; font-weight: 700; color: #0C1220; letter-spacing: -0.4px;">Instant<span style="color: #0D9488;">Med</span></a>
            </td>
          </tr>
          <tr><td style="padding: 20px 40px 0 40px;"><div style="border-top: 1px solid #F5F5F4;"></div></td></tr>
          <tr>
            <td style="padding: 28px 40px 36px 40px;">
              <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 16px 0; letter-spacing: -0.4px;">Payment could not be processed</h1>
              <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">Hi ${patientName},</p>
              <p style="font-size: 15px; color: #44403C; margin: 0 0 20px 0;">We weren't able to process your payment for your <strong>${serviceName}</strong> request.</p>

              <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px 20px; margin: 0 0 20px 0;">
                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #92400E;">What happened:</p>
                <p style="margin: 0; font-size: 14px; color: #92400E;">${failureReason}</p>
              </div>

              <p style="font-size: 15px; color: #44403C; margin: 0 0 24px 0;"><strong>Your request is saved</strong> — you can complete payment whenever you're ready.</p>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${retryUrl}" style="display: inline-block; background: #0C1220; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Complete Payment</a>
              </div>

              <div style="background: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1C1917;">Common reasons:</p>
                <ul style="margin: 0; padding-left: 18px; color: #44403C; font-size: 13px; line-height: 1.8;">
                  <li style="margin-bottom: 4px;">Card expired or incorrect details</li>
                  <li style="margin-bottom: 4px;">Insufficient funds</li>
                  <li>Bank declined the transaction</li>
                </ul>
              </div>

              <p style="font-size: 13px; color: #A8A29E; margin: 20px 0 0 0;">Need help? Reply to this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #F5F5F4; background: #FAFAF9;">
              <p style="color: #A8A29E; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                <a href="${APP_URL}/privacy" style="color: #A8A29E; text-decoration: none;">Privacy</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${APP_URL}/terms" style="color: #A8A29E; text-decoration: none;">Terms</a>
              </p>
              <p style="color: #A8A29E; font-size: 11px; text-align: center; margin: 0;">InstantMed Pty Ltd &middot; ABN 64 694 559 334 &middot; Australia</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
