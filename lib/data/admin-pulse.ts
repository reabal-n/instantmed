import "server-only"

import {
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_FINANCE_HREF,
  ADMIN_INTAKE_LEDGER_HREF,
  ADMIN_OPS_HREF,
  buildAdminDashboardHref,
} from "@/lib/dashboard/routes"
import {
  getDoctorDashboardStats,
  getIntakeMonitoringStats,
} from "@/lib/data/intakes"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const DAY_MS = 24 * 60 * 60 * 1000

export type AdminPulseMood = "calm" | "steady" | "busy" | "attention"
export type AdminPulseTone = "neutral" | "success" | "info" | "warning" | "danger"

export interface AdminPulseAction {
  label: string
  description: string
  href: string
  tone: AdminPulseTone
}

export interface AdminPulseDecisionInput {
  queueSize: number
  scriptsPending: number
  pendingInfo: number
  oldestInQueueMinutes: number | null
  paidToday: number
  failedEmails24h: number
  openSupportTickets: number
  activeDisputes: number
}

export interface AdminPulseData {
  generatedAt: string
  mood: AdminPulseMood
  action: AdminPulseAction
  queue: {
    size: number
    scriptsPending: number
    pendingInfo: number
    oldestInQueueMinutes: number | null
    avgReviewTimeMinutes: number | null
  }
  today: {
    paidOrders: number
    revenueCents: number
    approved: number
    declined: number
  }
  week: {
    paidOrders: number
    revenueCents: number
    serviceMix: Array<{
      category: string
      count: number
    }>
  }
  risks: {
    failedEmails24h: number
    openSupportTickets: number
    activeDisputes: number
  }
}

interface PaidIntakeRow {
  amount_cents: number | string | null
  category: string | null
}

interface SupabaseRows<T> {
  data: T[] | null
  error?: unknown
}

interface SupabaseCount {
  count: number | null
  error?: unknown
}

const dashboardStatsFallback = {
  total: 0,
  in_queue: 0,
  approved: 0,
  declined: 0,
  pending_info: 0,
  scripts_pending: 0,
}

const monitoringStatsFallback = {
  todaySubmissions: 0,
  queueSize: 0,
  paidCount: 0,
  pendingCount: 0,
  approvedToday: 0,
  declinedToday: 0,
  avgReviewTimeMinutes: null,
  oldestInQueueMinutes: null,
}

function getSydneyStartOfDay(now = new Date()): Date {
  const sydneyDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Australia/Sydney" }),
  )
  sydneyDate.setHours(0, 0, 0, 0)

  const utcDate = new Date(sydneyDate.toLocaleString("en-US", { timeZone: "UTC" }))
  const offsetMs = sydneyDate.getTime() - utcDate.getTime()
  return new Date(sydneyDate.getTime() - offsetMs)
}

function rowsFrom<T>(result: PromiseSettledResult<SupabaseRows<T>>): T[] {
  if (result.status !== "fulfilled" || result.value.error || !result.value.data) {
    return []
  }

  return result.value.data
}

function countFrom(result: PromiseSettledResult<SupabaseCount>): number {
  if (result.status !== "fulfilled" || result.value.error) return 0
  return result.value.count ?? 0
}

function sumRevenue(rows: PaidIntakeRow[]): number {
  return rows.reduce((total, row) => total + (Number(row.amount_cents) || 0), 0)
}

function buildServiceMix(rows: PaidIntakeRow[]): AdminPulseData["week"]["serviceMix"] {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const category = row.category || "unknown"
    counts.set(category, (counts.get(category) || 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, count]) => ({ category, count }))
}

export function resolveAdminPulseMood(input: AdminPulseDecisionInput): AdminPulseMood {
  if (
    input.activeDisputes > 0 ||
    input.failedEmails24h > 2 ||
    (input.oldestInQueueMinutes ?? 0) >= 240
  ) {
    return "attention"
  }

  if (
    input.scriptsPending > 0 ||
    input.pendingInfo > 2 ||
    input.queueSize >= 8 ||
    (input.oldestInQueueMinutes ?? 0) >= 120
  ) {
    return "busy"
  }

  if (input.queueSize > 0 || input.paidToday > 0 || input.openSupportTickets > 0) {
    return "steady"
  }

  return "calm"
}

export function resolveAdminPulseAction(input: AdminPulseDecisionInput): AdminPulseAction {
  if (input.activeDisputes > 0) {
    return {
      label: "Check the payment dispute",
      description: "Handle evidence before it becomes expensive admin cleanup.",
      href: ADMIN_FINANCE_HREF,
      tone: "danger",
    }
  }

  if (input.failedEmails24h > 2) {
    return {
      label: "Fix failed emails",
      description: "Patients should not need to chase documents or script updates.",
      href: ADMIN_EMAIL_HUB_HREF,
      tone: "warning",
    }
  }

  if (input.scriptsPending > 0) {
    return {
      label: "Open scripts queue",
      description: "Prescribing work is waiting in the same operator workflow.",
      href: buildAdminDashboardHref({ status: "scripts", anchor: "doctor-queue" }),
      tone: "warning",
    }
  }

  if ((input.oldestInQueueMinutes ?? 0) >= 90 || input.queueSize > 0) {
    return {
      label: "Open oldest clinical request",
      description: "The queue has work waiting for a clinical decision.",
      href: buildAdminDashboardHref({ status: "review", anchor: "doctor-queue" }),
      tone: "info",
    }
  }

  if (input.pendingInfo > 0) {
    return {
      label: "Check patient follow-ups",
      description: "A small pass stops incomplete requests from going stale.",
      href: ADMIN_INTAKE_LEDGER_HREF,
      tone: "info",
    }
  }

  if (input.failedEmails24h > 0) {
    return {
      label: "Glance at email delivery",
      description: "One or two misses are worth clearing before the day gets busier.",
      href: ADMIN_EMAIL_HUB_HREF,
      tone: "info",
    }
  }

  if (input.openSupportTickets > 0) {
    return {
      label: "Skim open support",
      description: "Nothing clinical is blocking, but someone may be waiting.",
      href: ADMIN_OPS_HREF,
      tone: "neutral",
    }
  }

  return {
    label: "Open the intake ledger",
    description: "All quiet. A quick skim is enough, then get back to growth.",
    href: ADMIN_INTAKE_LEDGER_HREF,
    tone: "success",
  }
}

export function getAdminPulseFallback(now = new Date()): AdminPulseData {
  const decisionInput: AdminPulseDecisionInput = {
    queueSize: 0,
    scriptsPending: 0,
    pendingInfo: 0,
    oldestInQueueMinutes: null,
    paidToday: 0,
    failedEmails24h: 0,
    openSupportTickets: 0,
    activeDisputes: 0,
  }

  return {
    generatedAt: now.toISOString(),
    mood: resolveAdminPulseMood(decisionInput),
    action: resolveAdminPulseAction(decisionInput),
    queue: {
      size: 0,
      scriptsPending: 0,
      pendingInfo: 0,
      oldestInQueueMinutes: null,
      avgReviewTimeMinutes: null,
    },
    today: {
      paidOrders: 0,
      revenueCents: 0,
      approved: 0,
      declined: 0,
    },
    week: {
      paidOrders: 0,
      revenueCents: 0,
      serviceMix: [],
    },
    risks: {
      failedEmails24h: 0,
      openSupportTickets: 0,
      activeDisputes: 0,
    },
  }
}

export async function getAdminPulseData(now = new Date()): Promise<AdminPulseData> {
  const supabase = createServiceRoleClient()
  const todayStart = getSydneyStartOfDay(now)
  const dayAgo = new Date(now.getTime() - DAY_MS)
  const weekAgo = new Date(todayStart.getTime() - 7 * DAY_MS)

  const [
    dashboardStatsResult,
    monitoringStatsResult,
    todayPaidResult,
    weekPaidResult,
    failedEmailResult,
    openSupportResult,
    activeDisputesResult,
  ] = await Promise.allSettled([
    getDoctorDashboardStats(),
    getIntakeMonitoringStats(),
    filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("amount_cents, category")
        .not("paid_at", "is", null)
        .gte("paid_at", todayStart.toISOString()),
    ),
    filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("amount_cents, category")
        .not("paid_at", "is", null)
        .gte("paid_at", weekAgo.toISOString()),
    ),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", dayAgo.toISOString()),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "pending"])
      .gte("created_at", weekAgo.toISOString()),
    supabase
      .from("stripe_disputes")
      .select("id", { count: "exact", head: true })
      .in("status", ["needs_response", "warning_needs_response", "under_review"]),
  ])

  const dashboardStats =
    dashboardStatsResult.status === "fulfilled"
      ? dashboardStatsResult.value
      : dashboardStatsFallback
  const monitoringStats =
    monitoringStatsResult.status === "fulfilled"
      ? monitoringStatsResult.value
      : monitoringStatsFallback
  const todayPaidRows = rowsFrom<PaidIntakeRow>(todayPaidResult)
  const weekPaidRows = rowsFrom<PaidIntakeRow>(weekPaidResult)

  const decisionInput: AdminPulseDecisionInput = {
    queueSize: monitoringStats.queueSize,
    scriptsPending: dashboardStats.scripts_pending,
    pendingInfo: dashboardStats.pending_info,
    oldestInQueueMinutes: monitoringStats.oldestInQueueMinutes,
    paidToday: todayPaidRows.length,
    failedEmails24h: countFrom(failedEmailResult),
    openSupportTickets: countFrom(openSupportResult),
    activeDisputes: countFrom(activeDisputesResult),
  }

  return {
    generatedAt: now.toISOString(),
    mood: resolveAdminPulseMood(decisionInput),
    action: resolveAdminPulseAction(decisionInput),
    queue: {
      size: monitoringStats.queueSize,
      scriptsPending: dashboardStats.scripts_pending,
      pendingInfo: dashboardStats.pending_info,
      oldestInQueueMinutes: monitoringStats.oldestInQueueMinutes,
      avgReviewTimeMinutes: monitoringStats.avgReviewTimeMinutes,
    },
    today: {
      paidOrders: todayPaidRows.length,
      revenueCents: sumRevenue(todayPaidRows),
      approved: monitoringStats.approvedToday,
      declined: monitoringStats.declinedToday,
    },
    week: {
      paidOrders: weekPaidRows.length,
      revenueCents: sumRevenue(weekPaidRows),
      serviceMix: buildServiceMix(weekPaidRows),
    },
    risks: {
      failedEmails24h: decisionInput.failedEmails24h,
      openSupportTickets: decisionInput.openSupportTickets,
      activeDisputes: decisionInput.activeDisputes,
    },
  }
}
