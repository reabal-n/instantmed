/**
 * Women's Health Consultation Approved Email Template
 *
 * Sent to patient when their women's health consultation is approved.
 * Content varies by treatment type: contraception, UTI, or hormonal.
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
  Box,
  Heading,
  List,
  HeroBlock,
  ReferralCTA,
} from "../base-email"

export interface WomensHealthApprovedEmailProps {
  patientName: string
  medicationName: string
  treatmentType?: string // "contraception" | "uti" | "hormonal" | undefined
  requestId: string
  appUrl?: string
}

export function WomensHealthApprovedEmail({
  patientName,
  medicationName,
  treatmentType,
  requestId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: WomensHealthApprovedEmailProps) {
  const firstName = patientName.split(" ")[0]
  const isContraception = treatmentType === "contraception" || treatmentType === "oral_contraceptive"
  const isUTI = treatmentType === "uti"

  return (
    <BaseEmail
      previewText={`✅ ${firstName}, your ${medicationName} prescription is ready`}
      appUrl={appUrl}
      showFooterReview
    >
      <HeroBlock
        icon="✓"
        headline="Treatment approved"
        subtitle={medicationName}
        variant="success"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Good news — your prescription for{" "}
        <strong>{medicationName}</strong> has been approved. Your eScript will arrive by SMS shortly.
      </Text>

      <Box variant="info">
        <Heading as="h3">eScript arriving via SMS</Heading>
        <Text small>
          Take your phone to any pharmacy. The pharmacist will scan your eScript QR code
          to dispense your medication.
        </Text>
      </Box>

      {isContraception && (
        <Box>
          <Heading as="h3">Starting your contraception</Heading>
          <List
            items={[
              "You can start on Day 1 of your period for immediate protection, or at any time (use backup contraception for the first 7 days)",
              "Take one pill at the same time each day",
              "If you miss a pill, take it as soon as you remember — refer to the patient information leaflet for specific advice",
              "Common side effects in the first 1–3 months: nausea, spotting, breast tenderness — these usually settle",
              "Contact your doctor if you experience persistent headaches, leg pain/swelling, or chest pain",
            ]}
          />
        </Box>
      )}

      {isUTI && (
        <Box>
          <Heading as="h3">Taking your antibiotic course</Heading>
          <List
            items={[
              "Complete the full course of antibiotics as prescribed, even if symptoms improve early",
              "Drink plenty of water to help flush out the infection",
              "Symptoms should begin to improve within 1–2 days",
              "If symptoms worsen or haven't improved after 48 hours, contact your doctor",
              "Return for review if you experience fever, back pain, or blood in your urine",
            ]}
          />
        </Box>
      )}

      {!isContraception && !isUTI && (
        <Box>
          <Heading as="h3">Taking your medication</Heading>
          <List
            items={[
              "Follow the instructions provided by your doctor and pharmacist",
              "Take your medication as prescribed — do not skip doses or stop early unless advised",
              "Note any side effects and report them at your follow-up",
              "Your doctor may recommend a follow-up appointment to assess your response to treatment",
            ]}
          />
        </Box>
      )}

      <Box>
        <Heading as="h3">When to seek further help</Heading>
        <List
          items={[
            "If your symptoms worsen or don't improve within the expected timeframe",
            "If you experience unexpected side effects",
            "If you have questions about your treatment plan",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/track/${requestId}`}>
        View Request Details
      </Button>

      <ReferralCTA appUrl={appUrl} />
    </BaseEmail>
  )
}

export const womensHealthApprovedSubject = (medicationName: string, firstName?: string) =>
  firstName ? `${firstName}, your ${medicationName} prescription is approved` : `Your ${medicationName} prescription has been approved`
