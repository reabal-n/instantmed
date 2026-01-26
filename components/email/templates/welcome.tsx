/**
 * Welcome Email Template
 * 
 * Sent to new patients after account creation.
 */

import * as React from "react"
import {
  BaseEmail,
  Heading,
  Text,
  Button,
  Box,
  List,
} from "../base-email"

export interface WelcomeEmailProps {
  patientName: string
  appUrl?: string
}

export function WelcomeEmail({
  patientName,
  appUrl = "https://instantmed.com.au",
}: WelcomeEmailProps) {
  return (
    <BaseEmail
      previewText="Welcome to InstantMed — healthcare made simple"
      appUrl={appUrl}
    >
      <Heading>Welcome to InstantMed</Heading>

      <Text>Hi {patientName},</Text>

      <Text>
        Thanks for joining InstantMed. We're here to make healthcare simple and accessible
        — from your phone, on your schedule.
      </Text>

      <Box>
        <Heading as="h3">What you can do</Heading>
        <List
          items={[
            "Get medical certificates reviewed within hours",
            "Request prescriptions from registered doctors",
            "Access pathology test requests online",
          ]}
        />
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/start`}>Get Started</Button>
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

export const welcomeEmailSubject = "Welcome to InstantMed"
