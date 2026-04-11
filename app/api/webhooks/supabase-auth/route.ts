/**
 * Supabase Auth Webhook Handler
 *
 * Intercepts ALL Supabase auth emails (magic link, signup, recovery, etc.)
 * and sends branded versions via Resend using our React email templates.
 *
 * Supabase config: Dashboard > Auth > Hooks > Send Email hook pointing here.
 * Secret: SUPABASE_AUTH_WEBHOOK_HOOK_SECRET (shared JWT secret, HS256).
 */

import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import React from "react"

import { createLogger } from "@/lib/observability/logger"
import { toError } from "@/lib/errors"
import { renderEmailToHtml } from "@/lib/email/react-renderer-server"
import { MagicLinkEmail } from "@/components/email/templates/magic-link"
import { applyRateLimit, getClientIdentifier } from "@/lib/rate-limit/redis"

const log = createLogger("supabase-auth-webhook")

// --- Types ---

interface SupabaseAuthHookPayload {
  user: {
    id: string
    email: string
    user_metadata?: {
      full_name?: string
      first_name?: string
    }
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type:
      | "magiclink"
      | "signup"
      | "recovery"
      | "invite"
      | "email_change"
      | "reauthentication"
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

// --- Helpers ---

function buildVerifyUrl(
  supabaseUrl: string,
  tokenHash: string,
  actionType: string,
  redirectTo: string
): string {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: actionType,
    redirect_to: redirectTo,
  })
  return `${supabaseUrl}/auth/v1/verify?${params.toString()}`
}

function getSubject(actionType: string, firstName?: string): string {
  const subjectMap: Record<string, string> = {
    magiclink: "Your InstantMed login link",
    signup: firstName
      ? `Welcome, ${firstName}! Confirm your email`
      : "Confirm your InstantMed email",
    recovery: "Reset your InstantMed password",
    invite: "You've been invited to InstantMed",
    email_change: "Confirm your new email address",
    reauthentication: "Confirm your InstantMed identity",
  }
  return subjectMap[actionType] ?? "InstantMed notification"
}

// --- Route Handler ---

export async function POST(req: Request) {
  // Rate limit: 30 requests/min. Fail-open if Redis is unavailable.
  const identifier = getClientIdentifier(req) || "supabase-auth-webhook"
  const rateLimitResponse = await applyRateLimit(req, "webhookAuth", identifier)
  if (rateLimitResponse) return rateLimitResponse

  const hookSecret = process.env.SUPABASE_AUTH_WEBHOOK_HOOK_SECRET
  if (!hookSecret) {
    log.error("Missing SUPABASE_AUTH_WEBHOOK_HOOK_SECRET")
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    log.error("Missing RESEND_API_KEY")
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 500 }
    )
  }

  // --- Verify JWT ---
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or malformed authorization header" },
      { status: 401 }
    )
  }

  const token = authHeader.slice(7)
  let payload: SupabaseAuthHookPayload

  try {
    const secret = new TextEncoder().encode(hookSecret)
    const { payload: jwtPayload } = await jwtVerify(token, secret)
    payload = jwtPayload as unknown as SupabaseAuthHookPayload
  } catch (err) {
    log.error("JWT verification failed", {}, toError(err))
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  // --- Extract data ---
  const { user, email_data: emailData } = payload
  if (!user?.email || !emailData?.token_hash || !emailData?.email_action_type) {
    log.error("Malformed payload", {
      hasUser: !!user,
      hasEmail: !!user?.email,
      hasEmailData: !!emailData,
    })
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 })
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? emailData.site_url
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const firstName =
    user.user_metadata?.first_name ?? user.user_metadata?.full_name?.split(" ")[0]

  const verifyUrl = buildVerifyUrl(
    supabaseUrl,
    emailData.token_hash,
    emailData.email_action_type,
    emailData.redirect_to || appUrl
  )

  const subject = getSubject(emailData.email_action_type, firstName)

  // --- Render email ---
  // All auth email types use the MagicLinkEmail template with action-specific subjects.
  // The template is generic enough (login link CTA) for all auth verification flows.
  let html: string
  try {
    html = await renderEmailToHtml(
      React.createElement(MagicLinkEmail, { loginUrl: verifyUrl, appUrl })
    )
  } catch (err) {
    log.error(
      "Email render failed",
      { actionType: emailData.email_action_type },
      toError(err)
    )
    return NextResponse.json(
      { error: "Email render failed" },
      { status: 500 }
    )
  }

  // --- Send via Resend ---
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ?? "InstantMed <hello@instantmed.com.au>"

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: user.email,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      log.error("Resend API error", {
        to: user.email,
        status: response.status,
        body,
        actionType: emailData.email_action_type,
      })
      return NextResponse.json(
        { error: "Email delivery failed" },
        { status: 500 }
      )
    }

    log.info("Auth email sent", {
      to: user.email,
      actionType: emailData.email_action_type,
    })
  } catch (err) {
    log.error(
      "Resend fetch failed",
      { actionType: emailData.email_action_type },
      toError(err)
    )
    return NextResponse.json(
      { error: "Email delivery failed" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
