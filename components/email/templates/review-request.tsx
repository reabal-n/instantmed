/**
 * Review Request Email Template — Day 2 post-approval
 *
 * Warm, personal ask for a Google review.
 * Sent 2 days after approval via daily cron.
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
} from "../base-email"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"

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
      <Text>Hi {firstName},</Text>

      <Text>
        Glad we could help with your <strong>{serviceName}</strong>. If you had
        a good experience, we&apos;d really appreciate a quick Google review. It
        helps other Aussies find us and takes about 30 seconds.
      </Text>

      <Button href={GOOGLE_REVIEW_URL}>Leave a Review ⭐</Button>

      <Text muted small>
        Already left one? Legend, thanks so much. You can ignore this email.
      </Text>

    </BaseEmail>
  )
}

