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
  const certTypeLabel = {
    work: "Work Absence",
    study: "University/School",
    carer: "Carer's Leave",
  }[certType]

  return (
    <BaseEmail
      previewText={`Your medical certificate for ${certTypeLabel} is ready to download`}
      appUrl={appUrl}
    >
      {/* Success header with check icon */}
      <div
        style={{
          textAlign: "center" as const,
          padding: "8px 0 20px",
        }}
      >
        <div
          style={{
            display: "inline-block",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: colors.successBg,
            lineHeight: "44px",
            textAlign: "center" as const,
            fontSize: "20px",
            marginBottom: "12px",
            border: `1px solid ${colors.successBorder}`,
          }}
        >
          ✓
        </div>
        <h1
          style={{
            margin: "0 0 4px 0",
            fontSize: "22px",
            fontWeight: "700",
            color: colors.text,
            letterSpacing: "-0.3px",
            lineHeight: "1.3",
          }}
        >
          Your certificate is ready
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: colors.textMuted,
          }}
        >
          Medical Certificate — {certTypeLabel}
        </p>
      </div>

      <Text>Hi {patientName},</Text>

      <Text>
        Great news — your <strong>Medical Certificate ({certTypeLabel})</strong>{" "}
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
