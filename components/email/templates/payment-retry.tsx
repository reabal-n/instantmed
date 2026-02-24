import {
  BaseEmail,
  Heading,
  Text,
  Button,
  Box,
  colors,
} from "../base-email"

export interface PaymentRetryEmailProps {
  patientName: string
  requestType: string
  amount: string
  paymentUrl: string
  appUrl?: string
}

export function paymentRetrySubject() {
  return "Complete your InstantMed payment"
}

export function PaymentRetryEmail({
  patientName,
  requestType,
  amount,
  paymentUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PaymentRetryEmailProps) {
  return (
    <BaseEmail previewText={`Complete your payment for ${requestType}`} appUrl={appUrl}>
      <Heading>Complete your payment</Heading>

      <Text>Hi {patientName},</Text>
      <Text>
        We noticed your previous payment for your {requestType} request didn&apos;t go through.
        No worries — you can try again using the link below.
      </Text>

      <Box>
        <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td>
                <p style={{ margin: 0, fontSize: "14px", color: "#44403C" }}>
                  <strong style={{ color: "#1C1917" }}>Amount due:</strong> {amount}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={paymentUrl}>Complete Payment</Button>
      </div>

      <Text muted small>
        If you&apos;re having trouble, ensure your card details are correct and you have
        sufficient funds. Need help? Just reply to this email.
      </Text>
    </BaseEmail>
  )
}

/**
 * Render the email to an HTML string (used by retry-payment API route)
 */
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #44403C; margin: 0; padding: 0; background-color: #FAFAF9; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAFAF9;">
    <tr>
      <td style="padding: 48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E7E5E4; overflow: hidden;">
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <a href="${baseUrl}" style="text-decoration: none; font-size: 17px; font-weight: 700; color: #0C1220; letter-spacing: -0.4px;">Instant<span style="color: #0D9488;">Med</span></a>
            </td>
          </tr>
          <tr><td style="padding: 20px 40px 0 40px;"><div style="border-top: 1px solid #F5F5F4;"></div></td></tr>
          <tr>
            <td style="padding: 28px 40px 36px 40px;">
              <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 16px 0; letter-spacing: -0.4px;">Complete your payment</h1>
              <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">Hi ${patientName},</p>
              <p style="font-size: 15px; color: #44403C; margin: 0 0 24px 0;">
                We noticed your previous payment for your ${requestType} request didn't go through. No worries — you can try again using the link below.
              </p>
              <div style="background: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 8px; padding: 14px 20px; margin: 0 0 24px 0;">
                <p style="margin: 0; font-size: 14px; color: #44403C;"><strong style="color: #1C1917;">Amount due:</strong> ${amount}</p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${paymentUrl}" style="display: inline-block; background: #0C1220; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Complete Payment</a>
              </div>
              <p style="font-size: 13px; color: #A8A29E; margin: 20px 0 0 0;">
                If you're having trouble, ensure your card details are correct and you have sufficient funds. Need help? Just reply to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #F5F5F4; background: #FAFAF9;">
              <p style="color: #A8A29E; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                <a href="${baseUrl}/privacy" style="color: #A8A29E; text-decoration: none;">Privacy</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${baseUrl}/terms" style="color: #A8A29E; text-decoration: none;">Terms</a>
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
