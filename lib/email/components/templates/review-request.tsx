/**
 * Review Request Email Template - Day 2 post-approval
 *
 * Uses ReviewHero as the prominent CTA, preceded by an optional one-click
 * "how did you hear about us?" attribution question (the email is the highest-
 * intent reachable moment for the marketing-consented cohort).
 */

import * as React from "react"

import { BaseEmail, ReviewHero,Text } from "../base-email"
import { HeardAboutUsLinks } from "../heard-about-us-links"

export interface ReviewRequestEmailProps {
  patientName: string
  serviceName: string
  appUrl?: string
  /** Intake ID + signed token power the one-click attribution links. */
  intakeId?: string
  heardToken?: string
}

export const reviewRequestSubject = "Quick favour? ⭐"

export function ReviewRequestEmail({
  patientName,
  serviceName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  intakeId,
  heardToken,
}: ReviewRequestEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="If you've got 30 seconds, a review would mean the world" appUrl={appUrl}>
      <Text>Hey {firstName},</Text>

      <Text>
        Glad we could help with your <strong>{serviceName}</strong>. We have a small favour to ask.
      </Text>

      {heardToken && <HeardAboutUsLinks appUrl={appUrl} token={heardToken} />}

      <ReviewHero
        appUrl={appUrl}
        intakeId={intakeId}
        serviceCopy={`If we saved you a trip to the GP for your ${serviceName.toLowerCase()}, a quick review helps other Aussies find fast, easy healthcare. It takes about 30 seconds.`}
      />
    </BaseEmail>
  )
}
