/**
 * Medical Certificate Patient Email Template
 *
 * Sent to patient when their medical certificate is approved and ready.
 * Primary CTA: authenticated request tracking/dashboard link.
 */

import * as React from "react"

import {
  BaseEmail,
  Button,
  HeroBlock,
  NameFirstGreeting,
  Text,
  VerificationCode,
} from "../base-email"

export interface MedCertPatientEmailProps {
  patientName: string
  dashboardUrl: string
  verificationCode?: string
  certType?: "work" | "study" | "carer"
  appUrl?: string
  /**
   * True when the recipient checked out as a guest (no linked account). The CTA
   * then points at account setup rather than the auth-walled portal, and we
   * explain why there's no password to reset.
   */
  isGuest?: boolean
  /**
   * Signed heard-about-us token. When present, renders the one-click
   * "how did you find us?" attribution question below the review CTA.
   */
  heardToken?: string
  /**
   * Intake ID threaded into the footer review CTA's /api/review-redirect link
   * so clicks attribute to an intake in PostHog instead of landing as
   * anonymous_email_click.
   */
  intakeId?: string
}

export function MedCertPatientEmail({
  patientName,
  dashboardUrl,
  verificationCode,
  certType: _certType = "work",
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  isGuest = false,
  heardToken,
  intakeId,
}: MedCertPatientEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText="Your medical certificate is approved and ready to download 🎉"
      appUrl={appUrl}
      showReviewCTA
      showReferral
      heardToken={heardToken}
      intakeId={intakeId}
    >
      <HeroBlock
        icon="🎉"
        headline="Your certificate is ready"
        subtitle="Medical Certificate · Approved"
        variant="success"
      />

      <NameFirstGreeting name={firstName} />

      <Text>
        Your <strong>Medical Certificate</strong> has been approved and is ready to download.
        Forward it to your employer, uni, or wherever it&apos;s needed. They can verify it anytime at{" "}
        <a href={`${appUrl}/verify`} style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
          instantmed.com.au/verify
        </a>
        .
      </Text>

      {isGuest && (
        <Text>
          You checked out as a guest, so the first time you open your certificate
          you&apos;ll set a password — there&apos;s no existing login to reset.
        </Text>
      )}

      <Button href={dashboardUrl}>
        {isGuest ? "Set up access & view certificate" : "View Certificate"}
      </Button>

      {verificationCode && (
        <VerificationCode code={verificationCode} verifyUrl={`${appUrl}/verify`} />
      )}

    </BaseEmail>
  )
}

export const medCertPatientEmailSubject = (firstName?: string) =>
  firstName ? `${firstName}, your medical certificate is ready 🎉` : "🎉 Your medical certificate is ready"
