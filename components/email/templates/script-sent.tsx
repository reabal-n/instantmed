/**
 * Script Sent Email Template
 * 
 * Sent to patient when their prescription has been sent via eScript.
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
  GoogleReviewCTA,
  ReferralCTA,
  colors,
} from "../base-email"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"

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
      previewText="Your eScript is ready — check your phone ✅"
      appUrl={appUrl}
    >
      <SuccessBanner title="Your eScript has been sent" />

      <Text>Hi {firstName},</Text>

      <Text>
        Your prescription has been approved and the eScript has been sent to
        your phone via SMS. Take your phone to any pharmacy to pick up your
        medication.
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
          <Text muted small style={{ margin: "8px 0 0 0" }}>
            Show this reference at any pharmacy to collect your prescription.
          </Text>
        </Box>
      )}

      <Box>
        <Heading as="h3">What happens next</Heading>
        <List
          items={[
            "Check your phone for the eScript SMS",
            "Visit any pharmacy to collect your medication",
            "Show your Medicare card and the eScript to the pharmacist",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/patient/intakes/${requestId}`} variant="secondary">
        View Request Details
      </Button>

      <Text muted small>
        Questions? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help centre
        </a>
        .
      </Text>

      <GoogleReviewCTA href={GOOGLE_REVIEW_URL} />
      <ReferralCTA appUrl={appUrl} />
    </BaseEmail>
  )
}

export const scriptSentEmailSubject = "Your eScript is on its way"
