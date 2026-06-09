/**
 * Review Request Email Template - Day 2 post-approval
 *
 * Uses ReviewHero as the prominent CTA, preceded by an optional one-click
 * "how did you hear about us?" attribution question (the email is the highest-
 * intent reachable moment for the marketing-consented cohort).
 */

import * as React from "react"

import { HEARD_ABOUT_US_OPTIONS } from "@/lib/analytics/heard-about-us"

import { BaseEmail, ReviewHero,Text } from "../base-email"
import { colors, fontFamily } from "../email-primitives"

export interface ReviewRequestEmailProps {
  patientName: string
  serviceName: string
  appUrl?: string
  /** Intake ID + signed token power the one-click attribution links. */
  intakeId?: string
  heardToken?: string
}

export const reviewRequestSubject = "Quick favour? ⭐"

/**
 * One-click self-reported attribution. Each option links to the token-authed
 * GET route, which records the answer and redirects to /heard-thanks. Email
 * can't render interactive radios, so plain links are the right primitive.
 */
function HeardAboutUsLinks({ appUrl, token }: { appUrl: string; token: string }) {
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
        One quick question — how did you find us?
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
        One tap — it helps us reach more Australians.
      </p>
    </div>
  )
}

export function ReviewRequestEmail({
  patientName,
  serviceName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  intakeId,
  heardToken,
}: ReviewRequestEmailProps) {
  const firstName = patientName.split(" ")[0]

  return (
    <BaseEmail previewText="If you've got 30 seconds, a review would mean the world" appUrl={appUrl}>
      <Text>Hey {firstName},</Text>

      <Text>
        Glad we could help with your <strong>{serviceName}</strong>. We have a small favour to ask.
      </Text>

      {heardToken && <HeardAboutUsLinks appUrl={appUrl} token={heardToken} />}

      <ReviewHero
        appUrl={appUrl}
        intakeId={intakeId}
        serviceCopy={`If we saved you a trip to the GP for your ${serviceName.toLowerCase()}, a quick Google review helps other Aussies find fast, easy healthcare. It takes about 30 seconds.`}
      />
    </BaseEmail>
  )
}
