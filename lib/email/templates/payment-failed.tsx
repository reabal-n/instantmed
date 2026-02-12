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
        <p style={{ margin: 0, fontWeight: 500 }}>What happened:</p>
        <p style={{ margin: "8px 0 0 0" }}>{failureReason}</p>
      </div>

      <p>
        <strong>Your request is saved</strong> -- you can complete payment whenever you&apos;re ready.
      </p>

      <p>
        <a href={retryUrl} className="button">
          Complete Payment
        </a>
      </p>

      <div className="info-box">
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>Common reasons for payment issues:</p>
        <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", fontSize: "14px" }}>
          <li>Card expired or incorrect details</li>
          <li>Insufficient funds</li>
          <li>Bank declined the transaction</li>
        </ul>
        <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>
          If the issue persists, try a different payment method or contact your bank.
        </p>
      </div>

      <p style={{ fontSize: "13px", color: "#9CA3AF" }}>
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1A1A1A; margin: 0; padding: 0; background-color: #F8F9FA; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #F8F9FA;">
    <tr>
      <td style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px 20px 32px;">
              <a href="${APP_URL}" style="text-decoration: none; font-size: 18px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.3px;">InstantMed</a>
            </td>
          </tr>
          <tr><td style="padding: 0 32px;"><div style="border-top: 1px solid #F3F4F6;"></div></td></tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              <h1 style="font-size: 20px; font-weight: 600; color: #1A1A1A; margin: 0 0 16px 0; letter-spacing: -0.2px;">Payment could not be processed</h1>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px 0;">Hi ${patientName},</p>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 20px 0;">We weren't able to process your payment for your <strong>${serviceName}</strong> request.</p>
              
              <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #92400E;">What happened:</p>
                <p style="margin: 0; font-size: 14px; color: #92400E;">${failureReason}</p>
              </div>
              
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 24px 0;"><strong>Your request is saved</strong> -- you can complete payment whenever you're ready.</p>
              
              <div style="margin: 24px 0;">
                <a href="${retryUrl}" style="display: inline-block; background: #1A1A1A; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Complete Payment</a>
              </div>
              
              <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1A1A1A;">Common reasons:</p>
                <ul style="margin: 0; padding-left: 20px; color: #4B5563; font-size: 13px; line-height: 1.7;">
                  <li style="margin-bottom: 4px;">Card expired or incorrect details</li>
                  <li style="margin-bottom: 4px;">Insufficient funds</li>
                  <li>Bank declined the transaction</li>
                </ul>
              </div>
              
              <p style="font-size: 13px; color: #9CA3AF; margin: 20px 0 0 0;">Need help? Reply to this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #F3F4F6; background: #FAFAFA;">
              <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                <a href="${APP_URL}/privacy" style="color: #9CA3AF; text-decoration: underline;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="${APP_URL}/terms" style="color: #9CA3AF; text-decoration: underline;">Terms</a>
              </p>
              <p style="color: #9CA3AF; font-size: 11px; text-align: center; margin: 0;">InstantMed Pty Ltd &middot; ABN 64 694 559 334 &middot; Australia</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
