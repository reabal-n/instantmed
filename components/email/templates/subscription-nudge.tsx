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
import { COMPANY_NAME, ABN } from "@/lib/constants"

export interface SubscriptionNudgeEmailProps {
  patientName: string
  appUrl?: string
}

export const subscriptionNudgeSubject = "Time for your next script? Save with a subscription"

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
        Not ready yet? No worries — this is just a reminder. You can request
        a one-off script anytime.
      </Text>

      <Text muted small>
        Questions? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help centre
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

/**
 * Render to HTML string for cron job
 */
export function renderSubscriptionNudgeEmail(props: SubscriptionNudgeEmailProps): string {
  const { patientName, appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au" } = props
  const firstName = patientName.split(" ")[0]

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #475569; margin: 0; padding: 0; background-color: #F8F7F4; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #F8F7F4;">
    <tr>
      <td style="padding: 48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              <a href="${appUrl}" style="text-decoration: none;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 10px;">
                      <img src="${appUrl}/branding/logo.png" alt="InstantMed" width="36" height="36" style="display: block; border: 0; outline: none; width: 36px; height: 36px; border-radius: 8px;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <img src="${appUrl}/branding/wordmark.png" alt="InstantMed" width="130" style="display: block; border: 0; outline: none; max-width: 130px; height: auto;" />
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>
          <tr><td style="padding: 0 40px;"><div style="border-top: 1px solid #F1F5F9;"></div></td></tr>
          <tr>
            <td style="padding: 32px 40px 40px 40px;">
              <p style="font-size: 15px; color: #475569; margin: 0 0 16px 0;">Hi ${firstName},</p>
              <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0;">
                It's been about a month since your last repeat prescription. If you
                need your script again, you can save by switching to a monthly subscription.
              </p>
              <div style="background: #F5F7F9; border-radius: 10px; padding: 20px 24px; margin: 0 0 24px 0; border: 1px solid #E2E8F0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1E293B;">Why subscribe?</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; font-size: 14px; color: #475569;">
                  <tr>
                    <td style="padding: 8px 0;">One-off repeat script</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">$29.95</td>
                  </tr>
                  <tr style="border-top: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; color: #2563EB; font-weight: 600;">Monthly subscription</td>
                    <td style="padding: 8px 0; text-align: right; color: #2563EB; font-weight: 600;">$19.95/mo</td>
                  </tr>
                </table>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #94A3B8;">
                  That's <strong>$10 off every month</strong>. Cancel anytime from your dashboard.
                </p>
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px auto; width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${appUrl}/request?service=prescription" style="display: inline-block; background-color: #2563EB; color: #ffffff; padding: 16px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 2px 8px rgba(37,99,235,0.25);">Get your next script</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #94A3B8; margin: 24px 0 8px 0;">
                Not ready yet? No worries — this is just a reminder. You can request a one-off script anytime.
              </p>
              <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                Questions? Reply to this email or visit our <a href="${appUrl}/contact" style="color: #2563EB; font-weight: 500; text-decoration: none;">help centre</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #F1F5F9; background: #F8F7F4;">
              <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 0 0 6px 0;">
                Made with care in Australia
              </p>
              <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                <a href="${appUrl}/privacy" style="color: #94A3B8; text-decoration: none;">Privacy</a>
                <span style="margin: 0 6px; color: #E2E8F0;">&middot;</span>
                <a href="${appUrl}/terms" style="color: #94A3B8; text-decoration: none;">Terms</a>
              </p>
              <p style="color: #94A3B8; font-size: 11px; text-align: center; margin: 0;">
                ${COMPANY_NAME} &middot; ABN ${ABN}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
