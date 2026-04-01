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
      previewText="Your medical certificate is ready to download"
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="Your certificate is ready"
        subtitle="Medical Certificate"
        variant="success"
      />

      <Text>Hi {firstName},</Text>

      <Text>
        Good news — a doctor has reviewed and approved your{" "}
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

      {/* Review CTA — placed at peak satisfaction, right after delivery */}
      <div style={{ textAlign: "center" as const, padding: "20px 0", borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, margin: "16px 0" }}>
        <Text style={{ fontSize: "14px", fontWeight: 600, color: colors.text, marginBottom: "4px" }}>
          Happy with your experience?
        </Text>
        <Text muted small style={{ marginBottom: "12px" }}>
          A quick Google review helps other Australians find reliable telehealth. Takes 30 seconds.
        </Text>
        <a
          href={GOOGLE_REVIEW_URL}
          style={{
            display: "inline-block",
            padding: "10px 24px",
            borderRadius: "8px",
            backgroundColor: colors.accent,
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          Leave a Google review
        </a>
      </div>

      <Text muted small style={{ textAlign: "center" as const }}>
        Need to renew a prescription?{" "}
        <a href={`${appUrl}/request?service=prescription`} style={{ color: colors.accent, fontWeight: 500 }}>
          Repeat prescriptions from $29.95
        </a>
      </Text>

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
