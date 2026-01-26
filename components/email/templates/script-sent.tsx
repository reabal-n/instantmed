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
      {/* Blue success banner for scripts */}
      <div
        style={{
          background: "linear-gradient(135deg, #dbeafe, #e0e7ff)",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "48px", display: "block", marginBottom: "8px" }}>📱</span>
        <h1
          style={{
            color: colors.info,
            fontSize: "24px",
            margin: 0,
            fontWeight: "600",
          }}
        >
          Your eScript has been sent
        </h1>
      </div>

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
              fontSize: "22px",
              fontFamily: "monospace",
              fontWeight: "bold",
              color: "#15803d",
              letterSpacing: "1px",
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
        <Heading as="h3">What happens next?</Heading>
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
        <a href={`${appUrl}/contact`} style={{ color: "#00C9A7", fontWeight: 500 }}>
          help center
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const scriptSentEmailSubject = "Your eScript has been sent"
