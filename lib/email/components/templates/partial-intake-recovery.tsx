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

export interface PartialIntakeRecoveryEmailProps {
  /** Patient's first name. May be empty if not captured yet. */
  firstName: string
  /** Display name for the service the user started ("Medical Certificate") */
  serviceName: string
  /** Deep link with the draft sessionId so the form picks up where they left off */
  resumeUrl: string
  /** App base URL for header/footer links */
  appUrl?: string
}

export function partialIntakeRecoverySubject(serviceName: string) {
  void serviceName
  return "Your request is still saved"
}

/**
 * Partial intake recovery email. Sent ~1 hour after a user starts an intake
 * and has provided email, but does not complete it.
 */
export function PartialIntakeRecoveryEmail({
  firstName,
  serviceName,
  resumeUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PartialIntakeRecoveryEmailProps) {
  return (
    <BaseEmail previewText="Your request is saved if you still need it" appUrl={appUrl}>
      <HeroBlock
        icon="IM"
        headline="Your request is still saved"
        variant="info"
      />

      <NameFirstGreeting name={firstName} />
      <Text>
        You started a <strong>{serviceName}</strong> request earlier. If you still
        need it, you can keep going from the same place.
      </Text>

      <Button href={resumeUrl}>Continue your request</Button>

      <Box>
        <Heading as="h3">If you do come back</Heading>
        <List
          items={[
            "A doctor reviews your request",
            "Full refund if the doctor declines",
            "We contact you only if more information is clinically needed",
          ]}
        />
      </Box>

      <Text muted small>
        Already finished or sorted this another way? You can ignore this email.
      </Text>
    </BaseEmail>
  )
}
