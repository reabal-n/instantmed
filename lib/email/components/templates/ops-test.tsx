/**
 * Ops Test Email Template
 *
 * Sent from the admin ops dashboard to verify live email delivery.
 * PHI-free by design: no patient, intake, or clinical data.
 */

import * as React from "react"

import { buildAdminEmailHubHref } from "@/lib/dashboard/routes"

import { BaseEmail, Button, HeroBlock, Text } from "../base-email"

export interface OpsTestEmailProps {
  eventId: string
  issuedAt: string
  appUrl?: string
}

export function OpsTestEmail({
  eventId,
  issuedAt,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: OpsTestEmailProps) {
  return (
    <BaseEmail
      previewText="InstantMed email delivery test completed."
      appUrl={appUrl}
    >
      <HeroBlock
        icon="OK"
        headline="Email delivery check"
        subtitle="Admin ops test"
        variant="success"
      />

      <Text>
        This is a live InstantMed operations test email. It confirms that the
        production email path can render, send, and write to the outbox.
      </Text>

      <Text small muted>
        Event: {eventId}
        <br />
        Issued: {issuedAt}
      </Text>

      <Button href={`${appUrl}${buildAdminEmailHubHref({ tab: "queue" })}`}>
        Open email outbox
      </Button>
    </BaseEmail>
  )
}

export const opsTestEmailSubject = "InstantMed email delivery test"
