import {
  BaseEmail,
  Box,
  Button,
  colors,
  Heading,
  Text,
} from "../base-email"

export interface ExitIntentLastChanceEmailProps {
  service: string
  price: string
  ctaUrl: string
  appUrl?: string
  unsubscribeUrl?: string
  openTrackingUrl?: string
}

export function exitIntentLastChanceSubject(service: string) {
  return `Still need that ${service.toLowerCase()}?`
}

export function ExitIntentLastChanceEmail({
  service,
  price,
  ctaUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  unsubscribeUrl,
  openTrackingUrl,
}: ExitIntentLastChanceEmailProps) {
  return (
    <BaseEmail previewText={`Your ${service.toLowerCase()} is a 2-minute form away.`} appUrl={appUrl}>
      <Heading>We&apos;re here when you&apos;re ready</Heading>

      <Text>
        Just a quick note, your <strong>{service}</strong> request is still
        available whenever suits you. No pressure, no expiry.
      </Text>

      <Box>
        <Text style={{ margin: 0 }}>
          <strong>{service}</strong>, from {price}
          <br />
          <span style={{ fontSize: "13px", color: colors.textSecondary }}>
            2-minute form · Doctor-reviewed · Full refund if we can&apos;t help
          </span>
        </Text>
      </Box>

      <Text>
        If your situation has changed or you found another option, no worries at
        all. We won&apos;t email you about this again.
      </Text>

      <Button href={ctaUrl}>Start your request</Button>

      <Text muted small>
        This is the last email in this series. If you&apos;d like to get in touch,{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, textDecoration: "none" }}>
          we&apos;re always available
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
