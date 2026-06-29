import {
  BaseEmail,
  Box,
  Button,
  colors,
  HeroBlock,
  List,
  NameFirstGreeting,
  Text,
} from "../base-email"

export interface GuestCompleteAccountEmailProps {
  patientName: string
  requestType: string
  intakeId: string
  completeAccountUrl: string
  appUrl?: string
}

export function guestCompleteAccountSubject(requestType: string) {
  return `Your ${requestType} is underway. Set up your account to track it`
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

      <NameFirstGreeting name={firstName} />
      <Text>
        Your {requestType} request is underway. Set up a free account to track
        it, open secure document links, and request again faster next time.
      </Text>

      <List
        items={[
          "Track your request status",
          "Open secure document links when ready",
          "Keep your request history in one place",
          "Request future certificates faster",
        ]}
      />

      <Button href={completeAccountUrl}>Create Your Account</Button>

      <Box variant="info">
        <p style={{ margin: 0, fontSize: "13px", color: colors.infoText }}>
          No pressure. We&apos;ll email you when the doctor has finished.
          Certificate downloads open through a secure InstantMed link.
        </p>
      </Box>

    </BaseEmail>
  )
}
