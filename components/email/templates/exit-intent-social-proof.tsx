import {
  BaseEmail,
  Heading,
  Text,
  Button,
  Box,
  List,
  colors,
} from "../base-email"

export interface ExitIntentSocialProofEmailProps {
  service: string
  price: string
  ctaUrl: string
  appUrl?: string
  unsubscribeUrl?: string
  openTrackingUrl?: string
}

export function exitIntentSocialProofSubject() {
  return "97% of requests approved within an hour"
}

export function ExitIntentSocialProofEmail({
  service,
  price,
  ctaUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  unsubscribeUrl,
  openTrackingUrl,
}: ExitIntentSocialProofEmailProps) {
  return (
    <BaseEmail previewText="Here's what happens after you hit submit." appUrl={appUrl}>
      <Heading>Here&apos;s what actually happens</Heading>

      <Text>
        You were looking at our <strong>{service}</strong> yesterday, fair enough
        if you wanted to think it over. Here&apos;s how it works for most people:
      </Text>

      <Box>
        <Heading as="h3">The numbers</Heading>
        <List
          items={[
            "97% of requests approved within an hour",
            "Average review time: 32 minutes",
            "Full refund if our doctors can't help",
          ]}
        />
      </Box>

      <Text>
        Every request is reviewed by an AHPRA-registered doctor. No bots, no
        shortcuts. You fill in a 2-minute form, a real doctor reviews it,
        and your document lands in your inbox. That&apos;s it.
      </Text>

      <Text muted small>
        No phone call required for most requests. No appointment to book. Just a
        straightforward online process.
      </Text>

      <Button href={ctaUrl}>Get your {service.toLowerCase()}, {price}</Button>

      <Text muted small>
        Questions? Reply to this email or visit{" "}
        <a href={`${appUrl}/faq`} style={{ color: colors.accent, textDecoration: "none" }}>
          our FAQ
        </a>
        .
      </Text>

      {unsubscribeUrl && (
        <Text muted small style={{ textAlign: "center" as const, marginTop: "24px" }}>
          <a href={unsubscribeUrl} style={{ color: "#A8A29E", textDecoration: "underline", fontSize: "11px" }}>
            Unsubscribe from these reminders
          </a>
        </Text>
      )}

      {/* Open tracking pixel */}
      {openTrackingUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={openTrackingUrl}
          alt=""
          width="1"
          height="1"
          style={{ display: "block", width: "1px", height: "1px", border: "0" }}
        />
      )}
    </BaseEmail>
  )
}
