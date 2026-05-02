/**
 * Welcome Email Template
 *
 * Sent to new patients after account creation.
 * Warm handshake - not a brochure.
 */

import * as React from "react"

import { BaseEmail, Button,HeroBlock, Text } from "../base-email"

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
      previewText={`Good to have you, ${firstName}. No waiting rooms, no phone tag.`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="👋"
        headline={`Good to have you, ${firstName}`}
        variant="info"
      />

      <Text>
        No waiting rooms, no phone tag. Fill in a short form, a real Australian
        doctor reviews it, and you&apos;re done. After doctor review.
      </Text>

      <Text small muted>
        Trusted by thousands of Australians for fast, confidential healthcare.
      </Text>

      <Button href={`${appUrl}/start`}>Make your first request</Button>

    </BaseEmail>
  )
}

export const welcomeEmailSubject = (patientName: string) =>
  `Good to have you, ${patientName.split(" ")[0]} 👋`
