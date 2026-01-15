import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/observability/logger"
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
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  return createClient(url, key)
}

/**
 * Verify Resend webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  webhookSecret: string | undefined
): boolean {
  // If no secret configured, skip verification (development)
  if (!webhookSecret) {
    logger.warn("[Resend Webhook] No webhook secret configured, skipping verification")
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
    const { type: eventType, data } = event

    logger.info("[Resend Webhook] Received event", {
      type: eventType,
      emailId: data.email_id,
      to: data.to?.[0],
    })

    const supabase = getServiceClient()

    // Find email log by resend_id
    const { data: emailLog, error: findError } = await supabase
      .from("email_logs")
      .select("id, status, delivery_status")
      .eq("resend_id", data.email_id)
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

    // Add bounce info to metadata if bounced
    if (eventType === "email.bounced" && data.bounce) {
      const { data: currentLog } = await supabase
        .from("email_logs")
        .select("metadata")
        .eq("id", emailLog.id)
        .single()

      updates.metadata = {
        ...(currentLog?.metadata || {}),
        bounce: data.bounce,
      }
      updates.last_error = data.bounce.message
    }

    // Update email log
    const { error: updateError } = await supabase
      .from("email_logs")
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Resend may send OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, svix-id, svix-timestamp, svix-signature",
    },
  })
}
