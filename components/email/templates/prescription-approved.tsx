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
  GoogleReviewCTA,
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
      showFooterReview={false}
    >
      <HeroBlock
        icon="💊"
        headline="Prescription approved"
        subtitle={medicationName}
        variant="success"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Your <strong>{medicationName}</strong> prescription has been approved.
        Your eScript will arrive via <strong>SMS</strong> shortly — take your phone to any pharmacy and they&apos;ll scan the QR code.
        Bring your Medicare card for PBS-subsidised medications.
      </Text>

      <Button href={`${appUrl}/track/${intakeId}`}>
        View request
      </Button>

      <GoogleReviewCTA href={GOOGLE_REVIEW_URL} />
    </BaseEmail>
  )
}

export const prescriptionApprovedSubject = (medicationName: string) =>
  `Your ${medicationName} prescription is approved 💊`
