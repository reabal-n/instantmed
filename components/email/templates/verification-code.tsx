/**
 * Verification Code Email Template
 *
 * Sent when a user signs up or signs in with OTP.
 * InstantMed-branded verification code email.
 * Sent via Resend when a user signs up or signs in with OTP.
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Box,
  Heading,
  colors,
} from "../base-email"

export interface VerificationCodeEmailProps {
  code: string
  requestedFrom?: string
  requestedAt?: string
  appUrl?: string
}

export const verificationCodeSubject = (code: string) =>
  `Your InstantMed verification code: ${code}`

export function VerificationCodeEmail({
  code,
  requestedFrom,
  requestedAt,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: VerificationCodeEmailProps) {
  return (
    <BaseEmail
      previewText={`Your InstantMed verification code is ${code}`}
      appUrl={appUrl}
    >
      <Text>Here&apos;s your verification code. Enter it where prompted to continue:</Text>

      {/* Code block */}
      <div
        style={{
          backgroundColor: colors.surfaceSubtle,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          padding: "28px 24px",
          margin: "20px 0",
          textAlign: "center" as const,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "36px",
            fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
            fontWeight: "700",
            color: colors.text,
            letterSpacing: "8px",
            lineHeight: "1.2",
          }}
        >
          {code}
        </p>
      </div>

      <Text muted small>
        This code expires in 10 minutes. Keep it to yourself — we won&apos;t
        ask for it by email or phone.
      </Text>

      {/* Didn't request this */}
      {requestedFrom && (
        <Box>
          <Heading as="h3">Didn't request this?</Heading>
          <Text small style={{ margin: 0, color: colors.textSecondary }}>
            This code was requested from <strong>{requestedFrom}</strong>
            {requestedAt && <> at <strong>{requestedAt}</strong></>}.
            If this wasn't you, you can safely ignore this email.
          </Text>
        </Box>
      )}

      <Text muted small>
        Questions? Just reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500, textDecoration: "none" }}>
          help centre
        </a>
        .
      </Text>
    </BaseEmail>
  )
}
