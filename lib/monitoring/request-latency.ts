/**
 * Request Latency Tracking
 * 
 * OBSERVABILITY_AUDIT P0: Payment-to-Decision Latency
 * 
 * Tracks time from payment → doctor review → decision for SLA monitoring.
 */

import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

export interface RequestLatencyData {
  requestId: string
  paymentAt: string | null
  queuedAt: string | null
  assignedAt: string | null
  reviewStartedAt: string | null
  decisionAt: string | null
  
  // Calculated latencies (milliseconds)
  paymentToQueueMs: number | null
  queueToReviewMs: number | null
  reviewToDecisionMs: number | null
  totalLatencyMs: number | null
}

/**
 * Record payment completion timestamp
 */
export async function recordPaymentCompleted(requestId: string): Promise<void> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  await supabase
    .from("request_latency")
    .upsert({
      request_id: requestId,
      payment_at: now,
      queued_at: now, // Payment = queued for us
    }, { onConflict: "request_id" })
}

/**
 * Record when doctor is assigned to request
 */
export async function recordDoctorAssigned(requestId: string, doctorId: string): Promise<void> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from("request_latency")
    .select("queued_at")
    .eq("request_id", requestId)
    .single()

  const queueToAssignMs = existing?.queued_at
    ? new Date(now).getTime() - new Date(existing.queued_at).getTime()
    : null

  await supabase
    .from("request_latency")
    .upsert({
      request_id: requestId,
      assigned_at: now,
      assigned_doctor_id: doctorId,
      queue_to_assign_ms: queueToAssignMs,
    }, { onConflict: "request_id" })
}

/**
 * Record when doctor starts reviewing (opens the case)
 */
export async function recordReviewStarted(requestId: string): Promise<void> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from("request_latency")
    .select("queued_at, assigned_at")
    .eq("request_id", requestId)
    .single()

  const queueToReviewMs = existing?.queued_at
    ? new Date(now).getTime() - new Date(existing.queued_at).getTime()
    : null

  await supabase
    .from("request_latency")
    .upsert({
      request_id: requestId,
      review_started_at: now,
      queue_to_review_ms: queueToReviewMs,
    }, { onConflict: "request_id" })
}

/**
 * Record when decision is made (approved/declined)
 */
export async function recordDecisionMade(
  requestId: string,
  decision: "approved" | "declined" | "needs_call"
): Promise<RequestLatencyData | null> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from("request_latency")
    .select("*")
    .eq("request_id", requestId)
    .single()

  if (!existing) {
    return null
  }

  const reviewToDecisionMs = existing.review_started_at
    ? new Date(now).getTime() - new Date(existing.review_started_at).getTime()
    : null

  const totalLatencyMs = existing.payment_at
    ? new Date(now).getTime() - new Date(existing.payment_at).getTime()
    : null

  await supabase
    .from("request_latency")
    .update({
      decision_at: now,
      decision_type: decision,
      review_to_decision_ms: reviewToDecisionMs,
      total_latency_ms: totalLatencyMs,
    })
    .eq("request_id", requestId)

  // Check for SLA breach
  if (totalLatencyMs && totalLatencyMs > 60 * 60 * 1000) {
    Sentry.captureMessage("SLA Warning: Request took > 60 minutes", {
      level: "warning",
      tags: { alert_type: "latency_warning" },
      extra: {
        requestId,
        totalLatencyMs,
        totalMinutes: Math.round(totalLatencyMs / 60000),
      },
    })
  }

  return {
    requestId,
    paymentAt: existing.payment_at,
    queuedAt: existing.queued_at,
    assignedAt: existing.assigned_at,
    reviewStartedAt: existing.review_started_at,
    decisionAt: now,
    paymentToQueueMs: existing.payment_to_queue_ms,
    queueToReviewMs: existing.queue_to_review_ms,
    reviewToDecisionMs,
    totalLatencyMs,
  }
}

/**
 * Get latency metrics for a time period
 */
export async function getLatencyMetrics(
  periodHours: number = 24
): Promise<{
  avgTotalLatencyMs: number
  p50TotalLatencyMs: number
  p95TotalLatencyMs: number
  avgReviewTimeMs: number
  requestsCompleted: number
  requestsBreachingSLA: number
}> {
  const supabase = await createClient()
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from("request_latency")
    .select("total_latency_ms, review_to_decision_ms")
    .gte("decision_at", since)
    .not("total_latency_ms", "is", null)
    .order("total_latency_ms", { ascending: true })

  if (!data || data.length === 0) {
    return {
      avgTotalLatencyMs: 0,
      p50TotalLatencyMs: 0,
      p95TotalLatencyMs: 0,
      avgReviewTimeMs: 0,
      requestsCompleted: 0,
      requestsBreachingSLA: 0,
    }
  }

  const latencies = data.map(d => d.total_latency_ms).filter(Boolean) as number[]
  const reviewTimes = data.map(d => d.review_to_decision_ms).filter(Boolean) as number[]

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const percentile = (arr: number[], p: number) => {
    const idx = Math.ceil(arr.length * p) - 1
    return arr[Math.max(0, idx)]
  }

  const SLA_THRESHOLD_MS = 60 * 60 * 1000 // 60 minutes

  return {
    avgTotalLatencyMs: Math.round(avg(latencies)),
    p50TotalLatencyMs: percentile(latencies, 0.5),
    p95TotalLatencyMs: percentile(latencies, 0.95),
    avgReviewTimeMs: reviewTimes.length > 0 ? Math.round(avg(reviewTimes)) : 0,
    requestsCompleted: data.length,
    requestsBreachingSLA: latencies.filter(l => l > SLA_THRESHOLD_MS).length,
  }
}
