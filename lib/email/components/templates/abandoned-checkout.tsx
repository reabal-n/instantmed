import {
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
  hoursAgo: number
}

export function abandonedCheckoutSubject(serviceName: string) {
  return `Hey, you left something behind. Your ${serviceName} request is waiting`
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
    <BaseEmail previewText={`No rush, your ${serviceName} request is still here ⏱️`} appUrl={appUrl}>
      <HeroBlock
        icon="⏱️"
        headline="Your request is still here"
        variant="info"
      />

      <NameFirstGreeting name={firstName} />
      <Text>
        You started a <strong>{serviceName}</strong> request about {hoursAgo} hours ago
        but didn&apos;t finish checkout. No worries, everything is saved and
        ready when you are.
      </Text>

      <Button href={resumeUrl}>Resume your request</Button>

      <Box>
        <Heading as="h3">What happens next</Heading>
        <List
          items={[
            "A doctor reviews your request (usually within an hour)",
            "You'll receive your document via email",
            "Form-first review, with follow-up if clinically needed",
          ]}
        />
      </Box>

      <Text muted small>
        If you&apos;ve already completed your request or no longer need it,
        you can safely ignore this email.
      </Text>

    </BaseEmail>
  )
}
