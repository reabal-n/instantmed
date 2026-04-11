import crypto from "crypto"
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { env } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
import { handlers } from "./handlers"
import { tryClaimEvent } from "./handlers/utils"

const log = createLogger("stripe-webhook")

// Give after() (draft gen + auto-approval) the full function lifetime.
// Without this, Vercel Pro defaults to 60s - enough for the webhook response
// but tight for the AI calls inside after(). The retry-auto-approval cron
// catches anything that slips through, but 300s eliminates the gap entirely.
export const maxDuration = 300

// Use service role for webhook (bypasses RLS)
function getServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
}

/**
 * Stripe webhook dispatcher.
 *
 * 1. Verifies signature (or admin replay secret)
 * 2. Routes to the appropriate handler via the handlers map
 * 3. Returns { received: true } for unhandled event types
 *
 * Individual handlers live in ./handlers/ - one file per event type.
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  // Check for admin replay request (from DLQ retry)
  const isAdminReplay = request.headers.get("X-Admin-Replay") === "true"
  const adminReplaySecret = request.headers.get("X-Admin-Replay-Secret")
  const originalEventId = request.headers.get("X-Original-Event-Id")

  let event: Stripe.Event

  if (isAdminReplay) {
    // Verify admin replay secret
    const expectedSecret = process.env.INTERNAL_API_SECRET || ""
    if (
      !adminReplaySecret ||
      !expectedSecret ||
      adminReplaySecret.length !== expectedSecret.length ||
      !crypto.timingSafeEqual(Buffer.from(adminReplaySecret), Buffer.from(expectedSecret))
    ) {
      log.warn("Invalid admin replay secret", { originalEventId })
      return NextResponse.json({ error: "Invalid replay credentials" }, { status: 401 })
    }

    // Parse the stored payload directly (signature already verified on first receipt)
    try {
      const payload = JSON.parse(body)
      event = payload as Stripe.Event
      log.info("Processing admin replay", { eventId: event.id, originalEventId, type: event.type })
    } catch (parseError) {
      log.error("Failed to parse admin replay payload", { originalEventId }, parseError)
      return NextResponse.json({ error: "Invalid replay payload" }, { status: 400 })
    }
  } else {
    // Normal webhook flow - verify signature
    if (!signature) {
      log.error("Missing stripe-signature header", {})
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    let webhookSecret: string
    try {
      webhookSecret = env.stripeWebhookSecret
    } catch (error) {
      log.error("STRIPE_WEBHOOK_SECRET not configured", {}, error)
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      log.error("Signature verification failed", {}, err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
  }

  const supabase = getServiceClient()

  // Route to handler
  const handler = handlers.get(event.type)

  if (handler) {
    const result = await handler({ event, supabase, startTime })
    // If handler returns a NextResponse, use it; otherwise return default success
    if (result) return result
  } else {
    log.info("Unhandled event type", { eventType: event.type })
    // Still claim to prevent duplicates on retry
    await tryClaimEvent(supabase, event.id, event.type)
  }

  return NextResponse.json({ received: true })
}
