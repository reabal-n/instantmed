/**
 * Review Follow-up Email Template — Day 7 post-approval
 *
 * Lighter touch follow-up if no review was left after the day-2 email.
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
} from "../base-email"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"

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
    <BaseEmail previewText="A quick review helps other Aussies find fast healthcare" appUrl={appUrl}>
      <Text>Hi {firstName},</Text>

      <Text>
        Just a gentle nudge. If you had a good experience with InstantMed,
        a quick Google review would really mean a lot to our team. It takes
        less than 30 seconds and helps other Australians find quality
        telehealth.
      </Text>

      <Button href={GOOGLE_REVIEW_URL}>Leave a Review ⭐</Button>

      <Text muted small>
        Not keen? No worries at all, this is the last time we&apos;ll ask.
      </Text>

    </BaseEmail>
  )
}

