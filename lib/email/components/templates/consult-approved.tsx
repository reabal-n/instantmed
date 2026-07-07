/**
 * Specialty Consultation Approved Email Template
 *
 * Sent to the patient when their specialty consultation is approved.
 */

import * as React from "react"

import {
  APP_URL,
  BaseEmail,
  Box,
  Button,
  Heading,
  HeroBlock,
  NameFirstGreeting,
  Text,
} from "../base-email"

export interface ConsultApprovedEmailProps {
  patientName: string
  requestId: string
  doctorNotes?: string
  appUrl?: string
  /**
   * Signed heard-about-us token. When present, renders the one-click
   * "how did you find us?" attribution question below the Google review CTA.
   */
  heardToken?: string
}

export function ConsultApprovedEmail({
  patientName,
  requestId,
  doctorNotes,
  appUrl = APP_URL,
  heardToken,
}: ConsultApprovedEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText={`${firstName}, your consultation is complete. Here's what's next ✅`}
      appUrl={appUrl}
      showReviewCTA
      heardToken={heardToken}
      showReferral
    >
      <HeroBlock
        icon="✓"
        headline="Consultation complete"
        subtitle="Your doctor has reviewed your request"
        variant="success"
      />

      <NameFirstGreeting name={firstName} />

      <Text>
        Your doctor has reviewed your consultation. If a prescription was issued,
        your eScript will arrive via SMS. If a referral was provided, it&apos;ll be in your account.
      </Text>

      {doctorNotes && (
        <Box>
          <Heading as="h3">Doctor&apos;s notes</Heading>
          <Text small>{doctorNotes}</Text>
        </Box>
      )}

      <Button href={`${appUrl}/track/${requestId}`}>
        View details
      </Button>

    </BaseEmail>
  )
}

export const consultApprovedSubject = (firstName?: string) =>
  firstName ? `${firstName}, your consultation is all done ✅` : "Good news, your consultation is all done ✅"
