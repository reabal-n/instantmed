/** Review request email - the only email template that asks for a review. */

import * as React from "react"

import { resolveConfiguredUrl } from "@/lib/constants/resolve-configured-url"

import {
  APP_URL,
  BaseEmail,
  Button,
  Heading,
  NameFirstGreeting,
  Text,
} from "../base-email"

export interface ReviewRequestEmailProps {
  patientName: string
  appUrl?: string
}

export const reviewRequestSubject = "How did InstantMed go?"

export function ReviewRequestEmail({
  patientName,
  appUrl = APP_URL,
}: ReviewRequestEmailProps) {
  const firstName = patientName.trim().split(/\s+/)[0]
  const baseUrl = resolveConfiguredUrl(appUrl, APP_URL).replace(/\/$/, "")
  const reviewUrl = `${baseUrl}/api/review-redirect?utm_source=email&utm_medium=review_request&utm_campaign=review`

  return (
    <BaseEmail previewText="Honest feedback is useful, good or bad." appUrl={appUrl}>
      <NameFirstGreeting name={firstName} />

      <Heading as="h1">How did InstantMed go?</Heading>

      <Text>
        Hope everything went smoothly. If you have a minute, would you mind sharing how
        InstantMed felt to use? Honest feedback is useful, good or bad.
      </Text>

      <Text>
        Please leave out personal or medical details — reviews are public.
      </Text>

      <Button href={reviewUrl}>Share an honest review</Button>

      <Text style={{ marginBottom: 0 }}>
        No pressure. This is the only review email we&apos;ll send for this request.
      </Text>
    </BaseEmail>
  )
}
