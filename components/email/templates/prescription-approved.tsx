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
  appUrl = "https://instantmed.com.au",
}: PrescriptionApprovedEmailProps) {
  return (
    <BaseEmail
      previewText={`Your ${medicationName} prescription has been approved`}
      appUrl={appUrl}
    >
      <SuccessBanner title="Prescription approved" />

      <Text>Hi {patientName},</Text>

      <Text>
        Great news -- your doctor has reviewed and approved your prescription for{" "}
        <strong>{medicationName}</strong>.
      </Text>

      <Box variant="info">
        <Heading as="h3">Your eScript is on its way</Heading>
        <Text small>
          You will receive an eScript token via <strong>SMS</strong> shortly. This is a
          unique code that any pharmacy in Australia can use to dispense your medication.
        </Text>
      </Box>

      <Box>
        <Heading as="h3">What to do next</Heading>
        <List
          items={[
            "Check your phone for the eScript SMS (usually arrives within a few minutes)",
            "Take your phone to any pharmacy",
            "Show the pharmacist your eScript token -- they'll scan the QR code",
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

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${intakeId}`}>
          View Request Details
        </Button>
      </div>

      <Text muted small>
        Questions about your prescription? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help center
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const prescriptionApprovedSubject = (medicationName: string) =>
  `Your ${medicationName} prescription has been approved`
