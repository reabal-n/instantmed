/**
 * General Consultation Approved Email Template
 *
 * Sent to patient when their general consultation is approved.
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
  Box,
  Heading,
  List,
  SuccessBanner,
  colors,
} from "../base-email"

export interface ConsultApprovedEmailProps {
  patientName: string
  requestId: string
  doctorNotes?: string
  appUrl?: string
}

export function ConsultApprovedEmail({
  patientName,
  requestId,
  doctorNotes,
  appUrl = "https://instantmed.com.au",
}: ConsultApprovedEmailProps) {
  return (
    <BaseEmail
      previewText="Your consultation has been reviewed"
      appUrl={appUrl}
    >
      <SuccessBanner title="Consultation reviewed" />

      <Text>Hi {patientName},</Text>

      <Text>
        Your doctor has reviewed your consultation request. Please see the details below
        and follow the recommended next steps.
      </Text>

      {doctorNotes && (
        <Box>
          <Heading as="h3">Doctor&apos;s notes</Heading>
          <Text small>{doctorNotes}</Text>
        </Box>
      )}

      <Box>
        <Heading as="h3">What to do next</Heading>
        <List
          items={[
            "If a prescription was issued, your eScript will arrive via SMS",
            "If a referral was provided, it will be available in your account",
            "Follow any instructions provided by your doctor",
            "Book a follow-up consultation if your symptoms persist or change",
          ]}
        />
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`}>
          View Request Details
        </Button>
      </div>

      <Text muted small>
        Questions? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.primary, fontWeight: 500 }}>
          help center
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const consultApprovedSubject = "Your consultation has been reviewed"
