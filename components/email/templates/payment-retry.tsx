import {
  BaseEmail,
  Heading,
  Text,
  Button,
  Box,
} from "../base-email"
export interface PaymentRetryEmailProps {
  patientName: string
  requestType: string
  amount: string
  paymentUrl: string
  appUrl?: string
}

export function paymentRetrySubject() {
  return "Just a heads up: your payment needs another go"
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
        No worries, you can try again using the link below.
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #475569; margin: 0; padding: 0; background-color: #F8F7F4; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #F8F7F4;">
    <tr>
      <td style="padding: 48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              <a href="${baseUrl}" style="text-decoration: none;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 10px;">
                      <img src="${baseUrl}/branding/logo.png" alt="InstantMed" width="36" height="36" style="display: block; border: 0; outline: none; width: 36px; height: 36px; border-radius: 8px;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <img src="${baseUrl}/branding/wordmark.png" alt="InstantMed" width="130" style="display: block; border: 0; outline: none; max-width: 130px; height: auto;" />
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>
          <tr><td style="padding: 0 40px;"><div style="border-top: 1px solid #F1F5F9;"></div></td></tr>
          <tr>
            <td style="padding: 32px 40px 40px 40px;">
              <h1 style="font-size: 24px; font-weight: 600; color: #1E293B; margin: 0 0 16px 0; letter-spacing: -0.5px;">Complete your payment</h1>
              <p style="font-size: 15px; color: #475569; margin: 0 0 16px 0;">Hi ${patientName},</p>
              <p style="font-size: 15px; color: #475569; margin: 0 0 24px 0;">
                We noticed your previous payment for your ${requestType} request didn't go through. No worries, you can try again using the link below.
              </p>
              <div style="background: #F5F7F9; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px 24px; margin: 0 0 24px 0;">
                <p style="margin: 0; font-size: 14px; color: #475569;"><strong style="color: #1E293B;">Amount due:</strong> ${amount}</p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${paymentUrl}" style="display: inline-block; background: #2563EB; color: #ffffff; padding: 16px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 2px 8px rgba(37,99,235,0.25);">Complete Payment</a>
              </div>
              <p style="font-size: 13px; color: #94A3B8; margin: 20px 0 0 0;">
                If you're having trouble, ensure your card details are correct and you have sufficient funds. Need help? Just reply to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #F1F5F9; background: #F8F7F4;">
              <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 0 0 6px 0;">
                Made with care in Australia 🌤️
              </p>
              <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                <a href="${baseUrl}/privacy" style="color: #94A3B8; text-decoration: none;">Privacy</a>
                <span style="margin: 0 6px; color: #E2E8F0;">&middot;</span>
                <a href="${baseUrl}/terms" style="color: #94A3B8; text-decoration: none;">Terms</a>
                <span style="margin: 0 6px; color: #E2E8F0;">&middot;</span>
                <a href="${baseUrl}/contact" style="color: #94A3B8; text-decoration: none;">Contact</a>
                <span style="margin: 0 6px; color: #E2E8F0;">&middot;</span>
                <a href="${baseUrl}/patient/settings" style="color: #94A3B8; text-decoration: none;">Preferences</a>
              </p>
              <p style="color: #94A3B8; font-size: 11px; text-align: center; margin: 0;">
                InstantMed Pty Ltd &middot; ABN 64 694 559 334
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
