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
  colors,
} from "../base-email"

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
  appUrl = "https://instantmed.com.au",
}: MedCertPatientEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail
      previewText="Your medical certificate is ready to download 🎉"
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
        Good news 🎉 — a doctor has reviewed and approved your{" "}
        <strong>Medical Certificate</strong>. You can download it right
        away using the button below.
      </Text>

      <Button href={downloadUrl || dashboardUrl}>
        Download Certificate
      </Button>

      <Text muted small style={{ textAlign: "center" as const }}>
        Also available anytime from your{" "}
        <a href={dashboardUrl} style={{ color: colors.accent, fontWeight: 500 }}>
          patient dashboard
        </a>
        .
      </Text>

      {verificationCode && (
        <VerificationCode code={verificationCode} verifyUrl={`${appUrl}/verify`} />
      )}

      <Box>
        <Heading as="h3">What to do next</Heading>
        <List
          items={[
            "Download and save your certificate",
            "Forward it to your employer, university, or wherever it's needed",
            "They can verify it anytime at instantmed.com.au/verify",
          ]}
        />
      </Box>

      {downloadUrl && (
        <Text muted small>
          The download link expires in 7 days. After that, just sign in to
          your dashboard to grab a fresh copy.
        </Text>
      )}

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
