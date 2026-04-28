import {
  BaseEmail,
  Box,
  Button,
  Heading,
  HeroBlock,
  List,
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
  return `Your ${serviceName.toLowerCase()} is still here. Finish in 90 seconds.`
}

/**
 * Partial intake recovery email. Sent ~1 hour after a user starts an intake
 * (and has provided email) but doesn't complete it. Industry-standard 5-15%
 * recovery rate.
 *
 * Calm, low-pressure tone. No countdown timers or guilt language. The whole
 * point of the brand voice is that getting a cert should feel easy, not
 * harassed.
 */
export function PartialIntakeRecoveryEmail({
  firstName,
  serviceName,
  resumeUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PartialIntakeRecoveryEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,"

  return (
    <BaseEmail previewText={`Your ${serviceName.toLowerCase()} request is still saved`} appUrl={appUrl}>
      <HeroBlock
        icon="📝"
        headline="Picking up where you left off"
        variant="info"
      />

      <Text>{greeting}</Text>
      <Text>
        You started a <strong>{serviceName}</strong> request earlier today and
        didn&apos;t quite finish. Everything you entered is saved. Most people
        wrap up the rest in under 90 seconds.
      </Text>

      <Button href={resumeUrl}>Continue your request</Button>

      <Box>
        <Heading as="h3">If you do come back</Heading>
        <List
          items={[
            "A real Australian GP reviews your request",
            "Average review time is around 20 minutes",
            "Your certificate is emailed to you as a PDF",
            "Full refund if our doctor cannot help",
          ]}
        />
      </Box>

      <Text muted small>
        Already finished, or sorted things another way? You can safely ignore
        this email and nothing else will arrive from us.
      </Text>
    </BaseEmail>
  )
}
