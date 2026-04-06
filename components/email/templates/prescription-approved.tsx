/**
 * Prescription Approved Email Template
 *
 * Sent to patient when their repeat prescription is approved
 * and the eScript token will arrive via SMS.
 */

import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  Box,
  Heading,
  List,
  GoogleReviewCTA,
  ReferralCTA,
  colors,
} from "../base-email"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"

export interface PrescriptionApprovedEmailProps {
  patientName: string
  medicationName: string
  intakeId: string
  appUrl?: string
}

export function PrescriptionApprovedEmail({
  patientName,
  medicationName,
  intakeId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PrescriptionApprovedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText={`Your ${medicationName} prescription is approved — eScript on its way 💊`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="Prescription approved 💊"
        subtitle={medicationName}
        variant="success"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Your <strong>{medicationName}</strong> prescription has been approved.
        You&apos;ll get an eScript via <strong>SMS</strong> shortly — take it
        to any pharmacy in Australia.
      </Text>

      <Box>
        <Heading as="h3">What to do next</Heading>
        <List
          items={[
            "Check your phone for the eScript SMS (usually a few minutes)",
            "Take your phone to any pharmacy — they'll scan the QR code",
            "Bring your Medicare card for PBS-subsidised medications",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/patient/intakes/${intakeId}`}>
        View request details
      </Button>

      <GoogleReviewCTA href={GOOGLE_REVIEW_URL} />
      <ReferralCTA appUrl={appUrl} />

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

export const prescriptionApprovedSubject = (medicationName: string) =>
  `Your ${medicationName} prescription is approved 💊`
