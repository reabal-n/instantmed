import {
  BaseEmail,
  HeroBlock,
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
    <BaseEmail previewText={`Complete your payment for ${requestType}`} appUrl={appUrl} showFooterReview={false}>
      <HeroBlock
        icon="💳"
        headline="Complete your payment"
        variant="warning"
      />

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

