/**
 * Refund Issued Email Template
 *
 * Sent to patient when a refund has been processed for their request.
 */

import * as React from "react"

import {
  BaseEmail,
  Box,
  Button,
  Heading,
  HeroBlock,
  Text,
} from "../base-email"

export interface RefundIssuedEmailProps {
  patientName: string
  requestType: string
  requestId: string
  amountFormatted?: string
  appUrl?: string
}

export function RefundIssuedEmail({
  patientName,
  requestType,
  requestId,
  amountFormatted,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: RefundIssuedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText={`Your ${requestType} refund has been processed ✅`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="Refund processed"
        subtitle={amountFormatted || "Your payment is being returned"}
        variant="success"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        We&apos;ve processed a refund for your{" "}
        <strong>{requestType}</strong> request.
        {amountFormatted
          ? ` ${amountFormatted} will be returned to your original payment method.`
          : " The amount will be returned to your original payment method."}
      </Text>

      <Box variant="info">
        <Heading as="h3">What to expect</Heading>
        <Text small style={{ margin: 0 }}>
          Refunds typically appear within 5–7 business days, depending on your
          bank or card issuer. If you don&apos;t see it after 7 business days,
          contact your bank directly.
        </Text>
      </Box>

      <Button href={`${appUrl}/track/${requestId}`} variant="secondary">
        View Request Details
      </Button>

    </BaseEmail>
  )
}

export const refundIssuedEmailSubject = (requestType: string) =>
  `Your ${requestType} refund is on its way`
