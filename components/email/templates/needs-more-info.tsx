/**
 * Needs More Info Email Template
 *
 * Sent to patient when the doctor has a follow-up question.
 */

import {
  BaseEmail,
  StatusBanner,
  Text,
  Button,
  Box,
  colors,
} from "../base-email"

export interface NeedsMoreInfoEmailProps {
  patientName: string
  requestType: string
  requestId: string
  doctorMessage: string
  appUrl?: string
}

export function needsMoreInfoSubject(requestType: string) {
  return `Quick question about your ${requestType} request`
}

export function NeedsMoreInfoEmail({
  patientName,
  requestType,
  requestId,
  doctorMessage,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: NeedsMoreInfoEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="The doctor has a quick question for you 🩺" appUrl={appUrl}>
      <StatusBanner title="The doctor has a question" variant="warning" />

      <Text>Hi {firstName},</Text>
      <Text>
        The doctor reviewing your <strong>{requestType}</strong> request needs
        a bit more information before they can move forward.
      </Text>

      <Box>
        <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td>
                <p style={{ margin: "0 0 6px 0", fontWeight: 600, fontSize: "14px", color: "#92400E" }}>
                  Message from the doctor:
                </p>
                <p style={{ margin: 0, fontSize: "14px", color: "#78350F", lineHeight: "1.7" }}>
                  {doctorMessage}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </Box>

      <Button href={`${appUrl}/patient/intakes/${requestId}`}>Respond Now</Button>

      <Text muted small>
        No rush, but responding soon helps us process your request faster.
        Your spot in the queue is saved.
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
