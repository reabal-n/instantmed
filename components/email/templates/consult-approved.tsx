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
  GoogleReviewCTA,
  ReferralCTA,
  colors,
} from "../base-email"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"

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
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: ConsultApprovedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText="Your consultation has been reviewed — here's what's next ✅"
      appUrl={appUrl}
    >
      <SuccessBanner title="Consultation reviewed" />

      <Text>Hi {firstName},</Text>

      <Text>
        Your doctor has reviewed your consultation and everything looks good.
        Here are the details and recommended next steps.
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

      <Button href={`${appUrl}/patient/intakes/${requestId}`}>
        View Request Details
      </Button>

      <Text muted small>
        Questions? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help centre
        </a>
        .
      </Text>

      <GoogleReviewCTA href={GOOGLE_REVIEW_URL} />
      <ReferralCTA appUrl={appUrl} />
    </BaseEmail>
  )
}

export const consultApprovedSubject = "Good news — your consultation is all done"
