import * as React from "react"
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

export interface ExitIntentReminderEmailProps {
  service: string
  price: string
  ctaUrl: string
  appUrl?: string
  /** Capture-specific unsubscribe URL (parity with emails 2/3) */
  unsubscribeUrl?: string
  /** Open-tracking pixel URL (parity with emails 2/3) */
  openTrackingUrl?: string
}

export function exitIntentReminderSubject(service: string) {
  return `Your ${service} — ready when you are`
}

const HOW_IT_WORKS: Record<string, string[]> = {
  "Medical Certificate": [
    "Fill in a short form (about 2 minutes)",
    "An AHPRA-registered doctor reviews your request",
    "Your certificate is emailed to you — usually within an hour",
  ],
  "Repeat Prescription": [
    "Fill in a short form (about 2 minutes)",
    "An AHPRA-registered doctor reviews your request",
    "Your eScript is sent straight to your phone",
  ],
  default: [
    "Fill in a short form (about 2 minutes)",
    "An AHPRA-registered doctor reviews your request",
    "You hear back — usually within an hour",
  ],
}

export function ExitIntentReminderEmail({
  service,
  price,
  ctaUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  unsubscribeUrl,
  openTrackingUrl,
}: ExitIntentReminderEmailProps) {
  const steps = HOW_IT_WORKS[service] || HOW_IT_WORKS.default

  return (
    <BaseEmail previewText={`Still thinking? Here's everything you need to get started.`} appUrl={appUrl} showFooterReview={false}>
      <HeroBlock
        icon="💭"
        headline="Still thinking it over?"
        variant="info"
      />

      <Text>
        No rush. You were looking at our <strong>{service}</strong> — here&apos;s
        a quick recap so you have everything in one place.
      </Text>

      <Box>
        <Heading as="h3">How it works</Heading>
        <List items={steps} />
      </Box>

      <Button href={ctaUrl}>Get your {service.toLowerCase()} — {price}</Button>

      <Text muted small>
        From {price}. Full refund if we can&apos;t help. No appointment or phone
        call required for most requests.
      </Text>

      {unsubscribeUrl && (
        <Text muted small style={{ textAlign: "center" as const, fontSize: "11px" }}>
          <a href={unsubscribeUrl} style={{ color: colors.textMuted, textDecoration: "underline" }}>
            Unsubscribe from these emails
          </a>
        </Text>
      )}

      {openTrackingUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={openTrackingUrl}
          alt=""
          width="1"
          height="1"
          style={{ display: "block", width: "1px", height: "1px", opacity: 0 }}
        />
      )}
    </BaseEmail>
  )
}
