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
      <Heading>Hey {firstName}, welcome 👋</Heading>

      <Text>
        You&apos;re all set. No waiting rooms, no phone tag — just fill in
        a short form and a real Australian doctor reviews it, usually within
        the hour.
      </Text>

      <Box>
        <Heading as="h3">What you can do with InstantMed</Heading>
        <List
          items={[
            "Medical certificates — from $19.95, reviewed within the hour",
            "Repeat prescriptions — any Australian pharmacy",
            "GP consultations — from $49.95, no video call needed",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/start`}>Get started</Button>

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

export const welcomeEmailSubject = "Welcome to InstantMed 👋"
