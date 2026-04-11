/**
 * Subscription Nudge Email Template — Day 30 post-approval
 *
 * Sent to repeat Rx patients who aren't on a subscription.
 * Shows savings comparison and links to start a new request.
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
  Box,
  Heading,
  colors,
} from "../base-email"

export interface SubscriptionNudgeEmailProps {
  patientName: string
  appUrl?: string
}

export const subscriptionNudgeSubject = "Time for your next script? Save on every refill"

export function SubscriptionNudgeEmail({
  patientName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: SubscriptionNudgeEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="Save $10/month with a repeat prescription subscription" appUrl={appUrl}>
      <Text>Hi {firstName},</Text>

      <Text>
        It&apos;s been about a month since your last repeat prescription. If you
        need your script again, you can save by switching to a monthly subscription.
      </Text>

      <Box>
        <Heading as="h3">Why subscribe?</Heading>
        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          style={{ width: "100%", fontSize: "14px", color: colors.textBody }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "8px 0" }}>One-off repeat script</td>
              <td style={{ padding: "8px 0", textAlign: "right" as const, fontWeight: 600 }}>$29.95</td>
            </tr>
            <tr style={{ borderTop: `1px solid ${colors.borderLight}` }}>
              <td style={{ padding: "8px 0", color: colors.accent, fontWeight: 600 }}>Monthly subscription</td>
              <td style={{ padding: "8px 0", textAlign: "right" as const, color: colors.accent, fontWeight: 600 }}>$19.95/mo</td>
            </tr>
          </tbody>
        </table>
        <Text muted small style={{ margin: "8px 0 0 0" }}>
          That&apos;s <strong>$10 off every month</strong>. Cancel anytime from your dashboard.
        </Text>
      </Box>

      <Button href={`${appUrl}/request?service=prescription`}>
        Get your next script
      </Button>

      <Text muted small>
        Not ready yet? No worries, this is just a reminder. You can request
        a one-off script anytime.
      </Text>

    </BaseEmail>
  )
}
