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
  appUrl = "https://instantmed.com.au",
}: RequestDeclinedEmailProps) {
  return (
    <BaseEmail
      previewText={`Update on your ${requestType} request`}
      appUrl={appUrl}
    >
      <Heading>Update on your request</Heading>

      <Text>Hi {patientName},</Text>

      <Text>
        After careful review, our doctor was unable to approve your{" "}
        <strong>{requestType}</strong> request through our telehealth service at this time.
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
            Doctor's note:
          </p>
          <Text style={{ margin: 0, color: "#7f1d1d" }}>{reason}</Text>
        </Box>
      )}

      <Box variant="info">
        <Heading as="h3">What happens next?</Heading>
        <Text small style={{ margin: 0 }}>
          A full refund will be processed to your original payment method within 5–7 business
          days. If your symptoms are concerning, please consider booking an in-person
          appointment with your regular doctor.
        </Text>
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`} variant="secondary">
          View Request Details
        </Button>
      </div>

      <Text muted small>
        If you have questions about this decision, please reply to this email.
      </Text>
    </BaseEmail>
  )
}

export const requestDeclinedEmailSubject = (requestType: string) =>
  `Update on your ${requestType} request`
