import {
  APP_URL,
  BaseEmail,
  Box,
  Button,
  Heading,
  HeroBlock,
  List,
  NameFirstGreeting,
  Text,
} from "../base-email"

/**
 * "abandoned" is the ordinary cron nudge: the patient chose to stop.
 * "service_fault" is for requests our own checkout stranded — the patient tried
 * to pay and we failed them. Blaming those patients for "stopping before
 * payment" is both false and insulting, so the fault variant says what happened.
 */
export type AbandonedCheckoutVariant = "abandoned" | "service_fault"

export interface AbandonedCheckoutEmailProps {
  patientName: string
  serviceName: string
  resumeUrl: string
  appUrl?: string
  startedAgoLabel: string
  variant?: AbandonedCheckoutVariant
}

export function abandonedCheckoutSubject(
  serviceName: string,
  variant: AbandonedCheckoutVariant = "abandoned",
) {
  void serviceName
  return variant === "service_fault"
    ? "Sorry, our checkout failed on your request"
    : "Complete your request"
}

export function AbandonedCheckoutEmail({
  patientName,
  serviceName,
  resumeUrl,
  appUrl = APP_URL,
  startedAgoLabel,
  variant = "abandoned",
}: AbandonedCheckoutEmailProps) {
  const firstName = patientName.split(" ")[0]
  const isServiceFault = variant === "service_fault"

  return (
    <BaseEmail
      previewText={
        isServiceFault
          ? "A fault on our side stopped your payment. Your request is saved."
          : "Payment is still open if you need this request"
      }
      appUrl={appUrl}
    >
      <HeroBlock
        icon="IM"
        headline={isServiceFault ? "Our checkout failed, not you" : "Payment is still open"}
        variant="info"
      />

      <NameFirstGreeting name={firstName} />
      {isServiceFault ? (
        <Text>
          You tried to pay for a <strong>{serviceName}</strong> request and a
          fault on our side stopped the payment from going through. That was our
          mistake, and we are sorry. The problem is now fixed and your request is
          still saved. If you still need it, you can finish payment below. If you
          have since sorted it out another way, no action is needed.
        </Text>
      ) : (
        <Text>
          You started a <strong>{serviceName}</strong> request {startedAgoLabel}{" "}
          and stopped before payment. If you still need it, return to the saved
          request and finish payment.
        </Text>
      )}

      <Button href={resumeUrl}>Return to payment</Button>

      <Box>
        <Heading as="h3">What happens next</Heading>
        <List
          items={[
            "A doctor reviews your request",
            "Full refund if the doctor declines",
            "We contact you only if more information is clinically needed",
          ]}
        />
      </Box>

      <Text muted small>
        Already finished or changed your mind? You can ignore this email.
      </Text>
    </BaseEmail>
  )
}
