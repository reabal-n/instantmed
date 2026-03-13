import {
  BaseEmail,
  StatusBanner,
  Text,
  Button,
  Box,
  DetailRow,
  colors,
} from "../base-email"

export interface PaymentConfirmedEmailProps {
  patientName: string
  requestType: string
  amount: string
  requestId: string
  appUrl?: string
}

export function paymentConfirmedSubject(requestType: string, amount: string) {
  return `Payment confirmed — ${amount} for your ${requestType} ✅`
}

export function PaymentConfirmedEmail({
  patientName,
  requestType,
  amount,
  requestId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PaymentConfirmedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText={`Payment confirmed — ${amount} for your ${requestType}`} appUrl={appUrl}>
      <StatusBanner title="Payment confirmed" variant="success" />

      <Text>Hi {firstName},</Text>
      <Text>
        We&apos;ve received your payment of <strong>{amount}</strong> for your{" "}
        {requestType} request. A doctor will review it shortly — we&apos;ll be
        in touch the moment there&apos;s an update.
      </Text>

      <Box>
        <DetailRow label="Reference" value={requestId.slice(0, 8).toUpperCase()} />
        <DetailRow label="Amount" value={amount} />
      </Box>

      <Button href={`${appUrl}/patient/intakes/${requestId}`}>Track Your Request</Button>

      <Text muted small>
        A receipt has been sent to your email. Need an invoice for tax purposes?
        Download it from your{" "}
        <a href={`${appUrl}/patient`} style={{ color: colors.accent, fontWeight: 500 }}>
          dashboard
        </a>
        .
      </Text>

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
