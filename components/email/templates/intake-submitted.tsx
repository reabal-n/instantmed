/**
 * Intake Submitted / Request Being Reviewed Email Template
 *
 * Sent after payment is confirmed to let the patient know their
 * request is now in the doctor review queue.
 */

import * as React from "react"
import {
  BaseEmail,
  StatusBanner,
  Text,
  Button,
  Box,
  Heading,
  List,
  DetailRow,
  colors,
} from "../base-email"

export interface IntakeSubmittedEmailProps {
  patientName: string
  requestType: string
  requestId: string
  appUrl?: string
}

export function intakeSubmittedSubject(requestType: string) {
  return `Got it — your ${requestType} is being reviewed`
}

export function IntakeSubmittedEmail({
  patientName,
  requestType,
  requestId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: IntakeSubmittedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText={`Your ${requestType} request is with a doctor now 👍`}
      appUrl={appUrl}
    >
      <StatusBanner title="Request submitted" variant="info" />

      <Text>Hi {firstName},</Text>

      <Text>
        Your <strong>{requestType}</strong> request has been submitted. A doctor
        will review it soon — most requests are wrapped up within a couple of hours.
      </Text>

      <Box>
        <DetailRow label="Reference" value={requestId.slice(0, 8).toUpperCase()} />
        <DetailRow label="Status" value="In review" />
      </Box>

      <Box>
        <Heading as="h3">What happens next</Heading>
        <List
          items={[
            "A doctor reviews your request (typically 1–2 hours)",
            "You'll get an email once a decision is made",
            "If anything else is needed, the doctor will reach out",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/patient/intakes/${requestId}`}>
        Track Your Request
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
