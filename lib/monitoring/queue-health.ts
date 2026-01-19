/**
 * Queue Health Monitoring
 * 
 * OBSERVABILITY_AUDIT P0: Queue Depth + SLA Breach Alert
 * 
 * Monitors pending request queue and alerts on SLA breaches.
 */

import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

export interface QueueHealthMetrics {
  queueSize: number
  oldestRequestAgeMinutes: number
  oldestRequestId: string | null
  avgWaitTimeMinutes: number
  requestsWaitingOver30Min: number
  requestsWaitingOver60Min: number
  isHealthy: boolean
  slaBreached: boolean
}

// Thresholds
const QUEUE_WARNING_SIZE = 20
const QUEUE_CRITICAL_SIZE = 50
const SLA_WARNING_MINUTES = 30
const SLA_BREACH_MINUTES = 60

/**
 * Get current queue health metrics
 */
export async function getQueueHealth(): Promise<QueueHealthMetrics> {
  const supabase = await createClient()
  
  // Get all pending requests
  const { data: pendingRequests } = await supabase
    .from("intakes")
    .select("id, created_at, is_priority")
    .in("status", ["pending_review", "pending", "submitted"])
    .order("created_at", { ascending: true })
  
  if (!pendingRequests || pendingRequests.length === 0) {
    return {
      queueSize: 0,
      oldestRequestAgeMinutes: 0,
      oldestRequestId: null,
      avgWaitTimeMinutes: 0,
      requestsWaitingOver30Min: 0,
      requestsWaitingOver60Min: 0,
      isHealthy: true,
      slaBreached: false,
    }
  }
  
  const now = Date.now()
  const waitTimes = pendingRequests.map(r => ({
    id: r.id,
    waitMinutes: (now - new Date(r.created_at).getTime()) / 60000,
    isPriority: r.is_priority,
  }))
  
  const oldestRequest = waitTimes[0]
  const avgWaitTime = waitTimes.reduce((sum, r) => sum + r.waitMinutes, 0) / waitTimes.length
  const over30Min = waitTimes.filter(r => r.waitMinutes > SLA_WARNING_MINUTES).length
  const over60Min = waitTimes.filter(r => r.waitMinutes > SLA_BREACH_MINUTES).length
  
  const slaBreached = over60Min > 0
  const isHealthy = pendingRequests.length < QUEUE_WARNING_SIZE && !slaBreached
  
  return {
    queueSize: pendingRequests.length,
    oldestRequestAgeMinutes: Math.round(oldestRequest.waitMinutes),
    oldestRequestId: oldestRequest.id,
    avgWaitTimeMinutes: Math.round(avgWaitTime),
    requestsWaitingOver30Min: over30Min,
    requestsWaitingOver60Min: over60Min,
    isHealthy,
    slaBreached,
  }
}

/**
 * Check queue health and send alerts if needed
 */
export async function checkQueueHealthAndAlert(): Promise<QueueHealthMetrics> {
  const metrics = await getQueueHealth()
  
  // SLA Breach alert (critical)
  if (metrics.slaBreached) {
    Sentry.captureMessage("SLA BREACH: Requests waiting > 60 minutes", {
      level: "error",
      tags: { 
        alert_type: "sla_breach",
        severity: "critical",
      },
      extra: {
        queueSize: metrics.queueSize,
        requestsBreaching: metrics.requestsWaitingOver60Min,
        oldestRequestMinutes: metrics.oldestRequestAgeMinutes,
        oldestRequestId: metrics.oldestRequestId,
      },
    })
  }
  
  // Queue depth warning
  if (metrics.queueSize >= QUEUE_CRITICAL_SIZE) {
    Sentry.captureMessage("Critical: Queue size exceeds threshold", {
      level: "error",
      tags: { 
        alert_type: "queue_critical",
        severity: "critical",
      },
      extra: {
        queueSize: metrics.queueSize,
        threshold: QUEUE_CRITICAL_SIZE,
        avgWaitMinutes: metrics.avgWaitTimeMinutes,
      },
    })
  } else if (metrics.queueSize >= QUEUE_WARNING_SIZE) {
    Sentry.captureMessage("Warning: Queue size growing", {
      level: "warning",
      tags: { 
        alert_type: "queue_warning",
        severity: "warning",
      },
      extra: {
        queueSize: metrics.queueSize,
        threshold: QUEUE_WARNING_SIZE,
        avgWaitMinutes: metrics.avgWaitTimeMinutes,
      },
    })
  }
  
  // Requests approaching SLA
  if (metrics.requestsWaitingOver30Min > 0 && !metrics.slaBreached) {
    Sentry.captureMessage("Warning: Requests approaching SLA threshold", {
      level: "warning",
      tags: { alert_type: "sla_warning" },
      extra: {
        requestsOver30Min: metrics.requestsWaitingOver30Min,
        oldestRequestMinutes: metrics.oldestRequestAgeMinutes,
      },
    })
  }
  
  return metrics
}

/**
 * Get queue breakdown by service type
 */
export async function getQueueByServiceType(): Promise<Record<string, number>> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from("intakes")
    .select("service_type")
    .in("status", ["pending_review", "pending", "submitted"])
  
  if (!data) return {}
  
  return data.reduce((acc, r) => {
    const type = r.service_type || "unknown"
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Get queue stats for dashboard
 */
export async function getQueueDashboardStats(): Promise<{
  current: QueueHealthMetrics
  byServiceType: Record<string, number>
  trend: "growing" | "stable" | "shrinking"
}> {
  const current = await getQueueHealth()
  const byServiceType = await getQueueByServiceType()
  
  // For trend, we'd need historical data - simplified for now
  let trend: "growing" | "stable" | "shrinking" = "stable"
  if (current.queueSize > QUEUE_WARNING_SIZE) {
    trend = "growing"
  } else if (current.queueSize === 0) {
    trend = "shrinking"
  }
  
  return {
    current,
    byServiceType,
    trend,
  }
}
