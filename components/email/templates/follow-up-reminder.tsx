/**
 * Follow-Up Reminder Email Template
 *
 * Sent 72–96 hours after a medical certificate is approved.
 * One-time touchpoint — gentle check-in, surfaces the consult product.
 */

import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  GoogleReviewCTA,
} from "../base-email"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"

export interface FollowUpReminderEmailProps {
  patientName: string
  appUrl?: string
}

export const followUpReminderSubject = "Checking in, how are you feeling?"

export function FollowUpReminderEmail({
  patientName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: FollowUpReminderEmailProps) {
  const firstName = patientName.split(" ")[0]
  const consultUrl = `${appUrl}/request?service=consult`

  return (
    <BaseEmail
      previewText="Hope you're on the mend, just checking in"
      appUrl={appUrl}
    >
      <HeroBlock icon="👋" headline="Checking in" variant="info" />

      <Text>Hi {firstName},</Text>

      <Text>
        Just checking in. It&apos;s been a few days since your medical
        certificate was approved. Hope you&apos;re on the mend.
      </Text>

      <Text>
        If symptoms are hanging around or you need ongoing care, a GP
        consultation might be worth considering. Same process, fill in a form,
        a doctor reviews it.
      </Text>

      <Button href={consultUrl}>Start a consultation</Button>

      <Text muted small style={{ textAlign: "center" }}>
        GP consultations from $49.95
      </Text>

      <GoogleReviewCTA href={GOOGLE_REVIEW_URL} />

      <Text muted style={{ marginTop: "16px" }}>
        If you&apos;re all good, great. No action needed.
      </Text>

    </BaseEmail>
  )
}
