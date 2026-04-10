/**
 * Request Received Email Template
 *
 * Sent after Stripe payment succeeds. Combines payment receipt (invoice)
 * with review status in a single email.
 */

import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  Box,
  DetailRow,
  colors,
} from "../base-email"
import { COMPANY_NAME, ABN } from "@/lib/constants"

export interface RequestReceivedEmailProps {
  patientName: string
  requestType: string
  amount: string
  requestId: string
  isGuest?: boolean
  paidAt?: string
  appUrl?: string
}

export function requestReceivedSubject(requestType: string) {
  return `All sorted — your ${requestType} is with a doctor 👍`
}

export function RequestReceivedEmail({
  patientName,
  requestType,
  amount,
  requestId,
  isGuest,
  paidAt,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: RequestReceivedEmailProps) {
  const firstName = patientName.split(" ")[0]
  const dateStr = paidAt || new Date().toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <BaseEmail
      previewText={`Payment confirmed · ${requestType} · ${amount} — a doctor is on it now`}
      appUrl={appUrl}
      showFooterReview={false}
    >
      <HeroBlock
        icon="✓"
        headline="You&apos;re all set 👍"
        subtitle={`${requestType} · ${amount}`}
        variant="info"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Payment confirmed — your <strong>{requestType}</strong> is with a doctor now.
        We&apos;ll email you the moment it&apos;s done, usually within the hour.
      </Text>

      {/* Tax receipt */}
      <Box>
        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "11px",
            fontWeight: "700",
            color: colors.textSecondary,
            textTransform: "uppercase" as const,
            letterSpacing: "1px",
          }}
        >
          Tax Receipt · {COMPANY_NAME} · ABN {ABN}
        </p>
        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
          <tbody>
            <DetailRow label="Service" value={requestType} bold />
            <DetailRow label="Amount paid" value={amount} bold />
            <DetailRow label="GST included" value={`$${(parseFloat(amount.replace(/[^0-9.]/g, "")) / 11).toFixed(2)}`} />
            <DetailRow label="Date" value={dateStr} />
            <DetailRow label="Reference" value={requestId.slice(0, 8).toUpperCase()} mono />
          </tbody>
        </table>
      </Box>

      <Button href={`${appUrl}/track/${requestId}`}>
        Track your request
      </Button>

      {isGuest && (
        <Text small muted style={{ textAlign: "center" as const }}>
          Want to track this on your dashboard?{" "}
          <a href={`${appUrl}/auth/complete-account?intake_id=${requestId}`} style={{ color: colors.accent, fontWeight: 500 }}>
            Create a free account
          </a>
        </Text>
      )}
    </BaseEmail>
  )
}
