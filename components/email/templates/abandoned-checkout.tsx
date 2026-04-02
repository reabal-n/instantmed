import {
  BaseEmail,
  Heading,
  Text,
  Button,
  Box,
  List,
  colors,
} from "../base-email"
import { COMPANY_NAME, ABN } from "@/lib/constants"

export interface AbandonedCheckoutEmailProps {
  patientName: string
  serviceName: string
  resumeUrl: string
  appUrl?: string
  hoursAgo: number
}

export function abandonedCheckoutSubject(serviceName: string) {
  return `Still thinking? Your ${serviceName} is ready when you are`
}

export function AbandonedCheckoutEmail({
  patientName,
  serviceName,
  resumeUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  hoursAgo,
}: AbandonedCheckoutEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText={`No rush — your ${serviceName} request is still here ⏱️`} appUrl={appUrl}>
      <Heading>Your request is still here</Heading>

      <Text>Hi {firstName},</Text>
      <Text>
        You started a <strong>{serviceName}</strong> request about {hoursAgo} hours ago
        but didn&apos;t finish checkout. No worries — everything is saved and
        ready when you are.
      </Text>

      <Button href={resumeUrl}>Resume your request</Button>

      <Box>
        <Heading as="h3">What happens next</Heading>
        <List
          items={[
            "A doctor reviews your request (usually within an hour)",
            "You'll receive your document via email",
            "No phone call required for most requests",
          ]}
        />
      </Box>

      <Text muted small>
        If you&apos;ve already completed your request or no longer need it,
        you can safely ignore this email.
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
 * Render the email to an HTML string (used by abandoned-checkout cron job)
 */
export function renderAbandonedCheckoutEmail(props: AbandonedCheckoutEmailProps): string {
  const { patientName, serviceName, resumeUrl, appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au", hoursAgo } = props
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
              <h1 style="font-size: 24px; font-weight: 600; color: #1E293B; margin: 0 0 16px 0; letter-spacing: -0.5px;">Your request is still here</h1>
              <p style="font-size: 15px; color: #475569; margin: 0 0 16px 0;">Hi ${firstName},</p>
              <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0;">
                You started a <strong>${serviceName}</strong> request about ${hoursAgo} hours ago
                but didn't finish checkout. No worries — everything is saved and ready when you are.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px auto; width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resumeUrl}" style="display: inline-block; background-color: #2563EB; color: #ffffff; padding: 16px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 2px 8px rgba(37,99,235,0.25);">Resume your request</a>
                  </td>
                </tr>
              </table>
              <div style="background: #F5F7F9; border-radius: 10px; padding: 20px 24px; margin: 24px 0; border: 1px solid #E2E8F0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1E293B;">What happens next</p>
                <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 14px; line-height: 1.8;">
                  <li style="margin-bottom: 4px;">A doctor reviews your request (usually within an hour)</li>
                  <li style="margin-bottom: 4px;">You'll receive your document via email</li>
                  <li>No phone call required for most requests</li>
                </ul>
              </div>
              <p style="font-size: 12px; color: #94A3B8; margin: 24px 0 8px 0;">
                If you've already completed your request or no longer need it, you can safely ignore this email.
              </p>
              <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                Questions? Reply to this email or visit our <a href="${appUrl}/contact" style="color: #2563EB; font-weight: 500; text-decoration: none;">help centre</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #F1F5F9; background: #F8F7F4;">
              <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 0 0 6px 0;">
                Made with care in Australia 🌤️
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
