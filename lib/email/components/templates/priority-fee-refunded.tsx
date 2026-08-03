/**
 * Priority Fee Refunded Email Template
 *
 * Sent once when a priority request is still undecided past the internal
 * priority window (PRIORITY_BREACH_HOURS) and the fee has been auto-refunded.
 * Transactional: tells the patient money moved and resets expectations without
 * promising a turnaround time (no review-hours windows, no SLA).
 */

import * as React from "react"

import { PRICING_DISPLAY } from "@/lib/constants"

import {
  APP_URL,
  BaseEmail,
  Box,
  Button,
  HeroBlock,
  NameFirstGreeting,
  Text,
} from "../base-email"

export interface PriorityFeeRefundedEmailProps {
  patientName: string
  requestType: string
  requestId: string
  requestAccessUrl: string
  appUrl?: string
}

export function PriorityFeeRefundedEmail({
  patientName,
  requestType,
  requestAccessUrl,
  appUrl = APP_URL,
}: PriorityFeeRefundedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText={`We've refunded your ${PRICING_DISPLAY.PRIORITY_FEE} priority fee`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="↩️"
        headline="Priority fee refunded"
        subtitle={`Your ${requestType} is still in the queue`}
        variant="info"
      />

      <NameFirstGreeting name={firstName} />

      <Text>
        Your <strong>{requestType}</strong> is taking longer than priority should.
        That&apos;s on us, so we&apos;ve refunded your {PRICING_DISPLAY.PRIORITY_FEE} priority
        fee to your original payment method. Nothing for you to do.
      </Text>

      <Box variant="info">
        <Text small style={{ margin: 0 }}>
          Your request hasn&apos;t gone anywhere: it&apos;s still with our doctors, and
          we&apos;ll email you the moment the review is done. Refunds usually reach
          your statement within 5&ndash;10 business days.
        </Text>
      </Box>

      <Button href={requestAccessUrl} variant="secondary">
        Check your request
      </Button>

    </BaseEmail>
  )
}

export const priorityFeeRefundedSubject = () => "We've refunded your priority fee"
