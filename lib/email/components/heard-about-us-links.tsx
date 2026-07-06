import * as React from "react"

import { HEARD_ABOUT_US_OPTIONS } from "@/lib/analytics/heard-about-us"

import { colors, fontFamily } from "./email-primitives"

/**
 * One-click self-reported attribution links for email. Each option links to the
 * token-authed GET route (`/api/attribution/heard`), which records the answer
 * write-once and redirects to `/heard-thanks`. Email can't render interactive
 * radios, so plain links are the right primitive. Shared by the review-request
 * email and the one-time attribution backfill email.
 */
export function HeardAboutUsLinks({
  appUrl,
  token,
  heading = "One quick question. How did you find us?",
}: {
  appUrl: string
  token: string
  heading?: string
}) {
  return (
    <div
      style={{
        textAlign: "center" as const,
        padding: "4px 0 20px",
        marginBottom: "20px",
        borderBottom: `1px solid ${colors.borderLight}`,
      }}
    >
      <p
        style={{
          margin: "0 0 12px 0",
          fontSize: "14px",
          fontWeight: "600",
          color: colors.text,
          fontFamily,
        }}
      >
        {heading}
      </p>
      <p style={{ margin: "0 0 4px 0", lineHeight: "2.2" }}>
        {HEARD_ABOUT_US_OPTIONS.map((option) => (
          <a
            key={option.value}
            href={`${appUrl}/api/attribution/heard?t=${token}&v=${option.value}`}
            style={{
              display: "inline-block",
              margin: "0 4px 8px 4px",
              padding: "6px 14px",
              fontSize: "13px",
              color: colors.text,
              textDecoration: "none",
              border: `1px solid ${colors.border}`,
              borderRadius: "9999px",
              backgroundColor: colors.cardBg,
              fontFamily,
            }}
          >
            {option.emoji} {option.label}
          </a>
        ))}
      </p>
      <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: colors.textMuted, fontFamily }}>
        One tap. It helps us reach more Australians.
      </p>
    </div>
  )
}
