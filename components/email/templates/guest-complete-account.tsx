import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  Box,
  List,
  colors,
} from "../base-email"

export interface GuestCompleteAccountEmailProps {
  patientName: string
  requestType: string
  intakeId: string
  completeAccountUrl: string
  appUrl?: string
}

export function guestCompleteAccountSubject(requestType: string) {
  return `Your ${requestType} is underway — set up your account to track it`
}

export function GuestCompleteAccountEmail({
  patientName,
  requestType,
  intakeId: _intakeId,
  completeAccountUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: GuestCompleteAccountEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText={`Set up your account to track your ${requestType} ✅`} appUrl={appUrl}>
      <HeroBlock
        icon="👤"
        headline="Create your InstantMed account"
        variant="neutral"
      />

      <Text>Hi {firstName},</Text>
      <Text>
        Your {requestType} request is underway. Set up a free account to track
        it in real-time, download your documents, and reorder in seconds next
        time.
      </Text>

      <List
        items={[
          "Track your request status in real-time",
          "Download your certificate instantly when ready",
          "Access your medical history",
          "Request future certificates faster",
        ]}
      />

      <Button href={completeAccountUrl}>Create Your Account</Button>

      <Box variant="info">
        <p style={{ margin: 0, fontSize: "13px", color: colors.infoText }}>
          No pressure — your certificate will be emailed to you when it&apos;s ready,
          even if you don&apos;t create an account.
        </p>
      </Box>

      <Text muted small>
        Questions? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help centre
        </a>
        .
      </Text>
    </BaseEmail>
  )
}
