/**
 * Medical Certificate Patient Email Template
 *
 * Sent to patient when their medical certificate is approved and ready.
 * Primary CTA: direct signed download link (works for guests & auth users).
 * Secondary: dashboard link for account holders.
 */

import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  Box,
  Heading,
  List,
  VerificationCode,
  GoogleReviewCTA,
  colors,
} from "../base-email"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"

export interface MedCertPatientEmailProps {
  patientName: string
  downloadUrl?: string
  dashboardUrl: string
  verificationCode?: string
  certType?: "work" | "study" | "carer"
  appUrl?: string
}

export function MedCertPatientEmail({
  patientName,
  downloadUrl,
  dashboardUrl,
  verificationCode,
  certType: _certType = "work",
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: MedCertPatientEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText="Your medical certificate is approved and ready to download 🎉"
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="Your certificate is ready 🎉"
        subtitle="Medical Certificate"
        variant="success"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Approved — your <strong>Medical Certificate</strong> is ready to download.
      </Text>

      <Button href={downloadUrl || dashboardUrl}>
        Download Certificate
      </Button>

      {verificationCode && (
        <VerificationCode code={verificationCode} verifyUrl={`${appUrl}/verify`} />
      )}

      <Box>
        <Heading as="h3">What to do next</Heading>
        <List
          items={[
            "Download and save your certificate",
            "Forward it to your employer, uni, or wherever it's needed",
            "They can verify it anytime at instantmed.com.au/verify",
          ]}
        />
      </Box>

      <Text muted small style={{ textAlign: "center" as const }}>
        Need to renew a prescription?{" "}
        <a href={`${appUrl}/request?service=prescription`} style={{ color: colors.accent, fontWeight: 500 }}>
          Repeat prescriptions from $29.95
        </a>
      </Text>

      <GoogleReviewCTA href={GOOGLE_REVIEW_URL} />

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

export const medCertPatientEmailSubject = "Your medical certificate is ready 🎉"
