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
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: WelcomeEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText="Welcome to InstantMed — good to have you 👍"
      appUrl={appUrl}
    >
      <Heading>Welcome aboard, {firstName}</Heading>

      <Text>Hi {firstName},</Text>

      <Text>
        Thanks for creating your InstantMed account. We&apos;re a small
        Australian telehealth team that makes it easy to get the healthcare
        documents you need — from your phone, on your schedule.
      </Text>

      <Text>
        No waiting rooms. No phone tag with receptionists. Just fill in a
        form and a real doctor reviews it.
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

      <Button href={`${appUrl}/start`}>Get Started</Button>

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

export const welcomeEmailSubject = "Welcome aboard — here's how InstantMed works"
