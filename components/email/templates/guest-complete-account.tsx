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
  return `Create your InstantMed account to track your ${requestType}`
}

export function GuestCompleteAccountEmail({
  patientName,
  requestType,
  intakeId: _intakeId,
  completeAccountUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: GuestCompleteAccountEmailProps) {
  return (
    <BaseEmail previewText={`Create your InstantMed account to track your ${requestType}`} appUrl={appUrl}>
      <HeroBlock
        icon="👤"
        headline="Create your InstantMed account"
        variant="neutral"
      />

      <Text>Hi {patientName},</Text>
      <Text>
        Set up your account to track your {requestType} request, download your
        certificate when it&apos;s ready, and reorder in seconds next time.
      </Text>

      <List
        items={[
          "Track your request status in real-time",
          "Download your certificate instantly when ready",
          "Access your medical history",
          "Request future certificates faster",
        ]}
      />

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <Button href={completeAccountUrl}>Create Your Account</Button>
      </div>

      <Box variant="info">
        <p style={{ margin: 0, fontSize: "13px", color: colors.infoText }}>
          Don&apos;t worry — your certificate will also be emailed to you when it&apos;s ready,
          even if you don&apos;t create an account.
        </p>
      </Box>
    </BaseEmail>
  )
}
