/**
 * Payment Receipt Email Template
 *
 * Sent to patient after successful payment.
 * Confirms the transaction and provides a reference.
 */

import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  Box,
  Heading,
  DetailRow,
  colors,
} from "../base-email"

export interface PaymentReceiptEmailProps {
  patientName: string
  serviceName: string
  amount: string
  intakeRef: string
  paidAt: string
  dashboardUrl: string
  appUrl?: string
}

export function PaymentReceiptEmail({
  patientName,
  serviceName,
  amount,
  intakeRef,
  paidAt,
  dashboardUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PaymentReceiptEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText={`Payment confirmed, ${amount} for ${serviceName} ✅`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="Payment confirmed"
        subtitle={`${amount} · ${serviceName}`}
        variant="success"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        We&apos;ve received your payment of <strong>{amount}</strong> for{" "}
        <strong>{serviceName}</strong>. A doctor will review your request shortly.
      </Text>

      <Box>
        <Heading as="h3">Receipt Details</Heading>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <tbody>
            <DetailRow label="Service" value={serviceName} bold />
            <DetailRow label="Amount" value={amount} bold />
            <DetailRow label="Reference" value={intakeRef} mono />
            <DetailRow label="Date" value={paidAt} />
          </tbody>
        </table>
      </Box>

      <Button href={dashboardUrl}>Track Your Request</Button>

      <Text muted small>
        This receipt is for your records. You can view your request status on your{" "}
        <a href={dashboardUrl} style={{ color: colors.accent, fontWeight: 500 }}>
          dashboard
        </a>
        .
      </Text>

    </BaseEmail>
  )
}

export function paymentReceiptEmailSubject(serviceName: string) {
  return `Payment confirmed: ${serviceName}`
}
