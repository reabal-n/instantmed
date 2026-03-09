/**
 * Request Received Email Template (merged payment-confirmed + intake-submitted)
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
  return `Your ${requestType} request has been received`
}

export function RequestReceivedEmail({
  patientName,
  requestType,
  amount,
  requestId,
  isGuest,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: RequestReceivedEmailProps) {
  return (
    <BaseEmail
      previewText={`Your ${requestType} request is being reviewed 👍`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="Request received"
        subtitle={`${requestType} — ${amount}`}
        variant="info"
      />

      <Text>Hi {patientName},</Text>

      <Text>
        Your payment has been confirmed and your <strong>{requestType}</strong> request
        is with a doctor for review. Most requests are reviewed within a couple of hours.
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
            "A doctor reviews your request (typically within 1\u20132 hours)",
            "You\u2019ll receive an email once a decision is made",
            "If any follow-up is needed, the doctor will reach out",
          ]}
        />
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`}>
          Track Your Request
        </Button>
      </div>

      {isGuest && (
        <Text muted small style={{ textAlign: "center" as const }}>
          <a href={`${appUrl}/auth/complete-account?intake_id=${requestId}`} style={{ color: colors.accent, fontWeight: 500 }}>
            Create your account
          </a>{" "}
          to track your request and download your certificate when it&apos;s ready.
        </Text>
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
