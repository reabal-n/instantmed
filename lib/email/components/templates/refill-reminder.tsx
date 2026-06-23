/**
 * Refill Reminder Email - one-off reactivation nudge ~week 10-11 post-issue
 * (before a script + 2 repeats supply runs out).
 *
 * Reminds a patient that their repeatable script is due for a reorder and links
 * them back into the normal repeat-prescription flow. NOT a subscription: it
 * creates no order and makes no auto-charge. Marketing-consent gated upstream.
 */

import * as React from "react"

import { BaseEmail, Button, Text } from "../base-email"

export interface RefillReminderEmailProps {
  patientName: string
  medicationName: string
  appUrl?: string
  reorderUrl: string
}

export const refillReminderSubject = "Running low? Reorder in a couple of minutes"

export function RefillReminderEmail({
  patientName,
  medicationName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  reorderUrl,
}: RefillReminderEmailProps) {
  const firstName = patientName.split(" ")[0] || "there"

  return (
    <BaseEmail
      previewText={`Time to reorder your ${medicationName} repeat script`}
      appUrl={appUrl}
      showReferral
    >
      <Text>Hi {firstName},</Text>

      <Text>
        If you're getting near the end of your <strong>{medicationName}</strong> repeats, you can
        request a fresh script from an AHPRA-registered doctor in a couple of minutes, without
        booking a GP appointment.
      </Text>

      <Button href={reorderUrl}>Reorder {medicationName}</Button>

      <Text muted small>
        A doctor reviews every request and will contact you if anything needs checking. If you have
        already reordered, or no longer need this medication, you can ignore this email.
      </Text>
    </BaseEmail>
  )
}
