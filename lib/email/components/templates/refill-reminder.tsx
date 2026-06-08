/**
 * Refill Reminder Email - one-off reactivation nudge ~25-30 days post-issue.
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
        It has been about a month since your <strong>{medicationName}</strong> repeat script.
        If you are running low, you can request another one from an AHPRA-registered doctor in a
        couple of minutes, without booking a GP appointment.
      </Text>

      <Button href={reorderUrl}>Reorder {medicationName}</Button>

      <Text muted small>
        A doctor reviews every request and will contact you if anything needs checking. If you have
        already reordered, or no longer need this medication, you can ignore this email.
      </Text>
    </BaseEmail>
  )
}
