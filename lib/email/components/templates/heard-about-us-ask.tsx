/**
 * One-time "How did you find us?" attribution backfill email.
 *
 * Sent once to historical Direct/Unknown buyers (referrer-stripped traffic we
 * could never attribute in code). Purely the one-click question — no offer, no
 * upsell — so it's a low-friction ask at the cohort's goodwill, not a sales push.
 */

import * as React from "react"

import { BaseEmail, Text } from "../base-email"
import { HeardAboutUsLinks } from "../heard-about-us-links"

export interface HeardAboutUsAskEmailProps {
  patientName: string
  appUrl?: string
  heardToken: string
}

export const heardAboutUsAskSubject = "Quick question — how did you find us? 👋"

export function HeardAboutUsAskEmail({
  patientName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  heardToken,
}: HeardAboutUsAskEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="One tap helps us reach more Australians" appUrl={appUrl}>
      <Text>Hi {firstName},</Text>

      <Text>
        Thanks for using InstantMed. We&apos;re a small Australian team, and the best
        way we can help more people is by knowing how they found us. If you have a
        spare second, one tap below would mean a lot.
      </Text>

      <HeardAboutUsLinks
        appUrl={appUrl}
        token={heardToken}
        heading="How did you first hear about us?"
      />

      <Text muted small>
        That&apos;s the whole email — no action needed beyond the tap. Thanks for helping out.
      </Text>
    </BaseEmail>
  )
}
