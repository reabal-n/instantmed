/**
 * Subscription Cancelled Email Template
 *
 * Sent to patients when their Repeat Rx subscription is cancelled
 * (triggered by customer.subscription.deleted webhook).
 */

import * as React from "react"

import {
  BaseEmail,
  Box,
  Button,
  colors,
  StatusBanner,
  NameFirstGreeting,
  Text,
} from "../base-email"

export interface SubscriptionCancelledEmailProps {
  patientName: string
  currentPeriodEnd: string
  appUrl?: string
}

export const subscriptionCancelledSubject = "Your Repeat Rx subscription has been cancelled"

export function SubscriptionCancelledEmail({
  patientName,
  currentPeriodEnd,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: SubscriptionCancelledEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="Your subscription has been cancelled. You can resubscribe anytime." appUrl={appUrl}>
      <StatusBanner title="Your subscription has been cancelled" variant="info" />

      <NameFirstGreeting name={firstName} />

      <Text>
        We&apos;ve confirmed that your Repeat Rx subscription has been cancelled.
      </Text>

      <Box>
        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          style={{ width: "100%", fontSize: "14px", color: colors.textBody }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: 600, color: colors.text }}>
                Current billing period ends
              </td>
              <td style={{ padding: "8px 0", textAlign: "right" as const }}>
                {currentPeriodEnd}
              </td>
            </tr>
          </tbody>
        </table>
        <Text muted small style={{ margin: "8px 0 0 0" }}>
          Your subscription access continues until the end of your current period.
          No further charges will be made.
        </Text>
      </Box>

      <Text>
        You can resubscribe at any time from your patient dashboard if you change your mind.
      </Text>

      <Button href={`${appUrl}/patient`}>
        Go to my dashboard
      </Button>

      <Text muted small>
        If you did not request this cancellation, or if you have any questions,
        please reply to this email or contact us at{" "}
        <a href="mailto:support@instantmed.com.au" style={{ color: colors.accent }}>
          support@instantmed.com.au
        </a>
        .
      </Text>
    </BaseEmail>
  )
}
