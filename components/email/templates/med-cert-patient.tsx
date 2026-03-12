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
  /** Direct signed download URL for the PDF (7-day expiry) */
  downloadUrl?: string
  /** Dashboard URL (requires auth — fallback for account holders) */
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
  certType = "work",
  appUrl = "https://instantmed.com.au",
}: MedCertPatientEmailProps) {
  return (
    <BaseEmail
      previewText={`Your medical certificate is ready to download ✅`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="Your certificate is ready"
        subtitle="Medical Certificate"
        variant="success"
      />

      <Text>Hi {patientName},</Text>

      <Text>
        Great news — your <strong>Medical Certificate</strong>{" "}
        has been reviewed and approved by one of our doctors. You can download
        it right away using the button below.
      </Text>

      {/* Primary CTA — direct download (works without login) */}
      <div style={{ textAlign: "center" as const }}>
        <Button href={downloadUrl || dashboardUrl}>
          Download Certificate
        </Button>
      </div>

      {/* Secondary: dashboard link for account holders */}
      <Text muted small style={{ textAlign: "center" as const }}>
        You can also access your certificate anytime from your{" "}
        <a href={dashboardUrl} style={{ color: colors.accent, fontWeight: 500 }}>
          patient dashboard
        </a>
        .
      </Text>

      {/* Verification code block */}
      {verificationCode && (
        <VerificationCode code={verificationCode} verifyUrl={`${appUrl}/verify`} />
      )}

      {/* Next steps */}
      <Box>
        <Heading as="h3">What to do next</Heading>
        <List
          items={[
            "Download and save your certificate",
            "Forward it to your employer, university, or relevant institution",
            "Your employer can verify it at instantmed.com.au/verify",
          ]}
        />
      </Box>

      {/* Download link expiry notice */}
      {downloadUrl && (
        <Text muted small>
          The download link expires in 7 days. After that, sign in to your
          dashboard to re-download.
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

export const medCertPatientEmailSubject = "Your medical certificate is ready"
