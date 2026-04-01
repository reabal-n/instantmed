/**
 * Prescription Approved Email Template
 *
 * Sent to patient when their repeat prescription is approved
 * and the eScript token will arrive via SMS.
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
      previewText={`Good news — your ${medicationName} prescription is approved ✅`}
      appUrl={appUrl}
    >
      <SuccessBanner title="Prescription approved" />

      <Text>Hi {firstName},</Text>

      <Text>
        Your doctor has reviewed and approved your prescription for{" "}
        <strong>{medicationName}</strong>.
      </Text>

      <Box variant="info">
        <Heading as="h3">Your eScript is on its way</Heading>
        <Text small>
          You&apos;ll receive an eScript token via <strong>SMS</strong> shortly.
          Any pharmacy in Australia can use this code to dispense your medication.
        </Text>
      </Box>

      <Box>
        <Heading as="h3">What to do next</Heading>
        <List
          items={[
            "Check your phone for the eScript SMS (usually arrives within minutes)",
            "Take your phone to any pharmacy",
            "Show the pharmacist your eScript token — they'll scan the QR code",
            "Bring your Medicare card for any PBS-subsidised medications",
          ]}
        />
      </Box>

      <Box>
        <Heading as="h3">Good to know</Heading>
        <List
          items={[
            "Your eScript is valid at any pharmacy across Australia",
            "If your medication has repeats, the pharmacist will manage them electronically",
            "Save a screenshot of your eScript as a backup",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/patient/intakes/${intakeId}`}>
        View Request Details
      </Button>

      <Text muted small style={{ textAlign: "center" as const }}>
        Need a GP consultation?{" "}
        <a href={`${appUrl}/request?service=consult`} style={{ color: colors.accent, fontWeight: 500 }}>
          Consultations from $49.95
        </a>
      </Text>

      <Text muted small>
        Questions? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help centre
        </a>
        .
      </Text>

      <Text muted small style={{ textAlign: "center" as const }}>
        Had a good experience?{" "}
        <a href={GOOGLE_REVIEW_URL} style={{ color: colors.accent, fontWeight: 500 }}>
          Leave a quick Google review
        </a>
        {" "}&mdash; it helps other Australians find us.
      </Text>
    </BaseEmail>
  )
}

export const prescriptionApprovedSubject = (medicationName: string) =>
  `Your ${medicationName} prescription has been approved`
