/**
 * Medical Certificate Employer Email Template
 * 
 * Sent to employer when patient requests their certificate be forwarded.
 * Contains secure download link (Supabase signed URL).
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
  Box,
  Heading,
  colors,
} from "../base-email"

export interface MedCertEmployerEmailProps {
  employerName?: string
  companyName?: string
  patientName: string
  downloadUrl: string
  expiresInDays?: number
  verificationCode?: string
  patientNote?: string
  certStartDate?: string
  certEndDate?: string
  appUrl?: string
}

export function MedCertEmployerEmail({
  employerName,
  companyName,
  patientName,
  downloadUrl,
  expiresInDays = 7,
  verificationCode,
  patientNote,
  certStartDate,
  certEndDate,
  appUrl = "https://instantmed.com.au",
}: MedCertEmployerEmailProps) {
  const greeting = employerName
    ? `Dear ${employerName},`
    : companyName
      ? `Dear ${companyName} Team,`
      : "Dear Sir/Madam,"

  return (
    <BaseEmail
      previewText={`Medical certificate for ${patientName}`}
      appUrl={appUrl}
    >
      {/* Professional header banner */}
      <div
        style={{
          backgroundColor: colors.successBg,
          border: `1px solid ${colors.successBorder}`,
          borderRadius: "8px",
          padding: "20px 24px",
          marginBottom: "24px",
        }}
      >
        <p style={{ margin: 0, fontSize: "14px", color: colors.successText, fontWeight: 600 }}>
          Medical Certificate
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: "18px", color: colors.text, fontWeight: 600 }}>
          {patientName}
        </p>
        {certStartDate && certEndDate && (
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: colors.textMuted }}>
            {certStartDate} — {certEndDate}
          </p>
        )}
      </div>

      <Text>{greeting}</Text>

      <Text>
        <strong>{patientName}</strong> has requested that we forward their medical certificate
        to you. This certificate was issued by a registered Australian doctor through InstantMed's
        telehealth service.
      </Text>

      {patientNote && (
        <Box>
          <Heading as="h3">Note from {patientName.split(" ")[0]}</Heading>
          <Text style={{ margin: 0, fontStyle: "italic" }}>"{patientNote}"</Text>
        </Box>
      )}

      <div style={{ textAlign: "center" }}>
        <Button href={downloadUrl}>Download Certificate (PDF)</Button>
      </div>

      <Text muted small style={{ textAlign: "center" }}>
        This link expires in {expiresInDays} days for security.
      </Text>

      {verificationCode && (
        <Box variant="success">
          <Heading as="h3" >Certificate Verification</Heading>
          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: "20px",
              fontFamily: "monospace",
              fontWeight: "bold",
              color: colors.successText,
              letterSpacing: "2px",
            }}
          >
            {verificationCode}
          </p>
          <Text muted small style={{ margin: 0 }}>
            You can verify the authenticity of this certificate at{" "}
            <a href={`${appUrl}/verify`} style={{ color: colors.accent }}>
              {appUrl.replace("https://", "")}/verify
            </a>
          </Text>
        </Box>
      )}

      <Box>
        <Heading as="h3">About InstantMed</Heading>
        <Text small muted style={{ margin: 0 }}>
          InstantMed is an Australian telehealth service. All medical certificates are issued by
          AHPRA-registered doctors and include verification codes for authenticity checks.
          If you have questions about this certificate, please contact us at{" "}
          <a href={`${appUrl}/contact`} style={{ color: colors.accent }}>
            {appUrl.replace("https://", "")}/contact
          </a>
          .
        </Text>
      </Box>
    </BaseEmail>
  )
}

export const medCertEmployerEmailSubject = (patientName: string) =>
  `Medical Certificate for ${patientName}`
