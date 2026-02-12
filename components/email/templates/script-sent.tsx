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
  colors,
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
  appUrl = "https://instantmed.com.au",
}: ScriptSentEmailProps) {
  return (
    <BaseEmail
      previewText="Your eScript has been sent to your phone"
      appUrl={appUrl}
    >
      <SuccessBanner title="Your eScript has been sent" />

      <Text>Hi {patientName},</Text>

      <Text>
        Your prescription has been approved and your eScript has been sent to your phone
        via SMS. Take your phone to any pharmacy to collect your medication.
      </Text>

      {escriptReference && (
        <Box variant="success">
          <Heading as="h3">eScript Reference</Heading>
          <p
            style={{
              margin: 0,
              fontSize: "20px",
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              fontWeight: 700,
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

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`} variant="secondary">
          View Request Details
        </Button>
      </div>

      <Text muted small>
        Questions? Just reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.primary, fontWeight: 500 }}>
          help center
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const scriptSentEmailSubject = "Your eScript has been sent"
