/**
 * Magic Link Email Template
 *
 * Sent via Supabase auth hook when a user requests a magic link login.
 * Replaces the bare-bones Supabase default.
 */

import * as React from "react"

import {
  APP_URL,
  BaseEmail,
  Box,
  Button,
  colors,
  fontFamily,
  NameFirstGreeting,
  Text,
  VerificationCode,
} from "../base-email"

export interface MagicLinkEmailProps {
  loginUrl?: string
  email?: string
  appUrl?: string
  actionType?: "magiclink" | "signup" | "recovery" | "invite" | "email_change" | "reauthentication" | string
  emailChangeAudience?: "current" | "new"
  firstName?: string
  verificationCode?: string
}

export const magicLinkEmailSubject = "Your InstantMed sign-in link is ready"

const actionCopy = {
  signup: {
    headline: "Confirm your InstantMed account",
    eyebrow: "Account setup",
    subtitle: "One quick confirmation, then back to your request.",
    body: "Open the secure page below, then confirm your account. The one-time link expires in 60 minutes.",
    buttonLabel: "Confirm account",
    previewText: "Confirm your InstantMed account and continue to your request.",
  },
  recovery: {
    headline: "Reset your InstantMed access",
    eyebrow: "Account recovery",
    subtitle: "A secure one-time reset link.",
    body: "Open the secure page below, then continue to choose a new password. The one-time link expires in 60 minutes.",
    buttonLabel: "Reset access",
    previewText: "Use this secure link to reset access to InstantMed.",
  },
  magiclink: {
    headline: "Your sign-in link is ready",
    eyebrow: "Secure sign-in",
    subtitle: "No password. No waiting room.",
    body: "Tap the button below to open InstantMed, then confirm to sign in. The one-time link expires in 60 minutes.",
    buttonLabel: "Open InstantMed",
    previewText: "Your secure InstantMed sign-in link is ready. Expires in 60 minutes.",
  },
  invite: {
    headline: "Accept your InstantMed invitation",
    eyebrow: "Account invitation",
    subtitle: "Confirm securely to finish joining.",
    body: "Open the secure page below, then accept the invitation. The one-time link expires in 60 minutes.",
    buttonLabel: "Review invitation",
    previewText: "Your InstantMed invitation is ready to review.",
  },
  emailChangeCurrent: {
    headline: "Approve this email change",
    eyebrow: "Account security",
    subtitle: "Confirm the request from your current inbox.",
    body: "Open the secure page below and approve the change. Nothing changes if you ignore this email.",
    buttonLabel: "Approve change",
    previewText: "Approve the requested change to your InstantMed sign-in email.",
  },
  emailChangeNew: {
    headline: "Confirm your new email address",
    eyebrow: "Account security",
    subtitle: "One final confirmation from this inbox.",
    body: "Open the secure page below and confirm this address for your InstantMed account.",
    buttonLabel: "Confirm new email",
    previewText: "Confirm your new InstantMed sign-in email address.",
  },
  reauthentication: {
    headline: "Verify your identity",
    eyebrow: "Account security",
    subtitle: "Use this one-time verification code.",
    body: "Enter this code in the InstantMed window where you started the security check. It expires shortly.",
    buttonLabel: "",
    previewText: "Your InstantMed identity verification code is ready.",
  },
}

function getCopy(
  actionType: MagicLinkEmailProps["actionType"],
  emailChangeAudience: MagicLinkEmailProps["emailChangeAudience"],
) {
  if (actionType === "signup") return actionCopy.signup
  if (actionType === "recovery") return actionCopy.recovery
  if (actionType === "invite") return actionCopy.invite
  if (actionType === "email_change") {
    return emailChangeAudience === "current"
      ? actionCopy.emailChangeCurrent
      : actionCopy.emailChangeNew
  }
  if (actionType === "reauthentication") return actionCopy.reauthentication
  return actionCopy.magiclink
}

export function MagicLinkEmail({
  loginUrl,
  appUrl = APP_URL,
  actionType = "magiclink",
  emailChangeAudience,
  firstName,
  verificationCode,
}: MagicLinkEmailProps) {
  const copy = getCopy(actionType, emailChangeAudience)
  const isReauthentication = actionType === "reauthentication"

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

      {isReauthentication ? (
        verificationCode ? (
          <VerificationCode code={verificationCode} />
        ) : (
          <Box variant="warning">
            <Text small>Request a fresh verification code from the security screen.</Text>
          </Box>
        )
      ) : loginUrl ? (
        <>
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
        </>
      ) : (
        <Box variant="warning">
          <Text small>Request a fresh link from the sign-in page.</Text>
        </Box>
      )}

      <Text small muted style={{ textAlign: "center" as const }}>
        Didn't ask for this? No stress. Ignore this email and nothing changes on your account.
      </Text>

      {!isReauthentication && (
        <Text small muted style={{ textAlign: "center" as const, marginTop: "4px" }}>
          Button playing up?{" "}
          <a href={`${appUrl}/sign-in`} style={{ color: colors.accent, textDecoration: "none" }}>
            Open the sign-in page
          </a>
        </Text>
      )}
    </BaseEmail>
  )
}
