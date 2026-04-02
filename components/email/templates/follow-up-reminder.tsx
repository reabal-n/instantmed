/**
 * Follow-Up Reminder Email Template
 *
 * Sent 72–96 hours after a medical certificate is approved.
 * One-time touchpoint — gentle check-in, surfaces the consult product.
 */

import { COMPANY_NAME, ABN, GOOGLE_REVIEW_URL } from "@/lib/constants"

export interface FollowUpReminderEmailProps {
  patientName: string
  appUrl?: string
}

export const followUpReminderSubject = "Checking in — how are you feeling?"

/**
 * Render the follow-up reminder email to an HTML string.
 * Used by the follow-up-reminder cron job.
 */
export function renderFollowUpReminderEmail(props: FollowUpReminderEmailProps): string {
  const {
    patientName,
    appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  } = props

  const firstName = patientName.split(" ")[0]
  const consultUrl = `${appUrl}/request?service=consult`
  const unsubscribeUrl = `${appUrl}/patient/settings?unsubscribe=marketing`

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
              <p style="font-size: 15px; color: #475569; margin: 0 0 16px 0;">
                Just checking in. It's been a few days since your medical certificate was approved —
                hope you're on the mend.
              </p>
              <p style="font-size: 15px; color: #475569; margin: 0 0 24px 0;">
                If symptoms are hanging around or you need ongoing care, a GP consultation might be
                worth considering. Same process — fill in a form, a doctor reviews it.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px auto; width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${consultUrl}" style="display: inline-block; background-color: #2563EB; color: #ffffff; padding: 16px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 2px 8px rgba(37,99,235,0.25);">Start a consultation</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 0 0 16px 0;">GP consultations from $49.95</p>
              <div style="text-align: center; padding: 16px 0 4px; border-top: 1px solid #F1F5F9; margin: 4px 0 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #1E293B; line-height: 1.6;">
                  ⭐ Happy with InstantMed?&#32;<a href="${GOOGLE_REVIEW_URL}" style="color: #2563EB; font-weight: 600; text-decoration: none;">Leave a quick Google review</a>&#32;— takes 30 seconds.
                </p>
              </div>
              <p style="font-size: 13px; color: #64748B; margin: 0 0 20px 0;">
                If you're all good — great. No action needed.
              </p>
              <p style="font-size: 13px; color: #64748B; margin: 0 0 20px 0;">
                Know someone who could use us?
                <a href="${appUrl}/patient" style="color: #2563EB; text-decoration: none; font-weight: 500;">Refer a friend</a>
                and you both get $5 off your next request.
              </p>
              <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                To stop these check-in emails, <a href="${unsubscribeUrl}" style="color: #2563EB; text-decoration: none;">unsubscribe here</a>.
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
