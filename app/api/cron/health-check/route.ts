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
import { checkQueueHealthAndAlert } from "@/lib/monitoring/queue-health"
import { checkDoctorActivityAndAlert } from "@/lib/monitoring/doctor-activity"
import { checkDeliveryHealthAndAlert } from "@/lib/monitoring/delivery-tracking"
import { getAIHealthMetrics } from "@/lib/monitoring/ai-health"
import { recordCronHeartbeat, checkCronHeartbeats } from "@/lib/monitoring/cron-heartbeat"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { sendTelegramAlert } from "@/lib/notifications/telegram"
import * as Sentry from "@sentry/nextjs"

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

    // Push critical alerts to Telegram for real-time doctor/ops visibility
    const alerts: string[] = []
    if (queueHealth.slaBreached) {
      alerts.push(`🚨 SLA BREACH: ${queueHealth.queueSize} items in queue, oldest ${queueHealth.oldestRequestAgeMinutes}min`)
    }
    if (doctorActivity.isBusinessHours && !doctorActivity.hasRecentActivity) {
      alerts.push(`⚠️ No doctor activity for ${doctorActivity.lastActivityMinutes}min during business hours`)
    }
    if (!cronHealth.healthy && cronHealth.overdue.length > 0) {
      alerts.push(`⚠️ ${cronHealth.overdue.length} cron jobs overdue: ${cronHealth.overdue.map(o => o.jobName).join(", ")}`)
    }
    if (alerts.length > 0) {
      const msg = `*InstantMed Health Alert*\n\n${alerts.join("\n\n")}`.replace(/[._>#+\-=|{!}()]/g, "\\$&")
      await sendTelegramAlert(msg).catch(() => {})
    }

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
