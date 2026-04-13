/**
 * Request Declined Email Template
 *
 * Sent to patient when their request cannot be approved.
 * Tone: empathetic, reassuring, action-oriented. NOT clinical or alarming.
 */

import * as React from "react"

import {
  BaseEmail,
  Box,
  Button,
  colors,
  fontFamily,
  Heading,
  HeroBlock,
  List,
  Text,
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
  const isPrescriptionOrConsult =
    /prescription|consult/i.test(requestType)

  const nextSteps = [
    "See your regular GP for an in-person assessment",
    "Call 13SICK (13 7425) for after-hours GP advice",
  ]

  if (isPrescriptionOrConsult) {
    nextSteps.push(
      "Try a different request. We can still help with medical certificates and other services"
    )
  }

  return (
    <BaseEmail
      previewText={`We couldn\u2019t help with your ${requestType} this time. Next steps inside`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="\uD83D\uDCCB"
        headline="We weren&apos;t able to help this time"
        variant="neutral"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        We know this isn&apos;t the result you were hoping for. After carefully
        reviewing your <strong>{requestType}</strong> request, the doctor
        wasn&apos;t able to approve it through our telehealth service on this
        occasion.
      </Text>

      {reason && (
        <Box variant="info">
          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: "14px",
              color: colors.infoText,
              fontWeight: "600",
              fontFamily,
            }}
          >
            Doctor&apos;s note
          </p>
          <Text style={{ margin: 0 }}>{reason}</Text>
        </Box>
      )}

      <Box variant="success">
        <Heading as="h3">Full refund guaranteed</Heading>
        <Text small style={{ margin: 0 }}>
          Your payment will be refunded in full to your original payment method
          within 5&ndash;7 business days. No action needed on your end.
        </Text>
      </Box>

      <div style={{ margin: "20px 0" }}>
        <Heading as="h3">What you can do next</Heading>
        <List items={nextSteps} />
      </div>

      <Text style={{ marginTop: "20px" }}>
        We&apos;re sorry we couldn&apos;t help this time, {firstName}.
        We&apos;re always here if you need us down the track.
      </Text>

      <Button href={`${appUrl}/track/${requestId}`} variant="secondary">
        View request details
      </Button>
    </BaseEmail>
  )
}

export const requestDeclinedEmailSubject = (requestType: string) =>
  `Update on your ${requestType} request`
