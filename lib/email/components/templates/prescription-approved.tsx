/**
 * Prescription Approved Email Template
 *
 * Sent to patient when their repeat prescription is approved
 * and the eScript token will arrive via SMS.
 */

import * as React from "react"

import {
  BaseEmail,
  Button,
  HeroBlock,
  Text,
} from "../base-email"

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
      previewText={`Your ${medicationName} prescription is approved, eScript on its way 💊`}
      appUrl={appUrl}
      showReviewCTA
      showReferral
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
        Your eScript will arrive via <strong>SMS</strong> shortly. Take your phone to any pharmacy and they&apos;ll scan the QR code.
        Bring your Medicare card for PBS-subsidised medications.
      </Text>

      <Button href={`${appUrl}/track/${intakeId}`}>
        View request
      </Button>

    </BaseEmail>
  )
}

export const prescriptionApprovedSubject = (medicationName: string, firstName?: string) =>
  firstName ? `${firstName}, your ${medicationName} prescription is approved 💊` : `Your ${medicationName} prescription is approved 💊`
