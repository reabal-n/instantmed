/**
 * Review Follow-up Email - Day 7 post-approval
 *
 * Lighter-touch follow-up using ReviewHero.
 */

import * as React from "react"
import { BaseEmail, Text, ReviewHero } from "../base-email"

export interface ReviewFollowupEmailProps {
  patientName: string
  appUrl?: string
}

export const reviewFollowupSubject = "Still happy with us? 😊"

export function ReviewFollowupEmail({
  patientName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: ReviewFollowupEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="A quick review helps other Aussies find quality telehealth" appUrl={appUrl}>
      <Text>Hey {firstName},</Text>

      <Text>
        Just a gentle nudge. If you had a good experience with InstantMed, we&apos;d love to hear about it.
      </Text>

      <ReviewHero
        appUrl={appUrl}
        serviceCopy="Your review helps other Australians find quality telehealth when they need it most. It takes less than 30 seconds."
      />

      <Text muted small style={{ textAlign: "center" as const }}>
        Not keen? No worries at all. This is the last time we&apos;ll ask.
      </Text>
    </BaseEmail>
  )
}
