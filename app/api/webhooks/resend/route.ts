import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"
import crypto from "crypto"

/**
 * P1 FIX: Resend Webhook Handler
 * 
 * Handles delivery status updates from Resend:
 * - email.delivered
 * - email.bounced
 * - email.complained
 * - email.opened
 * - email.clicked
 * 
 * Configure webhook in Resend dashboard:
 * URL: https://yourdomain.com/api/webhooks/resend
 * Events: All email events
 */

// Resend webhook event types
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
    // Bounce-specific fields
    bounce?: {
      message: string
      type: string
    }
    // Click-specific fields
    click?: {
      link: string
      timestamp: string
      user_agent: string
    }
  }
}

function getServiceClient() {
  return createServiceRoleClient()
}

/**
 * Verify Resend webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  webhookSecret: string | undefined
): boolean {
  // Require webhook secret in production and Vercel preview
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "preview") {
      logger.error("[Resend Webhook] CRITICAL: No webhook secret configured in production/preview")
      return false
    }
    logger.warn("[Resend Webhook] No webhook secret configured, skipping verification (local dev only)")
    return true
  }

  if (!signature) {
    return false
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex")
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

/**
 * Map Resend event type to our delivery status
 */
function mapEventToDeliveryStatus(eventType: ResendEventType): string | null {
  switch (eventType) {
    case "email.delivered":
      return "delivered"
    case "email.bounced":
      return "bounced"
    case "email.complained":
      return "complained"
    case "email.opened":
      return "opened"
    case "email.clicked":
      return "clicked"
    case "email.delivery_delayed":
      return "delayed"
    default:
      return null
  }
}

/**
 * Map Resend event type to our email status
 */
function mapEventToEmailStatus(eventType: ResendEventType): string | null {
  switch (eventType) {
    case "email.sent":
      return "sent"
    case "email.delivered":
      return "delivered"
    case "email.bounced":
      return "bounced"
    default:
      return null
  }
}

/**
 * Flag a patient's profile when their email bounces
 */
async function flagPatientEmailBounce(
  supabase: ReturnType<typeof createServiceRoleClient>,
  email: string | undefined,
  bounceReason: string,
  bounceType: string
): Promise<void> {
  if (!email) return

  try {
    // Find patient by email
    const { data: patient } = await supabase
      .from("profiles")
      .select("id, email_delivery_failures")
      .eq("email", email)
      .eq("role", "patient")
      .maybeSingle()

    if (!patient) return

    const failures = (patient.email_delivery_failures || 0) + 1

    // Update patient profile with bounce info
    await supabase
      .from("profiles")
      .update({
        email_bounced: true,
        email_bounce_reason: `${bounceType}: ${bounceReason}`,
        email_bounced_at: new Date().toISOString(),
        email_delivery_failures: failures,
      })
      .eq("id", patient.id)

    logger.info("[Resend Webhook] Flagged patient email bounce", {
      patientId: patient.id,
      email,
      bounceType,
      failures,
    })
  } catch (error) {
    logger.error("[Resend Webhook] Error flagging patient bounce", {
      email,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Reset patient bounce flag when email is delivered successfully
 */
async function resetPatientEmailBounce(
  supabase: ReturnType<typeof createServiceRoleClient>,
  email: string | undefined
): Promise<void> {
  if (!email) return

  try {
    // Only reset if currently marked as bounced
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

    logger.info("[Resend Webhook] Reset patient email bounce flag", {
      patientId: patient.id,
      email,
    })
  } catch (error) {
    logger.error("[Resend Webhook] Error resetting patient bounce", {
      email,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const payload = await request.text()
    const signature = request.headers.get("svix-signature")
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

    // Verify signature
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      logger.warn("[Resend Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const event: ResendWebhookPayload = JSON.parse(payload)
    const { type: eventType, data, created_at: _eventCreatedAt } = event

    logger.info("[Resend Webhook] Received event", {
      type: eventType,
      emailId: data.email_id,
      to: data.to?.[0],
    })

    const supabase = getServiceClient()

    // Idempotency check: prevent processing same event twice
    const eventKey = `${data.email_id}:${eventType}`
    const { data: existingEvent } = await supabase
      .from("email_outbox")
      .select("metadata")
      .eq("provider_message_id", data.email_id)
      .maybeSingle()

    if (existingEvent?.metadata?.processed_events?.includes(eventKey)) {
      logger.info("[Resend Webhook] Duplicate event, skipping", { eventKey })
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Find email log by provider_message_id
    const { data: emailLog, error: findError } = await supabase
      .from("email_outbox")
      .select("id, status, delivery_status")
      .eq("provider_message_id", data.email_id)
      .maybeSingle()

    if (findError) {
      logger.error("[Resend Webhook] Error finding email log", { error: findError })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!emailLog) {
      // Email might have been sent before we started logging resend_id
      logger.warn("[Resend Webhook] Email log not found", { emailId: data.email_id })
      return NextResponse.json({ received: true, matched: false })
    }

    // Determine updates
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

    // Get current metadata to merge with updates
    const { data: currentLog } = await supabase
      .from("email_outbox")
      .select("metadata")
      .eq("id", emailLog.id)
      .single()

    const existingMetadata = (currentLog?.metadata || {}) as Record<string, unknown>
    const processedEvents = (existingMetadata.processed_events || []) as string[]

    // Track processed events for idempotency
    updates.metadata = {
      ...existingMetadata,
      processed_events: [...processedEvents, eventKey],
    }

    // Add bounce info to metadata if bounced
    if (eventType === "email.bounced" && data.bounce) {
      (updates.metadata as Record<string, unknown>).bounce = data.bounce
      updates.error_message = data.bounce.message

      // P1: Flag patient profile with delivery failure
      await flagPatientEmailBounce(supabase, data.to?.[0], data.bounce.message, data.bounce.type)

      Sentry.captureMessage(
        `Email bounce: ${data.bounce.type} - ${data.bounce.message}`,
        {
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
        }
      )
    }

    // Log delivery delays
    if (eventType === "email.delivery_delayed") {
      logger.warn("[Resend Webhook] Email delivery delayed", {
        emailId: data.email_id,
        to: data.to?.[0],
        subject: data.subject,
      })
    }

    // Reset bounce flag if email delivered successfully
    if (eventType === "email.delivered") {
      await resetPatientEmailBounce(supabase, data.to?.[0])
    }

    // Update email outbox
    const { error: updateError } = await supabase
      .from("email_outbox")
      .update(updates)
      .eq("id", emailLog.id)

    if (updateError) {
      logger.error("[Resend Webhook] Error updating email log", { error: updateError })
      return NextResponse.json({ error: "Update failed" }, { status: 500 })
    }

    logger.info("[Resend Webhook] Updated email log", {
      emailLogId: emailLog.id,
      eventType,
      deliveryStatus,
      duration: Date.now() - startTime,
    })

    return NextResponse.json({ 
      received: true, 
      matched: true,
      updated: true,
    })

  } catch (error) {
    logger.error("[Resend Webhook] Error processing webhook", {
      error: error instanceof Error ? error.message : String(error),
    })
    Sentry.captureException(error, {
      tags: { source: "resend-webhook" },
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Webhooks are server-to-server, CORS not needed
// Resend sends POST requests directly without preflight
