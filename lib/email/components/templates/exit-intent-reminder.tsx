import {
  BaseEmail,
  Box,
  Button,
  Heading,
  List,
  Text,
} from "../base-email"

export interface ExitIntentReminderEmailProps {
  service: string
  price: string
  ctaUrl: string
  appUrl?: string
}

export function exitIntentReminderSubject(service: string) {
  return `Your ${service} is ready when you are`
}

export function ExitIntentReminderEmail({
  service,
  price,
  ctaUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: ExitIntentReminderEmailProps) {
  return (
    <BaseEmail previewText={`Still thinking? Here's everything you need to get started.`} appUrl={appUrl}>
      <Heading>Still thinking it over?</Heading>

      <Text>
        No rush. You were looking at our <strong>{service}</strong>, here&apos;s
        a quick recap so you have everything in one place.
      </Text>

      <Box>
        <Heading as="h3">How it works</Heading>
        <List
          items={[
            "Fill in a short form (about 2 minutes)",
            "An AHPRA-registered doctor reviews your request",
            "Your certificate is emailed to you, usually within an hour",
          ]}
        />
      </Box>

      <Button href={ctaUrl}>Get your {service.toLowerCase()}, {price}</Button>

      <Text muted small>
        From {price}. Full refund if we can&apos;t help. No appointment to book;
        the doctor follows up if clinically needed.
      </Text>
    </BaseEmail>
  )
}
