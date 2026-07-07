/**
 * Magic Link Email Template
 *
 * Sent via Supabase auth hook when a user requests a magic link login.
 * Replaces the bare-bones Supabase default.
 */

import * as React from "react"

import { APP_URL, BaseEmail, Box, Button, colors, fontFamily, NameFirstGreeting, Text } from "../base-email"

export interface MagicLinkEmailProps {
  loginUrl: string
  email?: string
  appUrl?: string
  actionType?: "magiclink" | "signup" | "recovery" | "invite" | "email_change" | "reauthentication" | string
  firstName?: string
}

export const magicLinkEmailSubject = "Your InstantMed sign-in link is ready"

const actionCopy = {
  signup: {
    headline: "Confirm your InstantMed account",
    eyebrow: "Account setup",
    subtitle: "One secure click, then back to your request.",
    body: "Confirm your account and keep going. This link works once and expires in 60 minutes.",
    buttonLabel: "Confirm account",
    previewText: "Confirm your InstantMed account and continue to your request.",
  },
  recovery: {
    headline: "Reset your InstantMed access",
    eyebrow: "Account recovery",
    subtitle: "A secure one-time reset link.",
    body: "Use the button below to reset your access. This link works once and expires in 60 minutes.",
    buttonLabel: "Reset access",
    previewText: "Use this secure link to reset access to InstantMed.",
  },
  magiclink: {
    headline: "Your sign-in link is ready",
    eyebrow: "Secure sign-in",
    subtitle: "No password. No waiting room.",
    body: "Tap the button below and you will be signed in. This link works once and expires in 60 minutes.",
    buttonLabel: "Open InstantMed",
    previewText: "Your secure InstantMed sign-in link is ready. Expires in 60 minutes.",
  },
}

function getCopy(actionType: MagicLinkEmailProps["actionType"]) {
  if (actionType === "signup") return actionCopy.signup
  if (actionType === "recovery") return actionCopy.recovery
  return actionCopy.magiclink
}

export function MagicLinkEmail({
  loginUrl,
  appUrl = APP_URL,
  actionType = "magiclink",
  firstName,
}: MagicLinkEmailProps) {
  const copy = getCopy(actionType)

  return (
    <BaseEmail
      previewText={copy.previewText}
      appUrl={appUrl}
    >
      <div
        style={{
          backgroundColor: colors.surfaceWarm,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: "16px",
          padding: "22px",
          margin: "0 0 20px 0",
        }}
      >
        <p
          style={{
            margin: "0 0 8px 0",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: colors.accent,
          }}
        >
          {copy.eyebrow}
        </p>
        <h1
          style={{
            margin: "0 0 8px 0",
            fontSize: "24px",
            fontWeight: 600,
            color: colors.text,
            fontFamily,
            letterSpacing: "-0.5px",
            lineHeight: "1.25",
          }}
        >
          {copy.headline}
        </h1>
        <p
          style={{
            margin: "0",
            fontSize: "14px",
            color: colors.textSecondary,
            lineHeight: "1.5",
          }}
        >
          {copy.subtitle}
        </p>
      </div>

      <NameFirstGreeting name={firstName} />
      <Text>{copy.body}</Text>

      <Button href={loginUrl}>{copy.buttonLabel}</Button>

      <Box variant="info">
        <p
          style={{
            margin: "0",
            fontSize: "13px",
            color: colors.infoText,
            lineHeight: "1.6",
          }}
        >
          If this link has expired, request a fresh one from the sign-in page.
        </p>
      </Box>

      <Box>
        <p
          style={{
            margin: "0 0 8px 0",
            fontSize: "13px",
            fontWeight: 600,
            color: colors.text,
            lineHeight: "1.5",
          }}
        >
          Copy this secure link
        </p>
        <a
          href={loginUrl}
          style={{
            display: "block",
            color: colors.accent,
            fontSize: "12px",
            lineHeight: "1.5",
            textDecoration: "none",
            wordBreak: "break-all",
            overflowWrap: "anywhere",
          }}
        >
          {loginUrl}
        </a>
      </Box>

      <Text small muted style={{ textAlign: "center" as const }}>
        Didn't ask for this? No stress. Ignore this email and nothing changes on your account.
      </Text>

      <Text small muted style={{ textAlign: "center" as const, marginTop: "4px" }}>
        Button playing up?{" "}
        <a href={`${appUrl}/sign-in`} style={{ color: colors.accent, textDecoration: "none" }}>
          Open the sign-in page
        </a>
      </Text>
    </BaseEmail>
  )
}
