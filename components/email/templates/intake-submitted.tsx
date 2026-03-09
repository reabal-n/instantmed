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
  return `Your ${requestType} request is being reviewed`
}

export function IntakeSubmittedEmail({
  patientName,
  requestType,
  requestId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: IntakeSubmittedEmailProps) {
  return (
    <BaseEmail
      previewText={`Your ${requestType} request is being reviewed 👍`}
      appUrl={appUrl}
    >
      <StatusBanner title="Request submitted" variant="info" />

      <Text>Hi {patientName},</Text>

      <Text>
        Your <strong>{requestType}</strong> request has been submitted and a doctor
        will review it soon — most requests are reviewed within a couple of hours.
      </Text>

      <Box>
        <DetailRow label="Reference" value={requestId.slice(0, 8).toUpperCase()} />
        <DetailRow label="Status" value="In review" />
      </Box>

      <Box>
        <Heading as="h3">What happens next</Heading>
        <List
          items={[
            "A doctor reviews your request (typically within 1–2 hours)",
            "You'll receive an email once a decision is made",
            "If any follow-up is needed, the doctor will reach out",
          ]}
        />
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`}>
          Track Your Request
        </Button>
      </div>

      <Text muted small>
        You can check the status of your request at any time from your{" "}
        <a href={`${appUrl}/patient`} style={{ color: colors.accent, fontWeight: 500 }}>
          dashboard
        </a>
        . Questions? Just reply to this email.
      </Text>
    </BaseEmail>
  )
}
