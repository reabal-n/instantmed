/**
 * Request Declined Email Template
 * 
 * Sent to patient when their request cannot be approved.
 */

import * as React from "react"
import {
  BaseEmail,
  Heading,
  Text,
  Button,
  Box,
  colors,
} from "../base-email"

export interface RequestDeclinedEmailProps {
  patientName: string
  requestType: string
  requestId: string
  reason?: string
  appUrl?: string
}

export function RequestDeclinedEmail({
  patientName,
  requestType,
  requestId,
  reason,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: RequestDeclinedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText={`An update on your ${requestType} request 🩺`}
      appUrl={appUrl}
    >
      <Heading>Update on your request</Heading>

      <Text>Hi {firstName},</Text>

      <Text>
        After reviewing your <strong>{requestType}</strong> request, the doctor
        wasn&apos;t able to approve it through our telehealth service this time.
      </Text>

      {reason && (
        <Box variant="error">
          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: "14px",
              color: colors.error,
              fontWeight: "600",
            }}
          >
            Doctor&apos;s note:
          </p>
          <Text style={{ margin: 0, color: colors.errorText }}>{reason}</Text>
        </Box>
      )}

      <Box variant="info">
        <Heading as="h3">Refund details</Heading>
        <Text small style={{ margin: 0 }}>
          A full refund will be processed to your original payment method within
          5–7 business days. If your symptoms are concerning, we&apos;d recommend
          booking an in-person appointment with your regular GP.
        </Text>
      </Box>

      <Button href={`${appUrl}/patient/intakes/${requestId}`} variant="secondary">
        View Request Details
      </Button>

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

export const requestDeclinedEmailSubject = (requestType: string) =>
  `Update on your ${requestType} request`
