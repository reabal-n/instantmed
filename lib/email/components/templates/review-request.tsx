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
  /** Raw one-use review traversal key. Omitted only for legacy reconstruction. */
  reviewClickKey?: string
}

export const reviewRequestSubject = "How did InstantMed go?"

export function ReviewRequestEmail({
  patientName,
  appUrl = APP_URL,
  reviewClickKey,
}: ReviewRequestEmailProps) {
  const firstName = patientName.trim().split(/\s+/)[0]
  const baseUrl = resolveConfiguredUrl(appUrl, APP_URL).replace(/\/$/, "")
  const reviewParams = new URLSearchParams({
    utm_source: "email",
    utm_medium: "review_request",
    utm_campaign: "review",
  })
  if (reviewClickKey) reviewParams.set("review_click_key", reviewClickKey)
  const reviewUrl = `${baseUrl}/api/review-redirect?${reviewParams.toString()}`

  return (
    <BaseEmail previewText="Honest feedback is useful, good or bad." appUrl={appUrl}>
      <NameFirstGreeting name={firstName} />

      <Heading as="h1">How did InstantMed go?</Heading>

      <Text>
        Hope everything went smoothly. If you have a minute, would you mind sharing how
        InstantMed felt to use? Honest feedback is useful, good or bad.
      </Text>

      {/* Naming the friction before the click is the point. The ask itself was
          never the problem: 131 sends produced 2 reviews (1.5%). ProductReview is
          a separate site with its own sign-in step and rejects very short reviews,
          so a patient who clicks expecting a quick star rating hits a wall partway
          through and abandons effort already spent. Setting the length and time
          expectation up front turns a surprise into a known, one-minute task.

          Deliberately does NOT describe where in their flow the sign-in lands:
          ProductReview sits behind Cloudflare, so we cannot verify that ordering
          and will not assert third-party mechanics we have not observed. */}
      <Text>
        A sentence or two is plenty. ProductReview has its own sign-in step, so allow
        about a minute. Please leave out personal or medical details: reviews are
        public.
      </Text>

      <Button href={reviewUrl}>Share an honest review</Button>

      <Text style={{ marginBottom: 0 }}>
        No pressure. This is the only review email we&apos;ll send for this request.
      </Text>
    </BaseEmail>
  )
}
