/**
 * General Consultation Approved Email Template
 *
 * Sent to patient when their general consultation is approved.
 */

import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  Box,
  Heading,
  GoogleReviewCTA,
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
      showFooterReview={false}
    >
      <HeroBlock
        icon="✓"
        headline="Consultation complete"
        subtitle="Your doctor has reviewed your request"
        variant="success"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Your doctor has reviewed your consultation. If a prescription was issued,
        your eScript will arrive via SMS. If a referral was provided, it&apos;ll be in your account.
      </Text>

      {doctorNotes && (
        <Box>
          <Heading as="h3">Doctor&apos;s notes</Heading>
          <Text small>{doctorNotes}</Text>
        </Box>
      )}

      <Button href={`${appUrl}/track/${requestId}`}>
        View details
      </Button>

      <GoogleReviewCTA href={GOOGLE_REVIEW_URL} />
    </BaseEmail>
  )
}

export const consultApprovedSubject = "Good news — your consultation is all done ✅"
