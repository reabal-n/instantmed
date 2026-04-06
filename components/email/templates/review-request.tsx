/**
 * Review Request Email Template — Day 2 post-approval
 *
 * Warm, personal ask for a Google review.
 * Sent 2 days after approval via daily cron.
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
  colors,
} from "../base-email"
import { COMPANY_NAME, ABN, GOOGLE_REVIEW_URL } from "@/lib/constants"

export interface ReviewRequestEmailProps {
  patientName: string
  serviceName: string
  appUrl?: string
}

export const reviewRequestSubject = "Quick favour? ⭐"

export function ReviewRequestEmail({
  patientName,
  serviceName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: ReviewRequestEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="If you've got 30 seconds, a review would mean the world" appUrl={appUrl}>
      <Text>Hi {firstName},</Text>

      <Text>
        Glad we could help with your <strong>{serviceName}</strong>. If you had
        a good experience, we&apos;d really appreciate a quick Google review. It
        helps other Aussies find us and takes about 30 seconds.
      </Text>

      <Button href={GOOGLE_REVIEW_URL}>Leave a Review ⭐</Button>

      <Text muted small>
        Already left one? Legend, thanks so much. You can ignore this email.
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
export function renderReviewRequestEmail(props: ReviewRequestEmailProps): string {
  const { patientName, serviceName, appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au" } = props
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
                Glad we could help with your <strong>${serviceName}</strong>. If you had
                a good experience, we'd really appreciate a quick Google review. It
                helps other Aussies find us and takes about 30 seconds.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px auto; width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${GOOGLE_REVIEW_URL}" style="display: inline-block; background-color: #2563EB; color: #ffffff; padding: 16px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 2px 8px rgba(37,99,235,0.25);">Leave a Review ⭐</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #94A3B8; margin: 24px 0 8px 0;">
                Already left one? Legend, thanks so much. You can ignore this email.
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
