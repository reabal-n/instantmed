import {
  APP_URL,
  BaseEmail,
  Box,
  Button,
  Heading,
  HeroBlock,
  List,
  NameFirstGreeting,
  Text,
} from "../base-email"

export interface AbandonedCheckoutEmailProps {
  patientName: string
  serviceName: string
  resumeUrl: string
  appUrl?: string
  startedAgoLabel: string
}

export function abandonedCheckoutSubject(serviceName: string) {
  void serviceName
  return "Complete your request"
}

export function AbandonedCheckoutEmail({
  patientName,
  serviceName,
  resumeUrl,
  appUrl = APP_URL,
  startedAgoLabel,
}: AbandonedCheckoutEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="Payment is still open if you need this request" appUrl={appUrl}>
      <HeroBlock
        icon="IM"
        headline="Payment is still open"
        variant="info"
      />

      <NameFirstGreeting name={firstName} />
      <Text>
        You started a <strong>{serviceName}</strong> request {startedAgoLabel}{" "}
        and stopped before payment. If you still need it, return to the saved
        request and finish payment.
      </Text>

      <Button href={resumeUrl}>Return to payment</Button>

      <Box>
        <Heading as="h3">What happens next</Heading>
        <List
          items={[
            "A doctor reviews your request",
            "Full refund if the doctor declines",
            "We contact you only if more information is clinically needed",
          ]}
        />
      </Box>

      <Text muted small>
        Already finished or changed your mind? You can ignore this email.
      </Text>
    </BaseEmail>
  )
}
