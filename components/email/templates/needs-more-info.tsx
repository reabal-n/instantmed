import {
  BaseEmail,
  StatusBanner,
  Heading,
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
  return `Action needed: Additional information required for your ${requestType}`
}

export function NeedsMoreInfoEmail({
  patientName,
  requestType,
  requestId,
  doctorMessage,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: NeedsMoreInfoEmailProps) {
  return (
    <BaseEmail previewText="Action needed: Additional information required" appUrl={appUrl}>
      <StatusBanner title="We need a bit more information" variant="warning" />

      <Text>Hi {patientName},</Text>
      <Text>
        The doctor reviewing your <strong>{requestType}</strong> request needs some additional
        information before they can proceed.
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

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`}>Respond Now</Button>
      </div>

      <Text muted small>
        Please respond as soon as possible so we can continue processing your request.
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
