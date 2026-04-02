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
      previewText={`Still on it — your ${requestType} is nearly done ⏳`}
      appUrl={appUrl}
    >
      <Heading>Still on it ⏳</Heading>

      <Text>Hi {firstName},</Text>

      <Text>
        Your <strong>{requestType}</strong> is taking a little longer than
        usual — we&apos;re still on it. Our doctor is working through the
        queue and will have your review done shortly.
      </Text>

      <Box variant="info">
        <Text small style={{ margin: 0 }}>
          We&apos;ll email you the moment it&apos;s done. No action needed on your end.
        </Text>
      </Box>

      <Button href={`${appUrl}/patient/intakes/${requestId}`} variant="secondary">
        Check your request
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
  `Still on it — your ${requestType} ⏳`
