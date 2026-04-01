/**
 * Doctor Activity Monitoring
 * 
 * OBSERVABILITY_AUDIT P0: Doctor Activity Tracking + Alert
 * 
 * Tracks doctor review activity and alerts when no doctors are active.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface DoctorActivityMetrics {
  lastActivityAt: string | null
  lastActivityMinutes: number
  activeDoctorsLast30Min: number
  casesReviewedLast1Hr: number
  casesReviewedToday: number
  isBusinessHours: boolean
  hasRecentActivity: boolean
}

export interface DoctorPerformanceMetrics {
  doctorId: string
  doctorName: string
  period: "hourly" | "daily" | "weekly"
  casesReviewed: number
  casesApproved: number
  casesDeclined: number
  casesNeedsCall: number
  approvalRate: number
  avgReviewTimeMs: number
}

// Threshold for "recent activity" metric (used by admin dashboard, not alerts)
const INACTIVITY_WARNING_MINUTES = 30

/**
 * Get current doctor activity metrics
 */
export async function getDoctorActivity(): Promise<DoctorActivityMetrics> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  
  // Check if business hours (AU Eastern, 8am-10pm)
  const auHour = parseInt(
    now.toLocaleString("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", hour12: false })
  )
  const isBusinessHours = auHour >= 8 && auHour < 22
  
  // Get last doctor action from audit log
  const { data: lastActions } = await supabase
    .from("audit_logs")
    .select("created_at, actor_id")
    .in("action", ["intake_approved", "intake_declined", "intake_reviewed", "outcome_assigned"])
    .order("created_at", { ascending: false })
    .limit(1)
  
  const lastAction = lastActions?.[0] || null
  const lastActivityAt = lastAction?.created_at || null
  const lastActivityMinutes = lastActivityAt
    ? (now.getTime() - new Date(lastActivityAt).getTime()) / 60000
    : Infinity
  
  // Get active doctors in last 30 minutes
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  const { data: recentActions } = await supabase
    .from("audit_logs")
    .select("actor_id")
    .in("action", ["intake_approved", "intake_declined", "intake_reviewed"])
    .gte("created_at", thirtyMinAgo)
  
  const activeDoctors = new Set(recentActions?.map(a => a.actor_id) || [])
  
  // Get cases reviewed in last hour
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const { count: casesLast1Hr } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .in("action", ["intake_approved", "intake_declined"])
    .gte("created_at", oneHourAgo)
  
  // Get cases reviewed today
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const { count: casesToday } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .in("action", ["intake_approved", "intake_declined"])
    .gte("created_at", todayStart.toISOString())
  
  return {
    lastActivityAt,
    lastActivityMinutes: Math.round(lastActivityMinutes),
    activeDoctorsLast30Min: activeDoctors.size,
    casesReviewedLast1Hr: casesLast1Hr || 0,
    casesReviewedToday: casesToday || 0,
    isBusinessHours,
    hasRecentActivity: lastActivityMinutes < INACTIVITY_WARNING_MINUTES,
  }
}

/**
 * Check doctor activity and return metrics.
 *
 * NOTE: Doctor inactivity alerts (Sentry + Telegram) have been removed.
 * Med certs are auto-approved 24/7, so doctor inactivity is expected
 * outside business hours and is no longer an alertable condition.
 * Metrics are still collected for the admin dashboard.
 */
export async function checkDoctorActivityAndAlert(): Promise<DoctorActivityMetrics> {
  return getDoctorActivity()
}

/**
 * Get performance metrics for a specific doctor
 */
export async function getDoctorPerformance(
  doctorId: string,
  period: "hourly" | "daily" | "weekly" = "daily"
): Promise<DoctorPerformanceMetrics | null> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  
  let since: Date
  switch (period) {
    case "hourly":
      since = new Date(now.getTime() - 60 * 60 * 1000)
      break
    case "daily":
      since = new Date(now)
      since.setHours(0, 0, 0, 0)
      break
    case "weekly":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
  }
  
  // Get doctor info
  const { data: doctor } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", doctorId)
    .single()
  
  if (!doctor) return null
  
  // Get decisions
  const { data: decisions } = await supabase
    .from("audit_logs")
    .select("action, metadata, created_at")
    .eq("actor_id", doctorId)
    .in("action", ["intake_approved", "intake_declined", "needs_call_scheduled"])
    .gte("created_at", since.toISOString())
  
  if (!decisions) {
    return {
      doctorId,
      doctorName: doctor.full_name,
      period,
      casesReviewed: 0,
      casesApproved: 0,
      casesDeclined: 0,
      casesNeedsCall: 0,
      approvalRate: 0,
      avgReviewTimeMs: 0,
    }
  }
  
  const approved = decisions.filter(d => d.action === "intake_approved").length
  const declined = decisions.filter(d => d.action === "intake_declined").length
  const needsCall = decisions.filter(d => d.action === "needs_call_scheduled").length
  const total = approved + declined + needsCall
  
  // Get review times from request_latency
  const requestIds = decisions
    .map(d => (d.metadata as { intake_id?: string })?.intake_id)
    .filter(Boolean)
  
  let avgReviewTimeMs = 0
  if (requestIds.length > 0) {
    const { data: latencies } = await supabase
      .from("request_latency")
      .select("review_to_decision_ms")
      .in("intake_id", requestIds)
      .not("review_to_decision_ms", "is", null)
    
    if (latencies && latencies.length > 0) {
      avgReviewTimeMs = Math.round(
        latencies.reduce((sum, l) => sum + (l.review_to_decision_ms || 0), 0) / latencies.length
      )
    }
  }
  
  return {
    doctorId,
    doctorName: doctor.full_name,
    period,
    casesReviewed: total,
    casesApproved: approved,
    casesDeclined: declined,
    casesNeedsCall: needsCall,
    approvalRate: total > 0 ? approved / total : 0,
    avgReviewTimeMs,
  }
}

/**
 * Get all active doctors' performance for dashboard
 */
export async function getAllDoctorPerformance(
  period: "hourly" | "daily" | "weekly" = "daily"
): Promise<DoctorPerformanceMetrics[]> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  
  let since: Date
  switch (period) {
    case "hourly":
      since = new Date(now.getTime() - 60 * 60 * 1000)
      break
    case "daily":
      since = new Date(now)
      since.setHours(0, 0, 0, 0)
      break
    case "weekly":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
  }
  
  // Get all doctors who have made decisions in the period
  const { data: decisions } = await supabase
    .from("audit_logs")
    .select("actor_id")
    .in("action", ["intake_approved", "intake_declined"])
    .gte("created_at", since.toISOString())
  
  if (!decisions) return []
  
  const doctorIds = [...new Set(decisions.map(d => d.actor_id))]
  
  const metrics: DoctorPerformanceMetrics[] = []
  for (const doctorId of doctorIds) {
    const performance = await getDoctorPerformance(doctorId, period)
    if (performance) {
      metrics.push(performance)
    }
  }
  
  return metrics.sort((a, b) => b.casesReviewed - a.casesReviewed)
}
