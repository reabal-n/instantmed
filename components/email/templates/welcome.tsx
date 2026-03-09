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
  colors,
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
      previewText="Welcome to InstantMed 👋 Healthcare, simplified"
      appUrl={appUrl}
    >
      <Heading>Welcome aboard</Heading>

      <Text>Hi {patientName},</Text>

      <Text>
        Thanks for creating your InstantMed account. We&apos;re a small Australian
        telehealth team that makes it easy to get the healthcare docs you need —
        from your phone, on your schedule.
      </Text>

      <Box>
        <Heading as="h3">Here&apos;s what you can do</Heading>
        <List
          items={[
            "Get medical certificates reviewed by a doctor within hours",
            "Request prescriptions from registered Australian doctors",
            "Access specialist consultations online",
          ]}
        />
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/start`}>Get Started</Button>
      </div>

      <Text muted small>
        Questions? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help centre
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const welcomeEmailSubject = "Welcome to InstantMed"
