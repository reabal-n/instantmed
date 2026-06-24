/**
 * Med-cert reactivation email - a single gentle "we're here next time" nudge to
 * a past medical-certificate patient whose most recent certificate was ~5-17
 * weeks ago.
 *
 * NOT a subscription and NOT a reminder that they are due for anything: it makes
 * no order and no auto-charge, and a doctor still reviews and issues only if
 * clinically appropriate. One send per patient (deduped via
 * intakes.reactivation_email_sent_at). Marketing-consent gated upstream.
 */

import * as React from "react"

import { BaseEmail, Button, Text } from "../base-email"

export interface CertReactivationEmailProps {
  patientName: string
  appUrl?: string
  requestUrl: string
}

export const certReactivationSubject = "Next time you're unwell, we're here"

export function CertReactivationEmail({
  patientName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  requestUrl,
}: CertReactivationEmailProps) {
  const firstName = patientName.split(" ")[0] || "there"

  return (
    <BaseEmail
      previewText="If you need a medical certificate again, it only takes a few minutes."
      appUrl={appUrl}
      showReferral={false}
    >
      <Text>Hi {firstName},</Text>

      <Text>
        If you&apos;re unwell and need a medical certificate, you can request one from an
        AHPRA-registered doctor in a few minutes, without booking a GP appointment. A doctor
        reviews every request and issues a certificate only if it is clinically appropriate.
      </Text>

      <Button href={requestUrl}>Request a certificate</Button>

      <Text muted small>
        Certificates cover routine short-term illness (up to 3 days) and are not guaranteed, a
        doctor decides. If you don&apos;t need one right now, you can ignore this email.
      </Text>
    </BaseEmail>
  )
}
