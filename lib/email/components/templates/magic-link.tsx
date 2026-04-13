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
}

export const magicLinkEmailSubject = "Your InstantMed login link"

export function MagicLinkEmail({
  loginUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: MagicLinkEmailProps) {
  return (
    <BaseEmail
      previewText="Tap the button to log in to InstantMed. Expires in 60 minutes."
      appUrl={appUrl}
    >
      <HeroBlock
        icon="🔑"
        headline="Your login link"
        subtitle="Tap below to continue"
        variant="info"
      />

      <Text>
        One tap and you're in. This link expires in 60 minutes and works once only.
      </Text>

      <Button href={loginUrl}>Log in to InstantMed</Button>

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
