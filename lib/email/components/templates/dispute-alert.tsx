import {
  APP_URL,
  BaseEmail,
  Box,
  Button,
  Heading,
  StatusBanner,
  Text,
} from "../base-email"

export interface DisputeAlertEmailProps {
  disputeId: string
  chargeId: string
  intakeId?: string
  amount: string
  reason: string
  evidenceDueBy?: string
  stripeDashboardUrl: string
  appUrl?: string
}

export function disputeAlertSubject() {
  return "Urgent: Stripe dispute requires review"
}

export function DisputeAlertEmail({
  disputeId,
  chargeId,
  intakeId,
  amount,
  reason,
  evidenceDueBy,
  stripeDashboardUrl,
  appUrl = APP_URL,
}: DisputeAlertEmailProps) {
  return (
    <BaseEmail
      previewText="A Stripe dispute needs immediate operational review."
      appUrl={appUrl}
    >
      <StatusBanner title="Stripe dispute created" variant="warning" />

      <Text>
        Stripe reported a payment dispute. Review the case and evidence deadline
        as soon as possible.
      </Text>

      <Box variant="error">
        <Heading as="h3">Dispute details</Heading>
        <Text small>
          <strong>Dispute:</strong> {disputeId}
          <br />
          <strong>Charge:</strong> {chargeId}
          <br />
          <strong>Intake:</strong> {intakeId || "Unknown"}
          <br />
          <strong>Amount:</strong> {amount}
          <br />
          <strong>Reason:</strong> {reason}
          <br />
          <strong>Evidence due:</strong> {evidenceDueBy || "Check Stripe Dashboard"}
        </Text>
      </Box>

      <Button href={stripeDashboardUrl}>Open dispute in Stripe</Button>
    </BaseEmail>
  )
}
