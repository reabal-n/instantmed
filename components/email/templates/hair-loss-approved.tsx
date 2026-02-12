/**
 * Hair Loss Consultation Approved Email Template
 *
 * Sent to patient when their hair loss consultation is approved.
 * Includes medication-specific usage instructions for finasteride or minoxidil.
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

export interface HairLossApprovedEmailProps {
  patientName: string
  medicationName: string
  requestId: string
  appUrl?: string
}

function isFinasteride(name: string): boolean {
  return name.toLowerCase().includes("finasteride") || name.toLowerCase().includes("propecia")
}

function isMinoxidil(name: string): boolean {
  return name.toLowerCase().includes("minoxidil") || name.toLowerCase().includes("rogaine")
}

export function HairLossApprovedEmail({
  patientName,
  medicationName,
  requestId,
  appUrl = "https://instantmed.com.au",
}: HairLossApprovedEmailProps) {
  const finasteride = isFinasteride(medicationName)
  const minoxidil = isMinoxidil(medicationName)

  return (
    <BaseEmail
      previewText={`Your hair loss treatment for ${medicationName} has been approved`}
      appUrl={appUrl}
    >
      <SuccessBanner title="Treatment approved" />

      <Text>Hi {patientName},</Text>

      <Text>
        Your doctor has reviewed your consultation and approved your prescription for{" "}
        <strong>{medicationName}</strong>. Your eScript token will arrive via SMS shortly.
      </Text>

      <Box variant="info">
        <Heading as="h3">eScript arriving via SMS</Heading>
        <Text small>
          Take your phone to any pharmacy. The pharmacist will scan your eScript QR code
          to dispense your medication.
        </Text>
      </Box>

      {finasteride && (
        <Box>
          <Heading as="h3">How to take Finasteride</Heading>
          <List
            items={[
              "Take 1mg once daily, with or without food",
              "Take it at the same time each day for best results",
              "It typically takes 3–6 months before you notice visible improvement",
              "Continued use is required to maintain results — hair loss may resume if you stop",
              "Some men experience decreased libido or sexual side effects — discuss with your doctor if this occurs",
            ]}
          />
        </Box>
      )}

      {minoxidil && (
        <Box>
          <Heading as="h3">How to use Minoxidil</Heading>
          <List
            items={[
              "Apply to the affected area of the scalp twice daily (morning and evening)",
              "Make sure the scalp is dry before applying",
              "Use the dropper or foam applicator to spread evenly",
              "Initial shedding at 2–4 weeks is normal — this is a sign the treatment is working",
              "Visible results typically appear at 4–6 months of consistent use",
              "Wash your hands thoroughly after applying",
            ]}
          />
        </Box>
      )}

      {!finasteride && !minoxidil && (
        <Box>
          <Heading as="h3">How to use your treatment</Heading>
          <Text small>
            Follow the instructions provided by your doctor and pharmacist.
            Use your treatment as prescribed for the best results.
          </Text>
        </Box>
      )}

      <Box>
        <Heading as="h3">Setting expectations</Heading>
        <List
          items={[
            "Hair loss treatment requires patience — give it at least 3–6 months",
            "Take photos monthly to track your progress",
            "A follow-up consultation is recommended after 6 months",
            "Contact your doctor if you experience any unexpected side effects",
          ]}
        />
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`}>
          View Request Details
        </Button>
      </div>

      <Text muted small>
        Questions about your treatment? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.primary, fontWeight: 500 }}>
          help center
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const hairLossApprovedSubject = (medicationName: string) =>
  `Your ${medicationName} treatment has been approved`
