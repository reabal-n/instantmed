/**
 * Welcome Email Template
 *
 * Sent to new patients after account creation.
 * Warm handshake — not a brochure.
 */

import * as React from "react"
import { BaseEmail, HeroBlock, Text, Button, ReferralCTA } from "../base-email"

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
      previewText={`Good to have you, ${firstName} — no waiting rooms, no phone tag.`}
      appUrl={appUrl}
      showFooterReview={false}
    >
      <HeroBlock
        icon="👋"
        headline={`Good to have you, ${firstName}`}
        variant="info"
      />

      <Text>
        No waiting rooms, no phone tag. Fill in a short form, a real Australian
        doctor reviews it, and you&apos;re done — usually within the hour.
      </Text>

      <Text small muted>
        Trusted by thousands of Australians for fast, confidential healthcare.
      </Text>

      <Button href={`${appUrl}/start`}>Make your first request</Button>

      <ReferralCTA appUrl={appUrl} />
    </BaseEmail>
  )
}

export const welcomeEmailSubject = (patientName: string) =>
  `Good to have you, ${patientName.split(" ")[0]} 👋`
