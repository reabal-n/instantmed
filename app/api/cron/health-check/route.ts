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

import { NextResponse } from "next/server"
import { checkQueueHealthAndAlert } from "@/lib/monitoring/queue-health"
import { checkDoctorActivityAndAlert } from "@/lib/monitoring/doctor-activity"
import { checkDeliveryHealthAndAlert } from "@/lib/monitoring/delivery-tracking"
import { getAIHealthMetrics } from "@/lib/monitoring/ai-health"
import * as Sentry from "@sentry/nextjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
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
    
    // Determine overall health
    const isHealthy = 
      queueHealth.isHealthy && 
      (doctorActivity.hasRecentActivity || !doctorActivity.isBusinessHours) &&
      aiHealth.isHealthy
    
    results.healthy = isHealthy
    results.status = isHealthy ? "ok" : "degraded"
    
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
