import {
  BaseEmail,
  Box,
  Button,
  colors,
  HeroBlock,
  Text,
} from "../base-email"

export interface AbandonedCheckoutFollowupProps {
  patientName: string
  serviceName: string
  resumeUrl: string
  appUrl?: string
}

export function abandonedCheckoutFollowupSubject(serviceName: string) {
  return `Last call! Your ${serviceName} expires soon`
}

export function AbandonedCheckoutFollowupEmail({
  patientName,
  serviceName,
  resumeUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: AbandonedCheckoutFollowupProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText={`Your ${serviceName} request won't be saved much longer`} appUrl={appUrl}>
      <HeroBlock
        icon="⚡"
        headline="Your request expires soon"
        variant="warning"
      />

      <Text>Hi {firstName},</Text>
      <Text>
        Just a heads up, your <strong>{serviceName}</strong> request is still waiting,
        but we can&apos;t hold it forever. Most people finish in under 2 minutes.
      </Text>

      <Box>
        <Text style={{ margin: 0, fontSize: "14px", color: colors.textBody }}>
          <strong>1,200+ Australians</strong> used InstantMed this month for fast,
          hassle-free medical documents. No phone call, no waiting room.
        </Text>
      </Box>

      <Button href={resumeUrl}>Complete your request</Button>

      <Text muted small>
        If you&apos;ve already sorted this out or changed your mind, no worries.
        Just ignore this email.
      </Text>

    </BaseEmail>
  )
}
