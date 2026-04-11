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
import { createServiceRoleClient } from "@/lib/supabase/service-role"
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

    // 6. Batch Review Enforcement - alert if auto-approved certs go un-reviewed for 24h+
    // AHPRA compliance: doctors must review auto-approved certificates within a reasonable window
    let unreviewedAutoApproved = 0
    try {
      const supabase = createServiceRoleClient()
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("ai_approved", true)
        .eq("status", "approved")
        .lt("ai_approved_at", twentyFourHoursAgo)
        // batch_reviewed_at is null means doctor hasn't reviewed it yet
        .is("batch_reviewed_at", null)
      unreviewedAutoApproved = count ?? 0
    } catch {
      // Non-critical - don't fail health check
    }
    results.checks = {
      ...results.checks as object,
      batchReview: {
        unreviewedOver24h: unreviewedAutoApproved,
      },
    }

    // Determine overall health
    // Doctor inactivity is no longer a health signal - med certs are auto-approved 24/7,
    // so doctor activity is only relevant for prescriptions/consults during business hours.
    const isHealthy =
      queueHealth.isHealthy &&
      aiHealth.isHealthy &&
      cronHealth.healthy

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
