/**
 * Still Reviewing Email Template
 *
 * Sent to patient when their request has been waiting 45+ minutes
 * without a doctor review. Reassures them the request is in the queue.
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

export interface StillReviewingEmailProps {
  patientName: string
  requestType: string
  requestId: string
  appUrl?: string
}

export function StillReviewingEmail({
  patientName,
  requestType,
  requestId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: StillReviewingEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText={`Update on your ${requestType} — still with our doctor`}
      appUrl={appUrl}
    >
      <Heading>Your request is still being reviewed</Heading>

      <Text>Hi {firstName},</Text>

      <Text>
        Your <strong>{requestType}</strong> request is with our doctor and
        taking a little longer than usual. We haven&apos;t forgotten about you
        — our doctor is working through the queue and will complete your review
        shortly.
      </Text>

      <Box variant="info">
        <Text small style={{ margin: 0 }}>
          You&apos;ll receive a separate email the moment your request has been
          reviewed. No action is needed on your end.
        </Text>
      </Box>

      <Button href={`${appUrl}/patient/intakes/${requestId}`} variant="secondary">
        View your request
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

export const stillReviewingSubject = (requestType: string) =>
  `Still reviewing your ${requestType} — thanks for your patience`
