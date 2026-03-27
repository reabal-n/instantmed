/**
 * Follow-Up Reminder Email Template
 *
 * Sent 72–96 hours after a medical certificate is approved.
 * One-time touchpoint — gentle check-in, surfaces the consult product.
 */

import { COMPANY_NAME, ABN } from "@/lib/constants"

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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #44403C; margin: 0; padding: 0; background-color: #FAFAF9; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAFAF9;">
    <tr>
      <td style="padding: 48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E7E5E4; overflow: hidden;">
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <a href="${appUrl}" style="text-decoration: none;">
                <img src="${appUrl}/branding/logo.png" alt="InstantMed" width="130" style="display: block; border: 0; outline: none; max-width: 130px; height: auto;" />
              </a>
            </td>
          </tr>
          <tr><td style="padding: 20px 40px 0 40px;"><div style="border-top: 1px solid #F5F5F4;"></div></td></tr>
          <tr>
            <td style="padding: 28px 40px 36px 40px;">
              <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">Hi ${firstName},</p>
              <p style="font-size: 15px; color: #44403C; margin: 0 0 16px 0;">
                Just checking in. It's been a few days since your medical certificate was approved —
                hope you're on the mend.
              </p>
              <p style="font-size: 15px; color: #44403C; margin: 0 0 24px 0;">
                If symptoms are hanging around or you need ongoing care, a GP consultation might be
                worth considering. Same process — fill in a form, a doctor reviews it.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px auto; width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${consultUrl}" style="display: inline-block; background-color: #0D9488; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Start a consultation</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #A8A29E; text-align: center; margin: 0 0 16px 0;">GP consultations from $49.95</p>
              <p style="font-size: 13px; color: #78716C; margin: 0 0 20px 0;">
                If you're all good — great. No action needed.
              </p>
              <p style="font-size: 12px; color: #A8A29E; margin: 0;">
                To stop these check-in emails, <a href="${unsubscribeUrl}" style="color: #0D9488; text-decoration: none;">unsubscribe here</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #F5F5F4; background: #FAFAF9;">
              <p style="color: #A8A29E; font-size: 12px; text-align: center; margin: 0 0 6px 0;">
                Made with care in Australia 🌤️
              </p>
              <p style="color: #A8A29E; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                <a href="${appUrl}/privacy" style="color: #A8A29E; text-decoration: none;">Privacy</a>
                <span style="margin: 0 6px; color: #E7E5E4;">&middot;</span>
                <a href="${appUrl}/terms" style="color: #A8A29E; text-decoration: none;">Terms</a>
              </p>
              <p style="color: #A8A29E; font-size: 11px; text-align: center; margin: 0 0 4px 0;">
                ${COMPANY_NAME} &middot; ABN ${ABN}
              </p>
              <p style="color: #A8A29E; font-size: 11px; text-align: center; margin: 0;">
                Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010
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
