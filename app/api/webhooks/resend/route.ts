import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"

import { sanitizeEmailForLog } from "@/lib/email/send/helpers"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = createLogger("resend-webhook")
const CRITICAL_FULFILMENT_EMAIL_TYPES = new Set([
  "cert_ready",
  "med_cert_patient",
  "script_sent",
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked"

interface ResendWebhookPayload {
  type: ResendEventType
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
    bounce?: { message: string; type: string }
    click?: { link: string; timestamp: string; user_agent: string }
  }
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verify Resend webhook signature using Svix.
 *
 * Resend signs webhooks via Svix. The signing algorithm is:
 *   HMAC-SHA256( svix-id + "." + svix-timestamp + "." + body, base64decode(secret) )
 * and the result is base64-encoded with a "v1," prefix in the svix-signature header.
 *
 * Returns the parsed payload on success, throws on failure.
 */
function verifyAndParseWebhook(
  payload: string,
  headers: Headers,
  webhookSecret: string | undefined,
): ResendWebhookPayload {
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "preview") {
      log.error("RESEND_WEBHOOK_SECRET not configured in production/preview")
      throw new Error("No webhook secret configured")
    }
    // Local dev - skip verification, parse only
    log.warn("No webhook secret configured, skipping verification (dev mode)")
    return JSON.parse(payload) as ResendWebhookPayload
  }

  const wh = new Webhook(webhookSecret)
  return wh.verify(payload, {
    "svix-id": headers.get("svix-id") ?? "",
    "svix-timestamp": headers.get("svix-timestamp") ?? "",
    "svix-signature": headers.get("svix-signature") ?? "",
  }) as ResendWebhookPayload
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

/** Map Resend event → email_outbox.delivery_status value */
function mapEventToDeliveryStatus(eventType: ResendEventType): string | null {
  switch (eventType) {
    case "email.delivered":
      return "delivered"
    case "email.bounced":
      return "bounced"
    case "email.complained":
      return "complained"
    case "email.delivery_delayed":
      return "delayed"
    case "email.opened":
      return "opened"
    case "email.clicked":
      return "clicked"
    default:
      return null
  }
}

interface RecordedOutboxEvent {
  duplicate: boolean
  emailIsTest: boolean
  emailType: string | null
  matched: boolean
  outboxId: string | null
}

function parseRecordedOutboxEvent(value: unknown): RecordedOutboxEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (typeof row.matched !== "boolean" || typeof row.duplicate !== "boolean") return null
  if (typeof row.email_is_test !== "boolean") return null

  const outboxId = typeof row.outbox_id === "string" && row.outbox_id.length > 0
    ? row.outbox_id
    : null
  const emailType = typeof row.email_type === "string" && row.email_type.length > 0
    ? row.email_type
    : null
  if (row.matched && (!outboxId || !emailType)) return null

  return {
    duplicate: row.duplicate,
    emailIsTest: row.email_is_test,
    emailType,
    matched: row.matched,
    outboxId,
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * Resend webhook handler.
 *
 * Receives delivery status events from Resend (via Svix) and updates
 * the email_outbox table accordingly. Also flags/resets patient profile
 * bounce status and feeds the delivery-tracking monitoring subsystem.
 *
 * Configure in Resend dashboard:
 *   URL: https://instantmed.com.au/api/webhooks/resend
 *   Events: All email events
 *   Signing secret → RESEND_WEBHOOK_SECRET env var
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text()
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

    // 2. Verify signature
    let event: ResendWebhookPayload
    try {
      event = verifyAndParseWebhook(rawBody, request.headers, webhookSecret)
    } catch {
      log.warn("Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const { type: eventType, data } = event
    const eventCreatedAtMs = Date.parse(event.created_at)
    if (!Number.isFinite(eventCreatedAtMs)) {
      log.warn("Invalid Resend event timestamp")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    const eventCreatedAt = new Date(eventCreatedAtMs).toISOString()

    const recipientForLog = sanitizeEmailForLog(data.to?.[0] ?? "")

    log.info("Received event", {
      type: eventType,
      providerId: data.email_id,
      to: recipientForLog,
    })

    const supabase = createServiceRoleClient()

    // 3. Atomically own this provider event before any side effects. The RPC
    // locks the outbox row, set-unions metadata.processed_events, and applies a
    // monotonic delivery state so concurrent click/open/delivery callbacks
    // cannot overwrite one another's durable receipt.
    const bounceType = eventType === "email.bounced" && data.bounce
      ? data.bounce.type === "hard" ? "hard" : "soft"
      : null
    const bounceMessage = eventType === "email.bounced" && data.bounce
      ? data.bounce.message
      : null
    const { data: recordedData, error: recordError } = await supabase
      .rpc("record_resend_outbox_event", {
        p_bounce_type: bounceType,
        p_error_message: bounceMessage,
        p_event_created_at: eventCreatedAt,
        p_event_type: eventType,
        p_provider_message_id: data.email_id,
      })
      .single()

    if (recordError) {
      log.error("Error recording email lifecycle event", { error: recordError.message })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const recorded = parseRecordedOutboxEvent(recordedData)
    if (!recorded) {
      log.error("Email lifecycle receipt returned an invalid result")
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!recorded.matched) {
      // Resend delivers at least once and can outrun the provider-id write that
      // follows a successful send. A non-200 asks it to retry after that atomic
      // outbox finalization rather than permanently acknowledging a lost event.
      log.warn("Email lifecycle record not ready for provider_message_id", {
        providerId: data.email_id,
      })
      return NextResponse.json(
        { error: "Email lifecycle record not ready", retryable: true },
        { status: 503, headers: { "Retry-After": "5" } },
      )
    }

    if (recorded.duplicate) {
      log.info("Duplicate event, skipping", { type: eventType })
      return NextResponse.json({ received: true, duplicate: true })
    }

    // 4. The receipt and every critical database mirror are durable. Continue
    // only with best-effort logs and telemetry.
    const deliveryStatus = mapEventToDeliveryStatus(eventType)

    // --- Bounced ---
    if (eventType === "email.bounced" && data.bounce) {
      log.error("Email bounced", {
        providerId: data.email_id,
        bounceType: data.bounce.type,
      })

      Sentry.captureMessage("Email bounced", {
        level: "warning",
        tags: {
          source: "resend-webhook",
          event_type: "email.bounced",
          bounce_type: data.bounce.type,
        },
        extra: {
          emailId: data.email_id,
          recipient: recipientForLog,
          bounceType: data.bounce.type,
        },
      })

      if (
        bounceType === "hard"
        && recorded.emailType
        && CRITICAL_FULFILMENT_EMAIL_TYPES.has(recorded.emailType)
      ) {
        Sentry.captureMessage("Critical fulfilment email bounced", {
          level: "error",
          tags: {
            source: "resend-webhook",
            event_type: "email.bounced",
            email_type: recorded.emailType,
            bounce_type: "hard",
          },
          extra: {
            emailId: data.email_id,
            bounceType: "hard",
          },
        })
      }
    }

    // --- Complained ---
    if (eventType === "email.complained") {
      log.warn("Email complaint received", {
        providerId: data.email_id,
        to: recipientForLog,
      })

    }

    // --- Delivery delayed ---
    if (eventType === "email.delivery_delayed") {
      log.warn("Email delivery delayed", {
        providerId: data.email_id,
        to: recipientForLog,
      })
    }

    // 5. PostHog email lifecycle events (fire-and-forget)
    try {
      const { capturePersonlessPostHogEvent } = await import("@/lib/analytics/posthog-server")
      const posthogEvent = eventType === "email.delivered" ? "email_delivered"
        : eventType === "email.bounced" ? "email_bounced"
        : eventType === "email.complained" ? "email_complained"
        : eventType === "email.opened" ? "email_opened"
        : eventType === "email.clicked" ? "email_clicked"
        : null

      if (posthogEvent) {
        capturePersonlessPostHogEvent({
          event: posthogEvent,
          requestId: data.email_id,
          properties: {
            email_is_test: recorded.emailIsTest,
            email_type: recorded.emailType,
            ...(eventType === "email.bounced" && data.bounce ? { bounce_type: data.bounce.type } : {}),
          },
        })
      }
    } catch {
      // Non-blocking - PostHog failure shouldn't affect webhook processing
    }

    const duration = Date.now() - startTime
    log.info("Webhook processed successfully", {
      emailLogId: recorded.outboxId,
      eventType,
      deliveryStatus,
      durationMs: duration,
    })

    return NextResponse.json({ received: true, matched: true, updated: true })
  } catch (error) {
    log.error("Webhook processing error", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { tags: { source: "resend-webhook" } })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
