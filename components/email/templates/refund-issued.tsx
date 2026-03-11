/**
 * Refund Issued Email Template
 *
 * Sent to patient when a refund has been processed for their request.
 */

import * as React from "react"
import {
  BaseEmail,
  Heading,
  Text,
  Button,
  Box,
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
  appUrl = "https://instantmed.com.au",
}: RefundIssuedEmailProps) {
  return (
    <BaseEmail
      previewText={`Your refund for your ${requestType} request has been processed`}
      appUrl={appUrl}
    >
      <Heading>Refund processed</Heading>

      <Text>Hi {patientName},</Text>

      <Text>
        We&apos;ve processed a refund for your{" "}
        <strong>{requestType}</strong> request.
        {amountFormatted ? ` The amount of ${amountFormatted} will be returned to your original payment method.` : " The amount will be returned to your original payment method."}
      </Text>

      <Box variant="info">
        <Heading as="h3">What to expect</Heading>
        <Text small style={{ margin: 0 }}>
          Refunds typically appear within 5–7 business days, depending on your
          bank or card issuer. If you don&apos;t see the refund after 7 business
          days, please contact your bank directly.
        </Text>
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`} variant="secondary">
          View Request Details
        </Button>
      </div>

      <Text muted small>
        If you have any questions, please reply to this email or contact us at
        support@instantmed.com.au.
      </Text>
    </BaseEmail>
  )
}

export const refundIssuedEmailSubject = (requestType: string) =>
  `Refund processed for your ${requestType} request`
