/**
 * ED Consultation Approved Email Template
 *
 * Sent to patient when their ED consultation is approved.
 * Includes medication-specific usage instructions for sildenafil or tadalafil.
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
  appUrl = "https://instantmed.com.au",
}: EdApprovedEmailProps) {
  const tadalafil = isTadalafil(medicationName)
  const sildenafil = isSildenafil(medicationName)

  return (
    <BaseEmail
      previewText={`Your ED prescription for ${medicationName} has been approved`}
      appUrl={appUrl}
    >
      <SuccessBanner title="Prescription approved" />

      <Text>Hi {patientName},</Text>

      <Text>
        Your doctor has reviewed your consultation and approved your prescription for{" "}
        <strong>{medicationName}</strong>. Your eScript token will arrive via SMS shortly.
      </Text>

      <Box variant="info">
        <Heading as="h3">eScript arriving via SMS</Heading>
        <Text small>
          Take your phone to any pharmacy. The pharmacist will scan your eScript QR code
          to dispense your medication. Bring your Medicare card for any PBS subsidy.
        </Text>
      </Box>

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
              "Alternatively, your doctor may prescribe a low daily dose (2.5–5mg)",
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
            Follow the instructions provided by your doctor and the pharmacist.
            Take your medication as prescribed and do not exceed the recommended dose.
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
            "Seek urgent medical attention if you experience chest pain, an erection lasting more than 4 hours, or sudden vision/hearing changes",
          ]}
        />
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`}>
          View Request Details
        </Button>
      </div>

      <Text muted small>
        Questions about your medication? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.primary, fontWeight: 500 }}>
          help center
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const edApprovedSubject = (medicationName: string) =>
  `Your ${medicationName} prescription has been approved`
