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
        <a href={`${appUrl}/contact`} style={{ color: "#3B82F6", fontWeight: 500 }}>
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
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1A1A1A; margin: 0; padding: 0; background-color: #F8F9FA; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #F8F9FA;">
    <tr>
      <td style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px;">
              <a href="${baseUrl}" style="text-decoration: none; font-size: 18px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.3px;">InstantMed</a>
            </td>
          </tr>
          <tr><td style="padding: 0 32px;"><div style="border-top: 1px solid #F3F4F6;"></div></td></tr>
          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              <!-- Status -->
              <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="color: #059669; font-size: 15px; margin: 0; font-weight: 600;">Your medical certificate is ready</p>
              </div>
              
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px 0;">Hi ${patientName},</p>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 24px 0;">
                Your Medical Certificate from InstantMed is ready to download from your dashboard.
              </p>
              
              <div style="margin: 24px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #1A1A1A; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Dashboard</a>
              </div>
              
              ${verificationCode ? `
              <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #059669; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Verification Code</p>
                <p style="margin: 0; font-size: 20px; font-family: monospace; font-weight: bold; color: #059669; letter-spacing: 3px;">${verificationCode}</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #9CA3AF;">
                  Employers can verify at <a href="${verifyUrl}" style="color: #3B82F6;">${verifyUrl.replace('https://', '')}</a>
                </p>
              </div>
              ` : ''}
              
              <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1A1A1A;">What happens next?</p>
                <ul style="margin: 0; padding-left: 20px; color: #4B5563; font-size: 13px; line-height: 1.7;">
                  <li style="margin-bottom: 4px;">Download your certificate from your dashboard</li>
                  <li style="margin-bottom: 4px;">Forward it to your employer, university, or relevant institution</li>
                  <li>Keep a copy for your records</li>
                </ul>
              </div>
              
              <p style="font-size: 13px; color: #9CA3AF; margin: 20px 0 0 0;">
                Questions? Reply to this email or visit our <a href="${baseUrl}/contact" style="color: #3B82F6; font-weight: 500;">help centre</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #F3F4F6; background: #FAFAFA;">
              <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                <a href="${baseUrl}/privacy" style="color: #9CA3AF; text-decoration: underline;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="${baseUrl}/terms" style="color: #9CA3AF; text-decoration: underline;">Terms</a>
                &nbsp;&middot;&nbsp;
                <a href="${baseUrl}/account?tab=notifications" style="color: #9CA3AF; text-decoration: underline;">Preferences</a>
              </p>
              <p style="color: #9CA3AF; font-size: 11px; text-align: center; margin: 0;">
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
