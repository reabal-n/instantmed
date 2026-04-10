/**
 * ED Consultation Approved Email Template
 *
 * Sent to patient when their ED consultation is approved.
 * Includes medication-specific usage instructions for sildenafil or tadalafil.
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
} from "../base-email"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"

export interface EdApprovedEmailProps {
  patientName: string
  medicationName: string
  requestId: string
  appUrl?: string
}

function isTadalafil(name: string): boolean {
  return name.toLowerCase().includes("tadalafil") || name.toLowerCase().includes("cialis")
}

function isSildenafil(name: string): boolean {
  return name.toLowerCase().includes("sildenafil") || name.toLowerCase().includes("viagra")
}

export function EdApprovedEmail({
  patientName,
  medicationName,
  requestId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: EdApprovedEmailProps) {
  const firstName = patientName.split(" ")[0]
  const tadalafil = isTadalafil(medicationName)
  const sildenafil = isSildenafil(medicationName)

  return (
    <BaseEmail
      previewText={`✅ ${firstName}, your ${medicationName} prescription is ready`}
      appUrl={appUrl}
      showFooterReview={false}
    >
      <HeroBlock
        icon="✓"
        headline="Prescription approved"
        subtitle={medicationName}
        variant="success"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Your prescription for <strong>{medicationName}</strong> has been approved.
        Your eScript will arrive by SMS shortly — take your phone to any pharmacy and they&apos;ll scan the QR code.
        Bring your Medicare card for any PBS subsidy.
      </Text>

      {sildenafil && (
        <Box>
          <Heading as="h3">How to take Sildenafil</Heading>
          <List
            items={[
              "Take 30–60 minutes before sexual activity",
              "Effects typically last 4–6 hours",
              "Do not take more than one dose (100mg max) in 24 hours",
              "Works best on an empty stomach — a heavy meal may delay the effect",
              "Do NOT take with nitrate medications (e.g. GTN spray) — this can cause a dangerous drop in blood pressure",
            ]}
          />
        </Box>
      )}

      {tadalafil && (
        <Box>
          <Heading as="h3">How to take Tadalafil</Heading>
          <List
            items={[
              "Take at least 30 minutes before sexual activity",
              "Effects can last up to 36 hours, giving you more flexibility",
              "Can be taken with or without food",
              "Do NOT take with nitrate medications (e.g. GTN spray) — this can cause a dangerous drop in blood pressure",
            ]}
          />
        </Box>
      )}

      {!sildenafil && !tadalafil && (
        <Box>
          <Heading as="h3">How to take your medication</Heading>
          <Text small>
            Follow the instructions from your doctor and pharmacist. Take as prescribed and do not exceed the recommended dose.
          </Text>
        </Box>
      )}

      <Box variant="warning">
        <Heading as="h3">Important safety information</Heading>
        <List
          items={[
            "Common side effects: headache, flushing, nasal congestion, indigestion — these usually pass quickly",
            "Avoid excessive alcohol — it can reduce effectiveness and increase side effects",
            "Do NOT combine with nitrate medications or recreational drugs containing nitrates (e.g. poppers)",
            "Seek urgent medical attention for chest pain, an erection lasting more than 4 hours, or sudden vision/hearing changes",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/track/${requestId}`}>
        View request
      </Button>

      <GoogleReviewCTA href={GOOGLE_REVIEW_URL} />
    </BaseEmail>
  )
}

export const edApprovedSubject = (medicationName: string) =>
  `Your ${medicationName} prescription has been approved ✅`
