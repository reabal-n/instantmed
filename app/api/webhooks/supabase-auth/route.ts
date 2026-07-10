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

import { NextResponse } from "next/server"
import React from "react"
import { Webhook } from "svix"

import {
  planAuthEmailMessages,
  type SupabaseAuthHookPayload,
} from "@/lib/auth/auth-email-message-planner"
import { env } from "@/lib/config/env"
import { recordAuthEmailEvent } from "@/lib/data/auth-email-events"
import { MagicLinkEmail } from "@/lib/email/components/templates/magic-link"
import { renderEmailToHtml } from "@/lib/email/react-renderer-server"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit, getClientIdentifier } from "@/lib/rate-limit/redis"

const log = createLogger("supabase-auth-webhook")

// --- Route Handler ---

export async function POST(req: Request) {
  try {
    // Rate limit
    const identifier = getClientIdentifier(req) || "supabase-auth-webhook"
    const rateLimitResponse = await applyRateLimit(req, "webhookAuth", identifier)
    if (rateLimitResponse) return rateLimitResponse

    const hookSecret = process.env.SUPABASE_AUTH_WEBHOOK_HOOK_SECRET
    if (!hookSecret) {
      log.error("Missing SUPABASE_AUTH_WEBHOOK_HOOK_SECRET")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      log.error("Missing RESEND_API_KEY")
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    // --- Verify Standard Webhooks signature ---
    const body = await req.text()
    const svixHeaders = {
      "webhook-id": req.headers.get("webhook-id") ?? req.headers.get("svix-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? req.headers.get("svix-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? req.headers.get("svix-signature") ?? "",
    }

    let payload: SupabaseAuthHookPayload

    try {
      const secret = hookSecret.startsWith("v1,") ? hookSecret.slice(3) : hookSecret
      const wh = new Webhook(secret)
      payload = wh.verify(body, svixHeaders) as SupabaseAuthHookPayload
    } catch (err) {
      log.error("Signature verification failed", {}, toError(err))
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
    }

    const plan = planAuthEmailMessages(payload, { appUrl: env.appUrl })
    if (!plan.ok) {
      log.error("Malformed auth email payload", { reason: plan.error })
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 })
    }

    const appUrl = env.appUrl
    const { user } = payload
    const firstName = user.user_metadata?.first_name ?? user.user_metadata?.full_name?.split(" ")[0]
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "InstantMed <hello@instantmed.com.au>"

    for (const message of plan.messages) {
      let html: string
      try {
        html = await renderEmailToHtml(
          React.createElement(MagicLinkEmail, {
            loginUrl: message.confirmationUrl,
            verificationCode: message.verificationCode,
            appUrl,
            actionType: message.actionType,
            emailChangeAudience: message.emailChangeAudience,
            firstName,
          })
        )
      } catch (err) {
        log.error("Email render failed", { action: message.actionType }, toError(err))
        await recordAuthEmailEvent({
          actionType: message.actionType,
          to: message.to,
          status: "failed",
          errorMessage: "Email render failed",
        })
        return NextResponse.json({ error: "Email render failed" }, { status: 500 })
      }

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": message.idempotencyKey,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: message.to,
            subject: message.subject,
            html,
          }),
        })

        if (!response.ok) {
          const resBody = await response.text().catch(() => "")
          log.error("Resend API error", { status: response.status, body: resBody.slice(0, 200) })
          await recordAuthEmailEvent({
            actionType: message.actionType,
            to: message.to,
            status: "failed",
            httpStatus: response.status,
            errorMessage: resBody,
          })
          return NextResponse.json({ error: "Email delivery failed" }, { status: 500 })
        }

        const responseBody = (await response.json().catch(() => null)) as { id?: string } | null
        await recordAuthEmailEvent({
          actionType: message.actionType,
          to: message.to,
          status: "sent",
          providerMessageId: responseBody?.id ?? null,
        })
        log.info("Auth email sent", { action: message.actionType, hasRecipient: true })
      } catch (err) {
        log.error("Resend fetch failed", { action: message.actionType }, toError(err))
        await recordAuthEmailEvent({
          actionType: message.actionType,
          to: message.to,
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Resend fetch failed",
        })
        return NextResponse.json({ error: "Email delivery failed" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, sent: plan.messages.length })
  } catch (uncaught) {
    log.error("Uncaught error in auth webhook", {}, toError(uncaught))
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
