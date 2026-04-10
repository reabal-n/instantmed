import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"
import { Webhook } from "svix"
import { updateDeliveryStatus } from "@/lib/monitoring/delivery-tracking"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = createLogger("resend-webhook")

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
    // Local dev — skip verification, parse only
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

/** Map Resend event → email_outbox.status (the CHECK-constrained column) */
function mapEventToEmailStatus(eventType: ResendEventType): string | null {
  switch (eventType) {
    case "email.sent":
      return "sent"
    case "email.delivered":
      // Keep as "sent" — the CHECK constraint only allows pending|sent|failed|skipped_e2e.
      // Fine-grained tracking lives in delivery_status.
      return "sent"
    case "email.bounced":
      return "failed"
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Patient bounce helpers
// ---------------------------------------------------------------------------

async function flagPatientEmailBounce(
  supabase: ReturnType<typeof createServiceRoleClient>,
  email: string | undefined,
  bounceReason: string,
  bounceType: string,
): Promise<void> {
  if (!email) return

  try {
    const { data: patient } = await supabase
      .from("profiles")
      .select("id, email_delivery_failures")
      .eq("email", email)
      .eq("role", "patient")
      .maybeSingle()

    if (!patient) return

    const failures = (patient.email_delivery_failures || 0) + 1

    await supabase
      .from("profiles")
      .update({
        email_bounced: true,
        email_bounce_reason: `${bounceType}: ${bounceReason}`,
        email_bounced_at: new Date().toISOString(),
        email_delivery_failures: failures,
      })
      .eq("id", patient.id)

    log.info("Flagged patient email bounce", { patientId: patient.id, bounceType, failures })
  } catch (error) {
    log.error("Error flagging patient bounce", {}, error)
  }
}

async function resetPatientEmailBounce(
  supabase: ReturnType<typeof createServiceRoleClient>,
  email: string | undefined,
): Promise<void> {
  if (!email) return

  try {
    const { data: patient } = await supabase
      .from("profiles")
      .select("id, email_bounced")
      .eq("email", email)
      .eq("role", "patient")
      .eq("email_bounced", true)
      .maybeSingle()

    if (!patient) return

    await supabase
      .from("profiles")
      .update({
        email_bounced: false,
        email_bounce_reason: null,
        email_delivery_failures: 0,
      })
      .eq("id", patient.id)

    log.info("Reset patient email bounce flag", { patientId: patient.id })
  } catch (error) {
    log.error("Error resetting patient bounce", {}, error)
  }
}

// ---------------------------------------------------------------------------
// Complaint auto-unsubscribe
// ---------------------------------------------------------------------------

async function autoUnsubscribeOnComplaint(
  supabase: ReturnType<typeof createServiceRoleClient>,
  email: string | undefined,
): Promise<void> {
  if (!email) return

  try {
    const { data: patient } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .eq("role", "patient")
      .maybeSingle()

    if (!patient) return

    await supabase
      .from("email_preferences")
      .upsert({
        profile_id: patient.id,
        marketing_emails: false,
        abandoned_checkout_emails: false,
        unsubscribed_at: new Date().toISOString(),
        unsubscribe_reason: "spam_complaint",
        updated_at: new Date().toISOString(),
      }, { onConflict: "profile_id" })

    log.info("Auto-unsubscribed patient after spam complaint", { patientId: patient.id })
  } catch (error) {
    log.error("Error auto-unsubscribing after complaint", {}, error)
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

    log.info("Received event", {
      type: eventType,
      providerId: data.email_id,
      to: data.to?.[0],
    })

    const supabase = createServiceRoleClient()

    // 3. Idempotency: skip if this exact event was already processed
    const eventKey = `${data.email_id}:${eventType}`
    const { data: existingRow } = await supabase
      .from("email_outbox")
      .select("metadata")
      .eq("provider_message_id", data.email_id)
      .maybeSingle()

    if (existingRow?.metadata?.processed_events?.includes(eventKey)) {
      log.info("Duplicate event, skipping", { eventKey })
      return NextResponse.json({ received: true, duplicate: true })
    }

    // 4. Find the email_outbox row by provider_message_id
    const { data: emailLog, error: findError } = await supabase
      .from("email_outbox")
      .select("id, status, delivery_status, certificate_id")
      .eq("provider_message_id", data.email_id)
      .maybeSingle()

    if (findError) {
      log.error("Error finding email log", { error: findError.message })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!emailLog) {
      // Email may have been sent before outbox logging was enabled
      log.warn("Email log not found for provider_message_id", { providerId: data.email_id })
      return NextResponse.json({ received: true, matched: false })
    }

    // 5. Build update payload
    const deliveryStatus = mapEventToDeliveryStatus(eventType)
    const emailStatus = mapEventToEmailStatus(eventType)

    const updates: Record<string, unknown> = {
      delivery_status_updated_at: new Date().toISOString(),
    }

    if (deliveryStatus) {
      updates.delivery_status = deliveryStatus
    }

    if (emailStatus) {
      updates.status = emailStatus
    }

    // Merge metadata (preserve existing, append processed event key)
    const { data: currentLog } = await supabase
      .from("email_outbox")
      .select("metadata")
      .eq("id", emailLog.id)
      .single()

    const existingMetadata = (currentLog?.metadata || {}) as Record<string, unknown>
    const processedEvents = (existingMetadata.processed_events || []) as string[]

    updates.metadata = {
      ...existingMetadata,
      processed_events: [...processedEvents, eventKey],
    }

    // 6. Event-specific side effects

    // --- Bounced ---
    if (eventType === "email.bounced" && data.bounce) {
      ;(updates.metadata as Record<string, unknown>).bounce = data.bounce
      ;(updates.metadata as Record<string, unknown>).bounce_type = data.bounce.type === "hard" ? "hard" : "soft"
      updates.error_message = data.bounce.message

      await flagPatientEmailBounce(supabase, data.to?.[0], data.bounce.message, data.bounce.type)

      log.error("Email bounced", {
        providerId: data.email_id,
        bounceType: data.bounce.type,
        subject: data.subject,
      })

      Sentry.captureMessage(`Email bounce: ${data.bounce.type} - ${data.bounce.message}`, {
        level: "warning",
        tags: {
          source: "resend-webhook",
          event_type: "email.bounced",
          bounce_type: data.bounce.type,
        },
        extra: {
          emailId: data.email_id,
          to: data.to?.[0],
          subject: data.subject,
          bounce: data.bounce,
        },
      })
    }

    // --- Complained ---
    if (eventType === "email.complained") {
      log.warn("Email complaint received", {
        providerId: data.email_id,
        to: data.to?.[0],
        subject: data.subject,
      })

      // Treat complaints the same as bounces for suppression
      await flagPatientEmailBounce(
        supabase,
        data.to?.[0],
        "Spam complaint",
        "complaint",
      )

      // Auto-opt-out from marketing emails (Australian Spam Act compliance)
      await autoUnsubscribeOnComplaint(supabase, data.to?.[0])
    }

    // --- Delivered ---
    if (eventType === "email.delivered") {
      await resetPatientEmailBounce(supabase, data.to?.[0])
    }

    // --- Delivery delayed ---
    if (eventType === "email.delivery_delayed") {
      log.warn("Email delivery delayed", {
        providerId: data.email_id,
        to: data.to?.[0],
        subject: data.subject,
      })
    }

    // --- Opened (certificate tracking) ---
    if (eventType === "email.opened" && emailLog.certificate_id) {
      supabase
        .from("issued_certificates")
        .update({ email_opened_at: new Date().toISOString() })
        .eq("id", emailLog.certificate_id)
        .is("email_opened_at", null) // Only set once
        .then(() => {}, () => {})
    }

    // 7. Feed the delivery-tracking monitoring subsystem (fire-and-forget)
    if (eventType === "email.delivered") {
      updateDeliveryStatus(data.email_id, "delivered").catch(() => {})
    } else if (eventType === "email.bounced") {
      const bType = data.bounce?.type === "hard" ? "hard" : "soft" as const
      updateDeliveryStatus(data.email_id, "bounced", { bounceType: bType }).catch(() => {})
    } else if (eventType === "email.complained") {
      updateDeliveryStatus(data.email_id, "failed", { errorMessage: "Complaint received" }).catch(() => {})
    } else if (eventType === "email.opened") {
      updateDeliveryStatus(data.email_id, "opened").catch(() => {})
    }

    // 7b. PostHog email lifecycle events (fire-and-forget)
    try {
      const { getPostHogClient } = await import("@/lib/posthog-server")
      const posthogEvent = eventType === "email.delivered" ? "email_delivered"
        : eventType === "email.bounced" ? "email_bounced"
        : eventType === "email.complained" ? "email_complained"
        : eventType === "email.opened" ? "email_opened"
        : eventType === "email.clicked" ? "email_clicked"
        : null

      if (posthogEvent) {
        const patientId = (existingRow?.metadata as Record<string, unknown>)?.patient_id as string | undefined
        getPostHogClient().capture({
          distinctId: patientId || data.to?.[0] || "unknown",
          event: posthogEvent,
          properties: {
            provider_message_id: data.email_id,
            email_type: emailLog ? (emailLog as Record<string, unknown>).email_type : undefined,
            subject: data.subject,
            ...(eventType === "email.bounced" && data.bounce ? { bounce_type: data.bounce.type } : {}),
            ...(eventType === "email.clicked" && data.click ? { click_link: data.click.link } : {}),
          },
        })
      }
    } catch {
      // Non-blocking — PostHog failure shouldn't affect webhook processing
    }

    // 8. Write updates to email_outbox
    const { error: updateError } = await supabase
      .from("email_outbox")
      .update(updates)
      .eq("id", emailLog.id)

    if (updateError) {
      log.error("Error updating email log", { emailLogId: emailLog.id, error: updateError.message })
      return NextResponse.json({ error: "Update failed" }, { status: 500 })
    }

    const duration = Date.now() - startTime
    log.info("Webhook processed successfully", {
      emailLogId: emailLog.id,
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
