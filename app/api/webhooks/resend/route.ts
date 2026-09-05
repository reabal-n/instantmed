import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"

import { hashAuthEmailRecipient } from "@/lib/data/auth-email-events"
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
const UNMATCHED_OUTBOX_RETRY_WINDOW_MS = 35 * 60_000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.failed"
  | "email.suppressed"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked"

const TRACKED_RESEND_EVENT_TYPES = new Set<string>([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.failed",
  "email.suppressed",
  "email.bounced",
  "email.complained",
  "email.opened",
  "email.clicked",
])
const AUTH_EMAIL_TERMINAL_FAILURE_TYPES = new Set<ResendEventType>([
  "email.failed",
  "email.suppressed",
  "email.bounced",
])

interface ResendWebhookPayload {
  type: unknown
  created_at?: unknown
  data?: unknown
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
    case "email.failed":
      return "failed"
    case "email.suppressed":
      return "suppressed"
    case "email.opened":
      return "opened"
    case "email.clicked":
      return "clicked"
    default:
      return null
  }
}

function isTrackedResendEventType(value: unknown): value is ResendEventType {
  return typeof value === "string" && TRACKED_RESEND_EVENT_TYPES.has(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function boundedProviderField(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized.slice(0, maxLength) : undefined
}

function normalizeBounceType(value: string | undefined): "hard" | "soft" {
  const normalized = value?.trim().toLowerCase()
  if (normalized === "permanent" || normalized === "hard") return "hard"

  // Resend currently emits Transient or Undetermined; Temporary is retained
  // as a provider/legacy soft-bounce alias. Unknown values fail conservative
  // to soft instead of inventing permanent-address evidence.
  return "soft"
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

    const eventType = event.type
    if (typeof eventType !== "string" || eventType.length === 0) {
      log.warn("Invalid Resend event type")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Resend can add event types independently of this route. A validly signed
    // event outside the explicitly tracked lifecycle must be acknowledged so a
    // provider expansion cannot create an endless retry loop.
    if (!isTrackedResendEventType(eventType)) {
      log.info("Ignoring untracked Resend event", { type: eventType.slice(0, 80) })
      return NextResponse.json({ received: true, tracked: false })
    }

    const data = event.data
    const eventCreatedAtMs = typeof event.created_at === "string"
      ? Date.parse(event.created_at)
      : Number.NaN
    if (
      !isRecord(data)
      || typeof data.email_id !== "string"
      || data.email_id.length === 0
      || data.email_id.length > 255
      || !Number.isFinite(eventCreatedAtMs)
    ) {
      log.warn("Invalid tracked Resend event payload")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    const eventCreatedAt = new Date(eventCreatedAtMs).toISOString()
    const providerId = data.email_id
    const recipients = Array.isArray(data.to) ? data.to : []
    const recipient = typeof recipients[0] === "string" ? recipients[0] : ""
    const bounce = isRecord(data.bounce) ? data.bounce : null
    const failed = isRecord(data.failed) ? data.failed : null
    const suppressed = isRecord(data.suppressed) ? data.suppressed : null
    const rawBounceType = boundedProviderField(bounce?.type, 100)
    const bounceMessage = boundedProviderField(bounce?.message, 500)
    const failedReason = boundedProviderField(failed?.reason, 500)
    const suppressionType = boundedProviderField(suppressed?.type, 100)
    const suppressionMessage = boundedProviderField(suppressed?.message, 500)

    const recipientForLog = sanitizeEmailForLog(recipient)

    log.info("Received event", {
      type: eventType,
      providerId,
      to: recipientForLog,
    })

    const supabase = createServiceRoleClient()

    // 3. Atomically own this provider event before any side effects. The RPC
    // locks the outbox row, set-unions metadata.processed_events, and applies a
    // monotonic delivery state so concurrent click/open/delivery callbacks
    // cannot overwrite one another's durable receipt.
    const bounceType = eventType === "email.bounced"
      ? normalizeBounceType(rawBounceType)
      : null
    const providerErrorMessage = eventType === "email.bounced"
      ? bounceMessage ?? null
      : eventType === "email.failed"
        ? failedReason ?? null
        : eventType === "email.suppressed"
          ? suppressionMessage ?? null
          : null
    const { data: recordedData, error: recordError } = await supabase
      .rpc("record_resend_outbox_event", {
        p_bounce_type: bounceType,
        p_error_message: providerErrorMessage,
        p_event_created_at: eventCreatedAt,
        p_event_type: eventType,
        p_provider_detail_type: eventType === "email.suppressed"
          ? suppressionType ?? null
          : null,
        p_provider_message_id: providerId,
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
      const { data: authEmailEvent, error: authEmailError } = await supabase
        .from("auth_email_events")
        .select("id, recipient_hash")
        .eq("provider_message_id", providerId)
        .limit(1)
        .maybeSingle()

      if (authEmailError) {
        log.error("Error checking auth email lifecycle ownership", {
          error: authEmailError.message,
        })
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }

      if (authEmailEvent) {
        if (eventType === "email.complained") {
          const normalizedRecipient = recipient.trim().toLowerCase()
          if (
            normalizedRecipient.length === 0
            || hashAuthEmailRecipient(normalizedRecipient) !== authEmailEvent.recipient_hash
          ) {
            log.error("Auth email complaint recipient did not match durable ownership")
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
          }

          const { error: complaintPreferenceError } = await supabase.rpc(
            "record_email_spam_complaint",
            {
              p_event_created_at: eventCreatedAt,
              p_normalized_email: normalizedRecipient,
            },
          )

          if (complaintPreferenceError) {
            log.error("Error recording auth email complaint preference", {
              error: complaintPreferenceError.message,
            })
            return NextResponse.json({ error: "Database error" }, { status: 500 })
          }
        }

        if (AUTH_EMAIL_TERMINAL_FAILURE_TYPES.has(eventType)) {
          // Auth sends do not use email_outbox. Persist provider-terminal
          // evidence on their PHI-free operational row so the existing
          // critical auth-email health check can see it. The guarded
          // assignment is idempotent under Resend's at-least-once delivery.
          const { error: authEmailUpdateError } = await supabase
            .from("auth_email_events")
            .update({
              error_message: `Resend ${eventType}`,
              status: "failed",
            })
            .eq("id", authEmailEvent.id)
            .neq("status", "failed")

          if (authEmailUpdateError) {
            log.error("Error recording auth email terminal failure", {
              error: authEmailUpdateError.message,
              type: eventType,
            })
            return NextResponse.json({ error: "Database error" }, { status: 500 })
          }
        }

        log.info("Managed auth email lifecycle callback acknowledged", {
          type: eventType,
          providerId,
        })
        return NextResponse.json({ received: true, matched: true, tracked: false })
      }

      // Resend delivers at least once and can outrun the provider-id write that
      // follows a successful send. Retry only inside that bounded race window;
      // direct unmanaged and legacy sends must not churn through every provider
      // retry after it is impossible for normal outbox finalization to catch up.
      const eventAgeMs = Date.now() - eventCreatedAtMs
      if (Math.abs(eventAgeMs) <= UNMATCHED_OUTBOX_RETRY_WINDOW_MS) {
        log.warn("Email lifecycle record not ready for provider_message_id", {
          providerId,
        })
        return NextResponse.json(
          { error: "Email lifecycle record not ready", retryable: true },
          { status: 503, headers: { "Retry-After": "5" } },
        )
      }

      log.info("Unmanaged email lifecycle callback acknowledged", {
        type: eventType,
        providerId,
      })
      return NextResponse.json({ received: true, matched: false, tracked: false })
    }

    if (recorded.duplicate) {
      log.info("Duplicate event, skipping", { type: eventType })
      return NextResponse.json({ received: true, duplicate: true })
    }

    // 4. The receipt and every critical database mirror are durable. Continue
    // only with best-effort logs and telemetry.
    const deliveryStatus = mapEventToDeliveryStatus(eventType)

    // --- Bounced ---
    if (eventType === "email.bounced") {
      log.error("Email bounced", {
        providerId,
        bounceType,
      })

      Sentry.captureMessage("Email bounced", {
        level: "warning",
        tags: {
          source: "resend-webhook",
          event_type: "email.bounced",
          bounce_type: bounceType,
        },
        extra: {
          emailId: providerId,
          recipient: recipientForLog,
          bounceType,
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
            emailId: providerId,
            bounceType: "hard",
          },
        })
      }
    }

    if (eventType === "email.failed" || eventType === "email.suppressed") {
      log.error("Email provider terminal failure", {
        providerId,
        eventType,
      })
      Sentry.captureMessage("Email provider terminal failure", {
        level: "warning",
        tags: {
          source: "resend-webhook",
          event_type: eventType,
        },
        extra: { emailId: providerId },
      })

      if (recorded.emailType && CRITICAL_FULFILMENT_EMAIL_TYPES.has(recorded.emailType)) {
        Sentry.captureMessage("Critical fulfilment email failed", {
          level: "error",
          tags: {
            source: "resend-webhook",
            event_type: eventType,
            email_type: recorded.emailType,
          },
          extra: { emailId: providerId },
        })
      }
    }

    // --- Complained ---
    if (eventType === "email.complained") {
      log.warn("Email complaint received", {
        providerId,
        to: recipientForLog,
      })

    }

    // --- Delivery delayed ---
    if (eventType === "email.delivery_delayed") {
      log.warn("Email delivery delayed", {
        providerId,
        to: recipientForLog,
      })
    }

    // 5. PostHog email lifecycle events (fire-and-forget)
    try {
      const { capturePersonlessPostHogEvent } = await import("@/lib/analytics/posthog-server")
      const posthogEvent = eventType === "email.delivered" ? "email_delivered"
        : eventType === "email.bounced" ? "email_bounced"
        : eventType === "email.failed" ? "email_failed"
        : eventType === "email.suppressed" ? "email_suppressed"
        : eventType === "email.complained" ? "email_complained"
        : eventType === "email.opened" ? "email_opened"
        : eventType === "email.clicked" ? "email_clicked"
        : null

      if (posthogEvent) {
        capturePersonlessPostHogEvent({
          event: posthogEvent,
          requestId: providerId,
          properties: {
            email_is_test: recorded.emailIsTest,
            email_type: recorded.emailType,
            ...(eventType === "email.bounced" ? { bounce_type: bounceType } : {}),
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
