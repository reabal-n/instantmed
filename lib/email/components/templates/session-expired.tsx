import {
  APP_URL,
  BaseEmail,
  Button,
  NameFirstGreeting,
  StatusBanner,
  Text,
} from "../base-email"

export interface SessionExpiredEmailProps {
  patientName: string
  serviceName: string
  startUrl: string
  appUrl?: string
}

// Deliberately service-free: subjects render on lock screens and shared
// inboxes, so the request type must not be named there.
export function sessionExpiredSubject() {
  return "Your payment window expired"
}

export function SessionExpiredEmail({
  patientName,
  serviceName,
  startUrl,
  appUrl = APP_URL,
}: SessionExpiredEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText="No payment was taken. Start again if you still need this request."
      appUrl={appUrl}
    >
      <StatusBanner title="Checkout timed out" variant="warning" />

      <NameFirstGreeting name={firstName} />
      <Text>
        The payment window for your <strong>{serviceName}</strong> request expired
        before checkout was completed.
      </Text>
      <Text>
        <strong>No payment was taken.</strong>
      </Text>
      <Text>
        Expired requests cannot be reopened. If you still need it, start a new
        request below.
      </Text>

      <Button href={startUrl}>Start a new request</Button>

      <Text muted small>
        Already sorted or changed your mind? You can ignore this email.
      </Text>
    </BaseEmail>
  )
}
