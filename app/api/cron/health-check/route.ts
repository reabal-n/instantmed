/**
 * Health Check Cron Job
 * 
 * OBSERVABILITY_AUDIT: Periodic health monitoring
 * 
 * Runs every 5 minutes to check:
 * - Queue health (SLA breaches)
 * - Doctor activity
 * - Delivery health
 * 
 * Cron Schedule: every 5 minutes
 */

import { NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { checkQueueHealthAndAlert } from "@/lib/monitoring/queue-health"
import { checkDoctorActivityAndAlert } from "@/lib/monitoring/doctor-activity"
import { checkDeliveryHealthAndAlert } from "@/lib/monitoring/delivery-tracking"
import { getAIHealthMetrics } from "@/lib/monitoring/ai-health"
import { recordCronHeartbeat, checkCronHeartbeats } from "@/lib/monitoring/cron-heartbeat"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { sendTelegramAlert, escapeMarkdownValue } from "@/lib/notifications/telegram"
import * as Sentry from "@sentry/nextjs"

// Alert deduplication: suppress repeated alerts for the same condition within this window.
// Health-check runs every 5 min; 2-hour TTL means at most one alert per ~2 hours per type.
const ALERT_DEDUP_TTL_SECONDS = 2 * 60 * 60

/**
 * Send a Telegram alert only if we haven't sent the same alert type recently.
 * Uses Redis SET NX EX as a distributed lock. Fails open (sends) if Redis is unavailable.
 */
async function sendDedupedAlert(redis: Redis | null, key: string, message: string): Promise<void> {
  if (redis) {
    try {
      // Returns "OK" if key was set (first alert), null if key already existed (suppress)
      const set = await redis.set(key, "1", { nx: true, ex: ALERT_DEDUP_TTL_SECONDS })
      if (set === null) return // already alerted recently
    } catch {
      // Redis unavailable — fail open and send the alert
    }
  }
  await sendTelegramAlert(message)
}

const isRedisConfigured = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
const redis: Redis | null = isRedisConfigured ? Redis.fromEnv() : null

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  // Verify cron authentication (fail-closed)
  const authError = verifyCronRequest(request)
  if (authError) return authError
  
  // Record heartbeat for this cron
  await recordCronHeartbeat("health-check")

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {},
  }

  try {
    // 1. Queue Health Check
    const queueHealth = await checkQueueHealthAndAlert()
    results.checks = {
      ...results.checks as object,
      queue: {
        size: queueHealth.queueSize,
        oldestMinutes: queueHealth.oldestRequestAgeMinutes,
        slaBreached: queueHealth.slaBreached,
        healthy: queueHealth.isHealthy,
      },
    }
    
    // 2. Doctor Activity Check
    const doctorActivity = await checkDoctorActivityAndAlert()
    results.checks = {
      ...results.checks as object,
      doctors: {
        lastActivityMinutes: doctorActivity.lastActivityMinutes,
        activeLast30Min: doctorActivity.activeDoctorsLast30Min,
        casesLast1Hr: doctorActivity.casesReviewedLast1Hr,
        isBusinessHours: doctorActivity.isBusinessHours,
        hasRecentActivity: doctorActivity.hasRecentActivity,
      },
    }
    
    // 3. Delivery Health Check
    await checkDeliveryHealthAndAlert()
    results.checks = {
      ...results.checks as object,
      delivery: { checked: true },
    }
    
    // 4. AI Health (in-memory metrics)
    const aiHealth = getAIHealthMetrics()
    results.checks = {
      ...results.checks as object,
      ai: {
        requestCount: aiHealth.requestCount,
        failureRate: Math.round(aiHealth.failureRate * 100),
        p95LatencyMs: aiHealth.p95LatencyMs,
        healthy: aiHealth.isHealthy,
      },
    }
    
    // 5. Cron Heartbeat Check
    const cronHealth = await checkCronHeartbeats()
    results.checks = {
      ...results.checks as object,
      crons: {
        healthy: cronHealth.healthy,
        overdueCount: cronHealth.overdue.length,
        overdue: cronHealth.overdue.map((o) => `${o.jobName} (+${o.minutesOverdue}min)`),
      },
    }

    // Determine overall health
    const isHealthy =
      queueHealth.isHealthy &&
      (doctorActivity.hasRecentActivity || !doctorActivity.isBusinessHours) &&
      aiHealth.isHealthy &&
      cronHealth.healthy
    
    results.healthy = isHealthy
    results.status = isHealthy ? "ok" : "degraded"

    // Push critical alerts to Telegram for real-time doctor/ops visibility.
    // Each alert type is deduplicated via Redis — at most one per 25 minutes.
    const esc = escapeMarkdownValue
    const alertPromises: Promise<void>[] = []

    if (queueHealth.slaBreached) {
      const msg = `*InstantMed Health Alert*\n\n🚨 SLA BREACH: ${queueHealth.queueSize} items in queue, oldest ${queueHealth.oldestRequestAgeMinutes}min`
      alertPromises.push(sendDedupedAlert(redis, "telegram:alert:sla_breach", msg).catch(() => {}))
    }
    if (doctorActivity.isBusinessHours && !doctorActivity.hasRecentActivity) {
      const inactiveMin = Number.isFinite(doctorActivity.lastActivityMinutes)
        ? `${doctorActivity.lastActivityMinutes}min`
        : "unknown \\(no activity recorded\\)"
      const msg = `*InstantMed Health Alert*\n\n⚠️ No doctor activity for ${inactiveMin} during business hours`
      alertPromises.push(sendDedupedAlert(redis, "telegram:alert:doctor_inactive", msg).catch(() => {}))
    }
    if (!cronHealth.healthy && cronHealth.overdue.length > 0) {
      const names = cronHealth.overdue.map(o => esc(o.jobName)).join(", ")
      const msg = `*InstantMed Health Alert*\n\n⚠️ ${cronHealth.overdue.length} cron jobs overdue: ${names}`
      alertPromises.push(sendDedupedAlert(redis, "telegram:alert:cron_overdue", msg).catch(() => {}))
    }

    await Promise.all(alertPromises)

    return NextResponse.json(results)
    
  } catch (error) {
    Sentry.captureException(error, {
      tags: { context: "health_check_cron" },
    })
    
    return NextResponse.json(
      { 
        error: "Health check failed",
        timestamp: new Date().toISOString(),
        status: "error",
      },
      { status: 500 }
    )
  }
}
