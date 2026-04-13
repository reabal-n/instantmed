/**
 * Review & referral CTA components for email templates.
 *
 * Feature-specific CTAs (not layout primitives) used in post-approval
 * and review-request emails.
 */

import * as React from "react"

import { colors, fontFamily } from "./email-primitives"

// ReviewHero -- large, prominent review block for dedicated review emails
interface ReviewHeroProps {
  appUrl: string
  /** Customize the warm copy for the service they used */
  serviceCopy?: string
  /** Intake ID for PostHog tracking attribution. */
  intakeId?: string
  /** User ID for PostHog tracking attribution. */
  userId?: string
}

export function ReviewHero({ appUrl, serviceCopy, intakeId, userId }: ReviewHeroProps) {
  const trackingParams = [
    "utm_source=email",
    "utm_medium=review_hero",
    "utm_campaign=review",
    ...(intakeId ? [`intake_id=${intakeId}`] : []),
    ...(userId ? [`user_id=${userId}`] : []),
  ].join("&")
  const trackingHref = `${appUrl}/api/review-redirect?${trackingParams}`

  return (
    <div style={{ textAlign: "center" as const, padding: "8px 0 16px" }}>
      {/* Large stars */}
      <p style={{
        margin: "0 0 16px 0",
        fontSize: "32px",
        letterSpacing: "6px",
        lineHeight: "1",
        color: "#F59E0B",
      }}>
        {"\u2605\u2605\u2605\u2605\u2605"}
      </p>

      {/* Heading */}
      <h2 style={{
        margin: "0 0 12px 0",
        fontSize: "20px",
        fontWeight: "600",
        color: colors.text,
        letterSpacing: "-0.3px",
        lineHeight: "1.4",
        fontFamily,
      }}>
        Your feedback means the world
      </h2>

      {/* Body */}
      <p style={{
        margin: "0 0 20px 0",
        fontSize: "14px",
        color: colors.textBody,
        lineHeight: "1.6",
        fontFamily,
      }}>
        {serviceCopy || "If we saved you a trip to the GP, a quick Google review helps other Aussies find fast, easy healthcare. It takes about 30 seconds."}
      </p>

      {/* CTA Button */}
      <table role="presentation" cellPadding="0" cellSpacing="0" style={{ margin: "0 auto" }}>
        <tbody>
          <tr>
            <td>
              <a
                href={trackingHref}
                style={{
                  display: "inline-block",
                  padding: "14px 32px",
                  backgroundColor: colors.accent,
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: "600",
                  textDecoration: "none",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                  letterSpacing: "0.01em",
                  fontFamily,
                }}
              >
                {"\u2B50"} Leave a Google review
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Already reviewed */}
      <p style={{
        margin: "16px 0 0 0",
        fontSize: "12px",
        color: colors.textMuted,
        fontFamily,
      }}>
        Already reviewed? Legend, thanks! {"\uD83D\uDE4F"}
      </p>
    </div>
  )
}

interface GoogleReviewCTAProps {
  appUrl: string
  /** Intake ID for PostHog tracking attribution. */
  intakeId?: string
  /** User ID for PostHog tracking attribution. */
  userId?: string
}

export function GoogleReviewCTA({ appUrl, intakeId, userId }: GoogleReviewCTAProps) {
  const trackingParams = [
    "utm_source=email",
    "utm_medium=inline_cta",
    "utm_campaign=review",
    ...(intakeId ? [`intake_id=${intakeId}`] : []),
    ...(userId ? [`user_id=${userId}`] : []),
  ].join("&")
  const trackingHref = `${appUrl}/api/review-redirect?${trackingParams}`
  return (
    <div
      className="google-review-pill"
      style={{
        borderTop: `1px solid ${colors.borderLight}`,
        margin: "4px 0 0 0",
        padding: "16px 0 4px",
      }}
    >
      <div
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: "12px",
          padding: "20px 24px",
          textAlign: "center" as const,
        }}
      >
        <p style={{ margin: "0 0 8px 0", fontSize: "22px", letterSpacing: "2px", color: "#F59E0B", lineHeight: "1" }}>
          ★★★★★
        </p>
        <p style={{ margin: "0 0 14px 0", fontSize: "13px", color: colors.textBody, lineHeight: "1.5", fontFamily }}>
          If we saved you a trip to the GP, a quick Google review would mean the world to us.
        </p>
        <a
          className="google-review-btn"
          href={trackingHref}
          style={{
            display: "inline-block",
            padding: "12px 28px",
            backgroundColor: colors.accent,
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
            fontFamily,
          }}
        >
          Leave a Google review
        </a>
      </div>
    </div>
  )
}

interface ReferralCTAProps {
  appUrl: string
}

export function ReferralCTA({ appUrl }: ReferralCTAProps) {
  return (
    <div
      style={{
        textAlign: "center" as const,
        padding: "12px 0 0",
        borderTop: `1px solid ${colors.borderLight}`,
        margin: "16px 0 0 0",
      }}
    >
      <p style={{ margin: 0, fontSize: "13px", color: colors.textMuted, lineHeight: "1.6" }}>
        Know someone who needs this?{" "}
        <a href={`${appUrl}/patient?tab=referrals&utm_source=email&utm_medium=referral_cta&utm_campaign=referral`} style={{ color: colors.accent, fontWeight: 600, textDecoration: "none" }}>
          Give them $5 off and get $5 yourself
        </a>
      </p>
    </div>
  )
}
