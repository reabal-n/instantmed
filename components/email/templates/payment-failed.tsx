import {
  BaseEmail,
  StatusBanner,
  Heading,
  Text,
  Button,
  Box,
  List,
  colors,
} from "../base-email"

export interface PaymentFailedEmailProps {
  patientName: string
  serviceName: string
  failureReason: string
  retryUrl: string
  appUrl?: string
}

export function paymentFailedSubject(serviceName: string) {
  return `Heads up — there was a hiccup with your ${serviceName} payment`
}

export function PaymentFailedEmail({
  patientName,
  serviceName,
  failureReason,
  retryUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PaymentFailedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText={`We couldn't process your payment — here's how to fix it ⏱️`} appUrl={appUrl}>
      <StatusBanner title="Payment could not be processed" variant="warning" />

      <Text>Hi {firstName},</Text>
      <Text>
        We weren&apos;t able to process your payment for your <strong>{serviceName}</strong> request.
      </Text>

      <Box>
        <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td>
                <p style={{ margin: "0 0 6px 0", fontWeight: 600, fontSize: "14px", color: "#92400E" }}>
                  What happened:
                </p>
                <p style={{ margin: 0, fontSize: "14px", color: "#92400E" }}>
                  {failureReason}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </Box>

      <Text>
        <strong>Your request is saved</strong> — you can complete payment whenever you&apos;re ready.
      </Text>

      <Button href={retryUrl}>Complete Payment</Button>

      <Box>
        <Heading as="h3">Common reasons for payment issues</Heading>
        <List
          items={[
            "Card expired or incorrect details",
            "Insufficient funds",
            "Bank declined the transaction",
          ]}
        />
        <Text muted small>
          If the issue persists, try a different payment method or contact your bank.
        </Text>
      </Box>

      <Text muted small>
        Questions? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help centre
        </a>
        .
      </Text>
    </BaseEmail>
  )
}
