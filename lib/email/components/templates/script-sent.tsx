/**
 * Script Sent Email Template
 *
 * Sent to patient when their prescription has been sent via eScript.
 */

import * as React from "react"

import {
  BaseEmail,
  Box,
  Button,
  colors,
  Heading,
  HeroBlock,
  NameFirstGreeting,
  Text,
} from "../base-email"

export interface ScriptSentEmailProps {
  patientName: string
  requestId: string
  escriptReference?: string
  appUrl?: string
}

export function ScriptSentEmail({
  patientName,
  requestId,
  escriptReference,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: ScriptSentEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText="Your eScript is ready! Check your phone 💊"
      appUrl={appUrl}
      showReviewCTA
      showReferral
    >
      <HeroBlock
        icon="💊"
        headline="Your eScript is on its way"
        subtitle="Check your phone for the SMS"
        variant="success"
      />

      <NameFirstGreeting name={firstName} />

      <Text>
        Your prescription has been approved and the eScript is heading to your phone via SMS.
        Take your phone to any pharmacy. The pharmacist will scan the QR code to dispense your medication.
        Bring your Medicare card for any PBS subsidy.
      </Text>

      {escriptReference && (
        <Box variant="success">
          <Heading as="h3">eScript Reference</Heading>
          <p
            style={{
              margin: 0,
              fontSize: "20px",
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              fontWeight: 600,
              color: colors.success,
              letterSpacing: "2px",
            }}
          >
            {escriptReference}
          </p>
        </Box>
      )}

      <Button href={`${appUrl}/track/${requestId}`} variant="secondary">
        View request
      </Button>

    </BaseEmail>
  )
}

export const scriptSentEmailSubject = (firstName?: string) =>
  firstName ? `${firstName}, your eScript is on its way 💊` : "Your eScript is on its way 💊"
