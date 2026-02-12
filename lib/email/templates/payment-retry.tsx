import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface PaymentRetryEmailProps {
  patientName: string
  requestType: string
  amount: string
  paymentUrl: string
}

export function renderPaymentRetryEmailToHtml(props: PaymentRetryEmailProps): string {
  const { patientName, requestType, amount, paymentUrl } = props
  const baseUrl = paymentUrl.split("/checkout")[0] || "https://instantmed.com.au"

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
              <a href="${baseUrl}" style="text-decoration: none; font-size: 18px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.3px;">InstantMed</a>
            </td>
          </tr>
          <tr><td style="padding: 0 32px;"><div style="border-top: 1px solid #F3F4F6;"></div></td></tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              <p style="font-size: 20px; font-weight: 700; color: #1A1A1A; margin: 0 0 16px 0;">Complete your payment</p>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px 0;">Hi ${patientName},</p>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 24px 0;">
                We noticed your previous payment for your ${requestType} request didn't go through. No worries — you can try again using the link below.
              </p>
              <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                <p style="margin: 0; font-size: 14px; color: #4B5563;"><strong>Amount due:</strong> ${amount}</p>
              </div>
              <div style="margin: 24px 0;">
                <a href="${paymentUrl}" style="display: inline-block; background: #1A1A1A; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Complete Payment</a>
              </div>
              <p style="font-size: 13px; color: #9CA3AF; margin: 20px 0 0 0;">
                If you're having trouble, ensure your card details are correct and you have sufficient funds. Need help? Just reply to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #F3F4F6; background: #FAFAFA;">
              <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                <a href="${baseUrl}/privacy" style="color: #9CA3AF; text-decoration: underline;">Privacy</a>
                &middot;
                <a href="${baseUrl}/terms" style="color: #9CA3AF; text-decoration: underline;">Terms</a>
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
}

export function PaymentRetryEmail({ patientName, requestType, amount, paymentUrl }: PaymentRetryEmailProps) {
  return (
    <BaseLayout previewText={`Complete your payment for ${requestType}`} appUrl={APP_URL}>
      <h1>Complete your payment</h1>
      <p>Hi {patientName},</p>
      <p>
        We noticed your previous payment for your {requestType} request didn&apos;t go through. 
        No worries -- you can try again using the link below.
      </p>

      <div className="info-box">
        <p style={{ margin: 0, fontSize: "14px" }}>
          <strong>Amount due:</strong> {amount}
        </p>
      </div>

      <p>
        <a href={paymentUrl} className="button">
          Complete Payment
        </a>
      </p>

      <p style={{ fontSize: "13px", color: "#6b7280" }}>
        If you&apos;re having trouble with your payment, please ensure your card details are correct 
        and that you have sufficient funds. You can also try a different payment method.
      </p>

      <p style={{ fontSize: "13px", color: "#6b7280" }}>
        Need help? Just reply to this email and we&apos;ll assist you.
      </p>
    </BaseLayout>
  )
}
