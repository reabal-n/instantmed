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
  return `Payment received, ${amount} for your ${requestType} ✅`
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
    <BaseEmail previewText={`Payment received, ${amount} for your ${requestType} ✅`} appUrl={appUrl}>
      <StatusBanner title="Payment received ✅" variant="success" />

      <Text>Hi {firstName},</Text>
      <Text>
        Got it. <strong>{amount}</strong> received for your {requestType}.
        A doctor will review it shortly and we&apos;ll email you when it&apos;s done.
      </Text>

      <Box>
        <DetailRow label="Reference" value={requestId.slice(0, 8).toUpperCase()} />
        <DetailRow label="Amount" value={amount} />
      </Box>

      <Button href={`${appUrl}/track/${requestId}`}>Track your request</Button>

      <Text muted small>
        Need a tax invoice? Grab it from your{" "}
        <a href={`${appUrl}/patient`} style={{ color: colors.accent, fontWeight: 500 }}>
          dashboard
        </a>
        .
      </Text>

    </BaseEmail>
  )
}
