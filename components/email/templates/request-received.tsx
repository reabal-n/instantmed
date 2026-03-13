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
  return `Your ${requestType} request has been received ✨`
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
      previewText={`All sorted — your ${requestType} request is with a doctor now ✨`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="You're all set ✨"
        subtitle={`${requestType} — ${amount}`}
        variant="info"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Payment confirmed — your <strong>{requestType}</strong> request is
        now with a doctor for review. Most requests are wrapped up within a
        couple of hours, and we&apos;ll email you the moment there&apos;s an
        update.
      </Text>

      <Box>
        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
          <tbody>
            <DetailRow label="Reference" value={requestId.slice(0, 8).toUpperCase()} />
            <DetailRow label="Amount paid" value={amount} />
            <DetailRow label="Status" value="🩺 In review" />
          </tbody>
        </table>
      </Box>

      <Box>
        <Heading as="h3">What happens next</Heading>
        <List
          items={[
            "A doctor reviews your request (typically 1–2 hours)",
            "You&apos;ll get an email as soon as a decision is made",
            "If anything else is needed, the doctor will reach out directly",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/patient/intakes/${requestId}`}>
        Track Your Request
      </Button>

      {isGuest && (
        <Box>
          <Heading as="h3">Create your free account</Heading>
          <Text>
            Set up an account to get the most out of InstantMed — it only takes a minute:
          </Text>
          <List
            items={[
              "Track your request status in real-time",
              "Download your certificate the moment it's ready",
              "Access your medical history anytime",
              "Reorder faster next time",
            ]}
          />
          <Button href={`${appUrl}/auth/complete-account?intake_id=${requestId}`}>
            Create Your Account
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
