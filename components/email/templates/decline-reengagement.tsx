/**
 * Decline Re-Engagement Email
 *
 * Sent ~2 hours after a request is declined.
 * Suggests alternative services, GP visit, or contacting support.
 */

import {
  BaseEmail,
  HeroBlock,
  Heading,
  Text,
  Button,
  Box,
  List,
  colors,
} from "../base-email"

export interface DeclineReengagementEmailProps {
  patientName: string
  declinedService: string
  appUrl?: string
}

export function declineReengagementSubject() {
  return "We're still here to help — other options for you"
}

export function DeclineReengagementEmail({
  patientName,
  declinedService,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: DeclineReengagementEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText="Your request was declined, but we may still be able to help."
      appUrl={appUrl}
      showFooterReview={false}
    >
      <HeroBlock
        icon="💡"
        headline="We may still be able to help"
        variant="info"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        We know it&apos;s not the answer you were hoping for — your{" "}
        <strong>{declinedService}</strong> request couldn&apos;t be approved
        through our service this time.
      </Text>

      <Text>
        That doesn&apos;t mean you&apos;re out of options. Here are some next
        steps:
      </Text>

      <Box>
        <Heading as="h3">What you can do</Heading>
        <List
          items={[
            "Try a different service — we offer medical certificates, prescriptions, and specialist consultations",
            "Visit your regular GP for an in-person assessment",
            "Contact our support team if you have questions about the decision",
          ]}
        />
      </Box>

      <Button href={`${appUrl}/request`}>Explore other services</Button>

      <Text muted small>
        Need to talk?{" "}
        <a
          href={`${appUrl}/contact`}
          style={{ color: colors.accent, fontWeight: 500 }}
        >
          Get in touch
        </a>{" "}
        — our team is here 7 days a week.
      </Text>
    </BaseEmail>
  )
}
