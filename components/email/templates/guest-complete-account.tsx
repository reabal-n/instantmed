import {
  BaseEmail,
  Heading,
  Text,
  Button,
  Box,
  List,
  DetailRow,
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
  intakeId,
  completeAccountUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: GuestCompleteAccountEmailProps) {
  return (
    <BaseEmail previewText={`Create your InstantMed account to track your ${requestType}`} appUrl={appUrl}>
      <Heading>Your request is being reviewed</Heading>

      <Text>Hi {patientName},</Text>
      <Text>
        Your {requestType} request has been received and is now in the review queue.
        A doctor will review it shortly.
      </Text>

      <Box>
        <DetailRow label="Reference" value={intakeId.slice(0, 8).toUpperCase()} />
      </Box>

      <Heading as="h2">Create your account</Heading>
      <Text>Set up your InstantMed account to:</Text>
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

      <Text muted small>
        Don&apos;t worry — your certificate will also be emailed to you when it&apos;s ready,
        even if you don&apos;t create an account.
      </Text>
    </BaseEmail>
  )
}
