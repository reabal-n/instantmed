/**
 * Still Reviewing Email Template
 *
 * Sent once when a request has been waiting without a doctor decision — from
 * the 45-min follow-up (retry-auto-approval cron, all categories) or the
 * delay backstop (stale-queue cron). One template, two variants:
 *
 * - Daytime: light reassurance — the doctor really is working the queue.
 * - Overnight (22:00–06:59 Sydney at send time, lib/email/overnight-window.ts):
 *   honest expectation-setting. No "nearly done", no "working through the
 *   queue" — a 01:45 email promising imminent review before an 8h wait is the
 *   exact copy that turned a slow night into an angry support thread
 *   (2026-08-03). States that overnight requests usually take longer, most are
 *   completed by midday (90d production data: 5/5 overnight orders reviewed by
 *   12:23; "by morning" was only 3/5 — don't re-tighten it), and gives the
 *   urgent-care escape hatch. No review-hours windows, no SLA promises
 *   (24/7 copy contract).
 */

import * as React from "react"

import {
  APP_URL,
  BaseEmail,
  Box,
  Button,
  HeroBlock,
  NameFirstGreeting,
  Text,
} from "../base-email"

export interface StillReviewingEmailProps {
  patientName: string
  requestType: string
  requestId: string
  requestAccessUrl: string
  appUrl?: string
  /** True when the send happens 22:00–06:59 Australia/Sydney. */
  overnight?: boolean
}

export function StillReviewingEmail({
  patientName,
  requestType,
  requestAccessUrl,
  appUrl = APP_URL,
  overnight = false,
}: StillReviewingEmailProps) {
  const firstName = patientName.split(" ")[0]

  if (overnight) {
    return (
      <BaseEmail
        previewText={`Your ${requestType} is safely in the queue`}
        appUrl={appUrl}
      >
        <HeroBlock
          icon="🌙"
          headline="We've got your request"
          subtitle={`Your ${requestType} is safely in the queue`}
          variant="info"
        />

        <NameFirstGreeting name={firstName} />

        <Text>
          Overnight requests usually take longer than daytime ones. Most are
          completed by midday, and we&apos;ll email you the moment your{" "}
          <strong>{requestType}</strong> is done. There&apos;s nothing you need
          to do in the meantime.
        </Text>

        <Box variant="info">
          <Text small style={{ margin: 0 }}>
            If you&apos;re feeling worse while you wait, don&apos;t wait for us:
            call healthdirect on 1800 022 222 for 24/7 nurse advice, see a doctor
            in person, or call 000 in an emergency.
          </Text>
        </Box>

        <Button href={requestAccessUrl} variant="secondary">
          Check your request
        </Button>

      </BaseEmail>
    )
  }

  return (
    <BaseEmail
      previewText={`Still on it, your ${requestType} is in review ⏳`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="⏳"
        headline="Still on it"
        subtitle={`Your ${requestType} is in review`}
        variant="info"
      />

      <NameFirstGreeting name={firstName} />

      <Text>
        Your <strong>{requestType}</strong> is taking a little longer than
        usual, but we&apos;re still on it. Our doctor is working through the
        queue and will have your review done as soon as possible.
      </Text>

      <Box variant="info">
        <Text small style={{ margin: 0 }}>
          We&apos;ll email you the moment it&apos;s done. No action needed on your end.
        </Text>
      </Box>

      <Button href={requestAccessUrl} variant="secondary">
        Check your request
      </Button>

    </BaseEmail>
  )
}

export const stillReviewingSubject = (requestType: string, overnight = false) =>
  overnight ? `We've got your ${requestType}` : `Still on it, your ${requestType} ⏳`
