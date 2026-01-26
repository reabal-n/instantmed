/**
 * Medical Certificate Patient Email Template
 * 
 * Sent to patient when their medical certificate is approved and ready.
 * Links to dashboard for download (no PDF attachment by default).
 */

import * as React from "react"
import {
  BaseEmail,
  SuccessBanner,
  Text,
  Button,
  Box,
  Heading,
  List,
  VerificationCode,
} from "../base-email"

export interface MedCertPatientEmailProps {
  patientName: string
  dashboardUrl: string
  verificationCode?: string
  certType?: "work" | "study" | "carer"
  appUrl?: string
}

export function MedCertPatientEmail({
  patientName,
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
      previewText={`Your medical certificate is ready to download`}
      appUrl={appUrl}
    >
      <SuccessBanner title="Your medical certificate is ready" />

      <Text>Hi {patientName},</Text>

      <Text>
        Your <strong>Medical Certificate — {certTypeLabel}</strong> has been reviewed and
        approved by one of our doctors. You can download it from your dashboard.
      </Text>

      <div style={{ textAlign: "center" }}>
        <Button href={dashboardUrl}>View Dashboard</Button>
      </div>

      {verificationCode && (
        <VerificationCode code={verificationCode} verifyUrl={`${appUrl}/verify`} />
      )}

      <Box>
        <Heading as="h3">What happens next?</Heading>
        <List
          items={[
            "Download your certificate from your dashboard",
            "Forward it to your employer, university, or relevant institution",
            "Keep a copy for your records",
          ]}
        />
      </Box>

      <Text muted small>
        Questions? Just reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: "#00C9A7", fontWeight: 500 }}>
          help center
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const medCertPatientEmailSubject = "Your medical certificate is ready"
