/**
 * Email/SMS Delivery Status Tracking
 * 
 * OBSERVABILITY_AUDIT P1: Email/SMS Delivery Confirmation
 * 
 * Tracks delivery status from providers (Resend webhooks, Twilio callbacks).
 */

import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

export interface DeliveryEvent {
  messageId: string
  requestId?: string
  patientId?: string
  channel: "email" | "sms"
  templateType: string
  providerId: string // Resend ID or Twilio SID
  
  // Recipient
  recipient: string // Email or phone (masked)
  
  // Status
  status: "sent" | "delivered" | "bounced" | "failed" | "opened"
  
  // Timestamps
  sentAt?: string
  deliveredAt?: string
  bouncedAt?: string
  openedAt?: string
  
  // Error details
  bounceType?: "hard" | "soft"
  bounceReason?: string
  errorCode?: string
  errorMessage?: string
  
  // Retry tracking
  attemptNumber: number
}

/**
 * Record initial send
 */
export async function recordDeliverySent(params: {
  messageId: string
  requestId?: string
  patientId?: string
  channel: "email" | "sms"
  templateType: string
  providerId: string
  recipient: string
}): Promise<void> {
  const supabase = await createClient()
  
  // Mask recipient for privacy
  const maskedRecipient = params.channel === "email"
    ? maskEmail(params.recipient)
    : maskPhone(params.recipient)
  
  await supabase.from("delivery_tracking").insert({
    message_id: params.messageId,
    request_id: params.requestId,
    patient_id: params.patientId,
    channel: params.channel,
    template_type: params.templateType,
    provider_id: params.providerId,
    recipient: maskedRecipient,
    status: "sent",
    sent_at: new Date().toISOString(),
    attempt_number: 1,
  })
}

/**
 * Update delivery status from webhook
 */
export async function updateDeliveryStatus(
  providerId: string,
  status: "delivered" | "bounced" | "failed" | "opened",
  details?: {
    bounceType?: "hard" | "soft"
    bounceReason?: string
    errorCode?: string
    errorMessage?: string
  }
): Promise<void> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  
  const updateData: Record<string, unknown> = {
    status,
  }
  
  switch (status) {
    case "delivered":
      updateData.delivered_at = now
      break
    case "bounced":
      updateData.bounced_at = now
      updateData.bounce_type = details?.bounceType
      updateData.bounce_reason = details?.bounceReason
      break
    case "failed":
      updateData.error_code = details?.errorCode
      updateData.error_message = details?.errorMessage
      break
    case "opened":
      updateData.opened_at = now
      break
  }
  
  await supabase
    .from("delivery_tracking")
    .update(updateData)
    .eq("provider_id", providerId)
  
  // Alert on bounce
  if (status === "bounced" && details?.bounceType === "hard") {
    const { data } = await supabase
      .from("delivery_tracking")
      .select("template_type, request_id")
      .eq("provider_id", providerId)
      .single()
    
    if (data?.template_type === "cert_ready" || data?.template_type === "script_sent") {
      Sentry.captureMessage("Critical email bounced", {
        level: "error",
        tags: { 
          alert_type: "email_bounce",
          template: data.template_type,
        },
        extra: {
          providerId,
          bounceType: details.bounceType,
          bounceReason: details.bounceReason,
          requestId: data.request_id,
        },
      })
    }
  }
}

/**
 * Get delivery metrics for a time period
 */
export async function getDeliveryMetrics(
  periodHours: number = 24,
  channel?: "email" | "sms"
): Promise<{
  totalSent: number
  delivered: number
  bounced: number
  failed: number
  deliveryRate: number
  bounceRate: number
  byTemplate: Record<string, { sent: number; delivered: number; bounced: number }>
}> {
  const supabase = await createClient()
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString()
  
  let query = supabase
    .from("delivery_tracking")
    .select("status, template_type")
    .gte("sent_at", since)
  
  if (channel) {
    query = query.eq("channel", channel)
  }
  
  const { data } = await query
  
  if (!data || data.length === 0) {
    return {
      totalSent: 0,
      delivered: 0,
      bounced: 0,
      failed: 0,
      deliveryRate: 1,
      bounceRate: 0,
      byTemplate: {},
    }
  }
  
  const delivered = data.filter(d => d.status === "delivered").length
  const bounced = data.filter(d => d.status === "bounced").length
  const failed = data.filter(d => d.status === "failed").length
  
  const byTemplate = data.reduce((acc, d) => {
    if (!acc[d.template_type]) {
      acc[d.template_type] = { sent: 0, delivered: 0, bounced: 0 }
    }
    acc[d.template_type].sent++
    if (d.status === "delivered") acc[d.template_type].delivered++
    if (d.status === "bounced") acc[d.template_type].bounced++
    return acc
  }, {} as Record<string, { sent: number; delivered: number; bounced: number }>)
  
  return {
    totalSent: data.length,
    delivered,
    bounced,
    failed,
    deliveryRate: data.length > 0 ? delivered / data.length : 1,
    bounceRate: data.length > 0 ? bounced / data.length : 0,
    byTemplate,
  }
}

/**
 * Check delivery health and alert
 */
export async function checkDeliveryHealthAndAlert(): Promise<void> {
  const metrics = await getDeliveryMetrics(1) // Last hour
  
  // Alert if bounce rate > 5%
  if (metrics.totalSent >= 10 && metrics.bounceRate > 0.05) {
    Sentry.captureMessage("Email bounce rate spike", {
      level: "warning",
      tags: { alert_type: "delivery_degradation" },
      extra: {
        bounceRate: Math.round(metrics.bounceRate * 100),
        totalSent: metrics.totalSent,
        bounced: metrics.bounced,
        period: "1_hour",
      },
    })
  }
  
  // Alert if delivery rate < 90%
  if (metrics.totalSent >= 10 && metrics.deliveryRate < 0.9) {
    Sentry.captureMessage("Email delivery rate low", {
      level: "warning",
      tags: { alert_type: "delivery_degradation" },
      extra: {
        deliveryRate: Math.round(metrics.deliveryRate * 100),
        totalSent: metrics.totalSent,
        delivered: metrics.delivered,
        period: "1_hour",
      },
    })
  }
}

// Helper functions
function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return "***@***"
  const maskedLocal = local.length > 2 
    ? local[0] + "***" + local[local.length - 1]
    : "***"
  return `${maskedLocal}@${domain}`
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 4) return "****"
  return "****" + digits.slice(-4)
}
