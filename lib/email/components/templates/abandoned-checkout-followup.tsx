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

export interface AbandonedCheckoutFollowupProps {
  patientName: string
  serviceName: string
  resumeUrl: string
  appUrl?: string
}

export function abandonedCheckoutFollowupSubject(serviceName: string) {
  void serviceName
  return "Still need this request?"
}

export function AbandonedCheckoutFollowupEmail({
  patientName,
  serviceName,
  resumeUrl,
  appUrl = APP_URL,
}: AbandonedCheckoutFollowupProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="Your saved request is still available" appUrl={appUrl}>
      <HeroBlock
        icon="IM"
        headline="Still need this request?"
        variant="info"
      />

      <NameFirstGreeting name={firstName} />
      <Text>
        Your <strong>{serviceName}</strong> request is still saved. If you need it,
        finish payment and a doctor will review it when available.
      </Text>

      <Box>
        <Heading as="h3">Before you pay</Heading>
        <List
          items={[
            "A doctor reviews your request",
            "Full refund if the doctor declines",
            "We contact you only if more information is clinically needed",
          ]}
        />
      </Box>

      <Button href={resumeUrl}>Finish payment</Button>

      <Text muted small>
        Already sorted this out or changed your mind? You can ignore this email.
      </Text>
    </BaseEmail>
  )
}
