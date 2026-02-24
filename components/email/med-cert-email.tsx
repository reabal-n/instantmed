/**
 * Medical Certificate Email Template
 *
 * React component that renders a professional email template for medical certificates.
 * Returns JSX or HTML string for email sending.
 */

import React from "react"
import {
  BaseEmail,
  StatusBanner,
  Text,
  Button,
  Box,
  Heading,
  List,
  VerificationCode,
  colors,
} from "./base-email"

interface MedCertEmailProps {
  patientName: string
  dashboardUrl: string
  verificationCode?: string
}

export function MedCertEmail({ patientName, dashboardUrl, verificationCode }: MedCertEmailProps) {
  const appUrl = dashboardUrl.split("/patient")[0]

  return (
    <BaseEmail previewText="Your medical certificate is ready to download" appUrl={appUrl}>
      <StatusBanner title="Your medical certificate is ready" variant="success" />

      <Text>Hi {patientName},</Text>
      <Text>
        Your Medical Certificate from InstantMed is ready to download from your dashboard.
      </Text>

      <div style={{ textAlign: "center" }}>
        <Button href={dashboardUrl}>View Dashboard</Button>
      </div>

      {verificationCode && (
        <VerificationCode code={verificationCode} verifyUrl={`${appUrl}/verify`} />
      )}

      <Box>
        <Heading as="h3">What happens next?</Heading>
        <List
          items={[
            "Download your certificate from your dashboard",
            "Forward it to your employer, university, or relevant institution",
            "Keep a copy for your records",
          ]}
        />
      </Box>

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
 * Render the email component to HTML string
 */
export function renderMedCertEmailToHtml(props: MedCertEmailProps): string {
  const { patientName, dashboardUrl, verificationCode } = props
  const baseUrl = dashboardUrl.split("/patient")[0]
  const verifyUrl = `${baseUrl}/verify`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #44403C; margin: 0; padding: 0; background-color: #FAFAF9; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAFAF9;">
    <tr>
      <td style="padding: 48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E7E5E4; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <a href="${baseUrl}" style="text-decoration: none; display: inline-block; font-size: 17px; font-weight: 700; color: #0C1220; letter-spacing: -0.4px;">
                Instant<span style="color: #0D9488;">Med</span>
              </a>
            </td>
          </tr>
          <tr><td style="padding: 20px 40px 0 40px;"><div style="border-top: 1px solid #F5F5F4;"></div></td></tr>
          <!-- Content -->
          <tr>
            <td style="padding: 28px 40px 36px 40px;">
              <!-- Status -->
              <div style="background: #F0FDFA; border: 1px solid #99F6E4; border-radius: 8px; padding: 14px 20px; margin-bottom: 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="width: 28px; vertical-align: middle;">
                      <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #0F766E; color: #ffffff; font-size: 12px; font-weight: 700; line-height: 22px; text-align: center;">✓</div>
                    </td>
                    <td style="vertical-align: middle;">
                      <p style="color: #0F766E; font-size: 14px; margin: 0; font-weight: 600; line-height: 1.4;">Your medical certificate is ready</p>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">Hi ${patientName},</p>
              <p style="font-size: 15px; color: #44403C; margin: 0 0 24px 0; line-height: 1.7;">
                Your Medical Certificate from InstantMed is ready to download from your dashboard.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td>
                    <a href="${dashboardUrl}" style="display: inline-block; background: #0C1220; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.01em;">View Dashboard</a>
                  </td>
                </tr>
              </table>

              ${verificationCode ? `
              <div style="background: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 8px; padding: 20px 24px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #78716C; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                <p style="margin: 0; font-size: 24px; font-family: 'SF Mono', 'Fira Code', Consolas, monospace; font-weight: 700; color: #1C1917; letter-spacing: 5px;">${verificationCode}</p>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #A8A29E;">
                  Verify at <a href="${verifyUrl}" style="color: #0D9488; text-decoration: none;">${verifyUrl.replace('https://', '')}</a>
                </p>
              </div>
              ` : ''}

              <div style="background: #F5F5F4; border: 1px solid #E7E5E4; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1C1917;">What happens next?</p>
                <ul style="margin: 0; padding-left: 18px; color: #44403C; font-size: 14px; line-height: 1.8;">
                  <li style="margin-bottom: 4px; padding-left: 2px;">Download your certificate from your dashboard</li>
                  <li style="margin-bottom: 4px; padding-left: 2px;">Forward it to your employer, university, or relevant institution</li>
                  <li style="padding-left: 2px;">Keep a copy for your records</li>
                </ul>
              </div>

              <p style="font-size: 13px; color: #A8A29E; margin: 20px 0 0 0;">
                Questions? Reply to this email or visit our <a href="${baseUrl}/contact" style="color: #0D9488; font-weight: 500; text-decoration: none;">help centre</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #F5F5F4; background: #FAFAF9;">
              <p style="color: #A8A29E; font-size: 12px; text-align: center; margin: 0 0 10px 0; line-height: 1.8;">
                <a href="${baseUrl}/privacy" style="color: #A8A29E; text-decoration: none;">Privacy</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${baseUrl}/terms" style="color: #A8A29E; text-decoration: none;">Terms</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${baseUrl}/contact" style="color: #A8A29E; text-decoration: none;">Contact</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${baseUrl}/account?tab=notifications" style="color: #A8A29E; text-decoration: none;">Preferences</a>
              </p>
              <p style="color: #A8A29E; font-size: 11px; text-align: center; margin: 0; letter-spacing: 0.02em;">
                InstantMed Pty Ltd &middot; ABN 64 694 559 334 &middot; Australia
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
