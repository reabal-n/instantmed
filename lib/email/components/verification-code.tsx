/**
 * Verification code display component for email templates.
 *
 * Renders a styled code block with optional verify URL.
 * Used in OTP/verification and med cert employer emails.
 */

import * as React from "react"

import { colors, fontFamily } from "./email-primitives"

interface VerificationCodeProps {
  code: string
  verifyUrl?: string
}

export function VerificationCode({ code, verifyUrl }: VerificationCodeProps) {
  return (
    <div
      className="email-code-block"
      style={{
        backgroundColor: colors.surfaceSubtle,
        border: `1px solid ${colors.border}`,
        borderRadius: "8px",
        padding: "8px 12px",
        margin: "12px 0",
        textAlign: "center" as const,
      }}
    >
      <p
        aria-label={`Verification code: ${code.split("").join(" ")}`}
        style={{
          margin: 0,
          fontSize: "15px",
          fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
          fontWeight: "700",
          color: colors.text,
          letterSpacing: "3px",
        }}
      >
        {code}
      </p>
      {verifyUrl && (
        <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: colors.textMuted, fontFamily }}>
          Verify at{" "}
          <a href={verifyUrl} style={{ color: colors.accent, textDecoration: "none" }}>
            {verifyUrl.replace("https://", "")}
          </a>
        </p>
      )}
    </div>
  )
}
