/**
 * Supabase Auth Webhook Handler
 *
 * Intercepts ALL Supabase auth emails (magic link, signup, recovery, etc.)
 * and sends branded versions via Resend using our React email templates.
 *
 * Supabase config: Dashboard > Auth > Hooks > Send Email hook pointing here.
 * Secret: SUPABASE_AUTH_WEBHOOK_HOOK_SECRET ("v1,whsec_<base64>" format).
 *
 * Uses Standard Webhooks signature verification (not JWT).
 * Supabase signs the payload and sends signature headers (webhook-id,
 * webhook-timestamp, webhook-signature) which we verify via the svix library.
 */

/* eslint-disable no-console */

import { NextResponse } from "next/server"
import { Webhook } from "svix"
import React from "react"

import { toError } from "@/lib/errors"
import { renderEmailToHtml } from "@/lib/email/react-renderer-server"
import { MagicLinkEmail } from "@/components/email/templates/magic-link"
import { applyRateLimit, getClientIdentifier } from "@/lib/rate-limit/redis"

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
  try {
  console.log("[auth-webhook] Step 0: handler entered")

  // Rate limit
  const identifier = getClientIdentifier(req) || "supabase-auth-webhook"
  const rateLimitResponse = await applyRateLimit(req, "webhookAuth", identifier)
  if (rateLimitResponse) return rateLimitResponse

  const hookSecret = process.env.SUPABASE_AUTH_WEBHOOK_HOOK_SECRET
  if (!hookSecret) {
    console.error("[auth-webhook] FAIL: Missing SUPABASE_AUTH_WEBHOOK_HOOK_SECRET")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error("[auth-webhook] FAIL: Missing RESEND_API_KEY")
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
  }

  console.log("[auth-webhook] Step 1: env vars present")

  // --- Verify Standard Webhooks signature ---
  const body = await req.text()
  const svixHeaders = {
    "webhook-id": req.headers.get("webhook-id") ?? req.headers.get("svix-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? req.headers.get("svix-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? req.headers.get("svix-signature") ?? "",
  }

  console.log("[auth-webhook] Step 2: headers", JSON.stringify({
    hasId: !!svixHeaders["webhook-id"],
    hasTs: !!svixHeaders["webhook-timestamp"],
    hasSig: !!svixHeaders["webhook-signature"],
    bodyLen: body.length,
  }))

  let payload: SupabaseAuthHookPayload

  try {
    const secret = hookSecret.startsWith("v1,") ? hookSecret.slice(3) : hookSecret
    const wh = new Webhook(secret)
    payload = wh.verify(body, svixHeaders) as SupabaseAuthHookPayload
    console.log("[auth-webhook] Step 3: signature verified")
  } catch (err) {
    console.error("[auth-webhook] FAIL: Signature verification:", toError(err).message)
    console.error("[auth-webhook] Body preview:", body.slice(0, 200))
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  // --- Extract data ---
  const { user, email_data: emailData } = payload
  if (!user?.email || !emailData?.token_hash || !emailData?.email_action_type) {
    console.error("[auth-webhook] FAIL: Malformed payload. Keys:", Object.keys(payload))
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 })
  }

  console.log("[auth-webhook] Step 4: payload OK, action:", emailData.email_action_type)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? emailData.site_url
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const firstName = user.user_metadata?.first_name ?? user.user_metadata?.full_name?.split(" ")[0]

  const verifyUrl = buildVerifyUrl(
    supabaseUrl,
    emailData.token_hash,
    emailData.email_action_type,
    emailData.redirect_to || appUrl
  )

  const subject = getSubject(emailData.email_action_type, firstName)

  // --- Render email (uses dynamic import of react-dom/server internally) ---
  let html: string
  try {
    html = await renderEmailToHtml(
      React.createElement(MagicLinkEmail, { loginUrl: verifyUrl, appUrl })
    )
    console.log("[auth-webhook] Step 5: rendered", html.length, "chars")
  } catch (err) {
    console.error("[auth-webhook] FAIL: Render:", toError(err).message)
    return NextResponse.json({ error: "Email render failed" }, { status: 500 })
  }

  // --- Send via Resend ---
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "InstantMed <hello@instantmed.com.au>"

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
      const resBody = await response.text().catch(() => "")
      console.error("[auth-webhook] FAIL: Resend", response.status, resBody)
      return NextResponse.json({ error: "Email delivery failed" }, { status: 500 })
    }

    console.log("[auth-webhook] Step 6: email sent to", user.email)
  } catch (err) {
    console.error("[auth-webhook] FAIL: Resend fetch:", toError(err).message)
    return NextResponse.json({ error: "Email delivery failed" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
  } catch (uncaught) {
    console.error("[auth-webhook] UNCAUGHT ERROR:", uncaught instanceof Error ? uncaught.stack : String(uncaught))
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
