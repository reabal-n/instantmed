/**
 * Magic Link Email Template
 *
 * Sent via Supabase auth hook when a user requests a magic link login.
 * Replaces the bare-bones Supabase default.
 */

import * as React from "react"

import { BaseEmail, Button, colors,HeroBlock, Text } from "../base-email"

export interface MagicLinkEmailProps {
  loginUrl: string
  email?: string
  appUrl?: string
  actionType?: "magiclink" | "signup" | "recovery" | "invite" | "email_change" | "reauthentication" | string
  firstName?: string
}

export const magicLinkEmailSubject = "Your InstantMed login link"

export function MagicLinkEmail({
  loginUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  actionType = "magiclink",
  firstName,
}: MagicLinkEmailProps) {
  const isSignup = actionType === "signup"
  const isRecovery = actionType === "recovery"
  const headline = isSignup
    ? "Confirm your account"
    : isRecovery
      ? "Reset your access"
      : "Continue to InstantMed"
  const subtitle = isSignup
    ? "Your request is ready in your account"
    : isRecovery
      ? "Secure one-time link"
      : "Secure one-time sign-in link"
  const buttonLabel = isSignup
    ? "Confirm account"
    : isRecovery
      ? "Reset access"
      : "Continue to InstantMed"
  const previewText = isSignup
    ? "Confirm your InstantMed account and continue to your request."
    : isRecovery
      ? "Use this secure link to reset access to InstantMed."
      : "Use this secure link to continue to InstantMed. Expires in 60 minutes."

  return (
    <BaseEmail
      previewText={previewText}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="IM"
        headline={headline}
        subtitle={subtitle}
        variant="info"
      />

      <Text>
        {firstName
          ? `${firstName}, use the secure button below to continue.`
          : "Use the secure button below to continue."} This link expires in 60 minutes and works once only.
      </Text>

      <Button href={loginUrl}>{buttonLabel}</Button>

      <Text small muted style={{ textAlign: "center" as const }}>
        Didn't request this? You can safely ignore this email. Your account is secure.
      </Text>

      <Text small muted style={{ textAlign: "center" as const, marginTop: "4px" }}>
        Having trouble?{" "}
        <a href={`${appUrl}/auth/login`} style={{ color: colors.accent, textDecoration: "none" }}>
          Go to the login page
        </a>
      </Text>
    </BaseEmail>
  )
}
