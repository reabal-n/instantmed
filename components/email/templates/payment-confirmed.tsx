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
  return `Payment confirmed — ${amount} for your ${requestType}`
}

export function PaymentConfirmedEmail({
  patientName,
  requestType,
  amount,
  requestId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PaymentConfirmedEmailProps) {
  return (
    <BaseEmail previewText={`Payment confirmed — ${amount} for your ${requestType}`} appUrl={appUrl}>
      <StatusBanner title="Payment confirmed" variant="success" />

      <Text>Hi {patientName},</Text>
      <Text>
        We&apos;ve received your payment of <strong>{amount}</strong> for your {requestType} request.
        A doctor will review it shortly.
      </Text>

      <Box>
        <DetailRow label="Reference" value={requestId.slice(0, 8).toUpperCase()} />
        <DetailRow label="Amount" value={amount} />
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`}>Track Your Request</Button>
      </div>

      <Text muted small>
        A receipt has been sent to your email. If you need an invoice for tax purposes,
        you can download it from your{" "}
        <a href={`${appUrl}/patient`} style={{ color: colors.accent, fontWeight: 500 }}>
          dashboard
        </a>
        .
      </Text>
    </BaseEmail>
  )
}
