/**
 * Request Received Email Template
 *
 * Sent after Stripe payment succeeds. Combines payment receipt with
 * "your request is being reviewed" guidance in a single email.
 */

import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  Box,
  Heading,
  List,
  DetailRow,
  colors,
} from "../base-email"

export interface RequestReceivedEmailProps {
  patientName: string
  requestType: string
  amount: string
  requestId: string
  isGuest?: boolean
  appUrl?: string
}

export function requestReceivedSubject(requestType: string) {
  return `All sorted — your ${requestType} is with a doctor now 👍`
}

export function RequestReceivedEmail({
  patientName,
  requestType,
  amount,
  requestId,
  isGuest,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: RequestReceivedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText={`Your ${requestType} is with a doctor — we'll be in touch shortly`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="You're all set 👍"
        subtitle={`${requestType} — ${amount}`}
        variant="info"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Payment confirmed — your <strong>{requestType}</strong> is now with
        a doctor. We&apos;ll email you the moment there&apos;s an update.
      </Text>

      <Box>
        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
          <tbody>
            <DetailRow label="Reference" value={requestId.slice(0, 8).toUpperCase()} />
            <DetailRow label="Amount paid" value={amount} />
            <DetailRow label="Status" value="In review" />
          </tbody>
        </table>
      </Box>

      <Box>
        <Heading as="h3">What happens next</Heading>
        <List
          items={[
            "A doctor reviews your request (usually within an hour)",
            "You'll get an email as soon as it's done",
            "No phone call needed — we'll reach out if anything else is required",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/patient/intakes/${requestId}`}>
        Track your request
      </Button>

      {isGuest && (
        <Box>
          <Heading as="h3">Save your details for next time</Heading>
          <Text small>
            Create a free account to track your request, download documents, and reorder faster.
          </Text>
          <Button href={`${appUrl}/auth/complete-account?intake_id=${requestId}`}>
            Create account
          </Button>
          <Text muted small style={{ textAlign: "center" as const }}>
            No pressure — your certificate will be emailed to you either way.
          </Text>
        </Box>
      )}

      <Text muted small>
        Questions? Just reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help centre
        </a>
        .
      </Text>
    </BaseEmail>
  )
}
