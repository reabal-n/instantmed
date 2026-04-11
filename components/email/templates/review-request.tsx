/**
 * Review Request Email Template — Day 2 post-approval
 *
 * Uses ReviewHero as the prominent CTA.
 */

import * as React from "react"
import { BaseEmail, Text, ReviewHero } from "../base-email"

export interface ReviewRequestEmailProps {
  patientName: string
  serviceName: string
  appUrl?: string
}

export const reviewRequestSubject = "Quick favour? ⭐"

export function ReviewRequestEmail({
  patientName,
  serviceName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: ReviewRequestEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="If you've got 30 seconds, a review would mean the world" appUrl={appUrl}>
      <Text>Hey {firstName},</Text>

      <Text>
        Glad we could help with your <strong>{serviceName}</strong>. We have a small favour to ask.
      </Text>

      <ReviewHero
        appUrl={appUrl}
        serviceCopy={`If we saved you a trip to the GP for your ${serviceName.toLowerCase()}, a quick Google review helps other Aussies find fast, easy healthcare. It takes about 30 seconds.`}
      />
    </BaseEmail>
  )
}
