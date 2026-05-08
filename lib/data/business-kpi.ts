import "server-only"

import {
  type AcquisitionHealthResult,
  getAcquisitionHealth,
} from "@/lib/analytics/acquisition-health"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

type AttributionSourceRow = {
  gbraid?: string | null
  gclid?: string | null
  landing_page: string | null
  referrer: string | null
  utm_campaign?: string | null
  utm_medium?: string | null
  utm_source: string | null
  wbraid?: string | null
}

const AI_REFERRER_PATTERNS: Array<[string, string]> = [
  ["chatgpt", "ai:chatgpt"],
  ["perplexity", "ai:perplexity"],
  ["claude", "ai:claude"],
  ["gemini", "ai:gemini"],
  ["copilot", "ai:copilot"],
]

export function deriveAttributionSource(row: AttributionSourceRow): string {
  const utmSource = row.utm_source?.trim()
  if (utmSource) return utmSource

  const referrer = row.referrer?.trim()
  if (referrer) {
    const lowerReferrer = referrer.toLowerCase()
    const aiSource = AI_REFERRER_PATTERNS.find(([pattern]) =>
      lowerReferrer.includes(pattern)
    )
    if (aiSource) return aiSource[1]

    try {
      return new URL(referrer).hostname.replace(/^www\./, "")
    } catch {
      return referrer
    }
  }

  return row.landing_page ? "direct" : "unknown"
}

// ============================================================================
// TYPES
// ============================================================================

export interface BusinessKPIData {
  scorecard: {
    generatedAt: string
    windowDays: number
    scaleReadiness: {
      score: number
      gates: {
        aov: { passed: boolean; target: number; value: number }
        chargebackRate: { passed: boolean; target: number; value: number }
        grossRevenue: { passed: boolean; target: number; value: number }
        refundRate: { passed: boolean; target: number; value: number }
        unknownAttributionRate: { passed: boolean; target: number; value: number }
      }
    }
    today: {
      aov: number
      grossRevenue: number
      paidOrders: number
    }
    paidOrdersByService: Array<{
      aov: number
      category: string
      grossRevenue: number
      paidOrders: number
      paidOrdersToday: number
      subtype: string | null
    }>
    attribution: {
      clickIdOrders: number
      topLandingPages: Array<{ landingPage: string; paidOrders: number }>
      topSources: Array<{ paidOrders: number; source: string }>
      unknownPaidOrders: number
      unknownRate: number
      utmSourcedOrders: number
    }
    fulfillment: {
      eligiblePaidOrders: number
      fulfilledOrders: number
      fulfillmentRate: number
      missingOrders: number
    }
    repeatCustomers: {
      currentCustomers: number
      repeatCustomerRate: number
      repeatCustomers: number
    }
    reviewTime: {
      medianMinutes: number | null
      p95Minutes: number | null
      reviewedOrders: number
    }
  }
  revenue: {
    today: number
    thisWeek: number
    thisMonth: number
    weeklyTrend: number
    daily: Array<{ date: string; revenue: number }>
  }
  certs: {
    today: number
    thisWeek: number
  }
  sla: {
    avgMinutes: number
    breaches: number
    queueSize: number
  }
  doctors: {
    active: number
    utilizationRate: number
    reviewsThisWeek: number
  }
  email: {
    deliveryRate: number
    sentThisWeek: number
    failedThisWeek: number
  }
  funnel: {
    pageViews: number
    started: number
    paid: number
    approved: number
    conversionRate: number
  }
  unitEconomics: {
    aov: number
    paidOrdersMonth: number
    repeatPaidOrders: number
    repeatOrderRate: number
  }
  risk: {
    chargebacksMonth: number
    chargebackRate: number
    activeDisputes: number
    supportTicketsMonth: number
    supportTicketsPer100Orders: number
    openSupportTickets: number
    highPrioritySupportTickets: number
  }
  referrals: Array<{ source: string; count: number }>
  serviceRepeatUsage: Array<{
    category: string
    paidOrders: number
    repeatPaidOrders: number
    repeatRate: number
  }>
  refunds: {
    totalMonth: number
    rate: number
  }
  acquisition: AcquisitionHealthResult
  launchReadiness: {
    score: number
    checks: Record<string, boolean>
  }
}

function hasClickId(row: AttributionSourceRow): boolean {
  return Boolean(row.gclid || row.gbraid || row.wbraid)
}

function isUnknownAttribution(row: AttributionSourceRow): boolean {
  return !row.utm_source?.trim() && !row.referrer?.trim() && !row.landing_page?.trim() && !hasClickId(row)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1
  return Math.round(sorted[Math.max(0, Math.min(index, sorted.length - 1))])
}

function normalizeLandingPage(value: string | null): string {
  const raw = value?.trim()
  if (!raw) return "unknown"

  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, "https://instantmed.com.au")
    return `${url.pathname}${url.search ? url.search : ""}`
  } catch {
    return raw
  }
}

function acquisitionHealthFallback(windowDays: number): AcquisitionHealthResult {
  return {
    windowDays,
    paidIntakes: 0,
    paidRevenue: 0,
    paidWithGoogleClickId: 0,
    paidWithUtmSource: 0,
    paidWithReferrerOrLandingPage: 0,
    paidLikelyGoogleWithoutClickId: 0,
    unknownPaidIntakes: 0,
    googleAds: {
      clicks: 0,
      impressions: 0,
      cost: 0,
      error: "acquisition_health_unavailable",
    },
    healthy: false,
    alerts: ["acquisition_health_unavailable"],
  }
}

// ============================================================================
// QUERY
// ============================================================================

export async function getBusinessKPIData(): Promise<BusinessKPIData> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const prevWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  const kpiQueries = [
    // [0] Revenue this month (all paid intakes)
    supabase
      .from("intakes")
      .select("id, amount_cents, paid_at, category, subtype, patient_id, status, script_sent_at, prescription_sent_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString()),

    // [1] Revenue by day (last 30 days) for trend chart
    supabase
      .from("intakes")
      .select("amount_cents, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString())
      .order("paid_at", { ascending: true }),

    // [2] Med certs issued today
    supabase
      .from("issued_certificates")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .eq("status", "valid"),

    // [3] Med certs issued this week
    supabase
      .from("issued_certificates")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString())
      .eq("status", "valid"),

    // [4] SLA: approved intakes with paid_at and approved_at (last 30 days)
    supabase
      .from("intakes")
      .select("paid_at, approved_at, reviewed_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString()),

    // [5] Active doctors count
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("role", ["doctor", "admin"])
      .eq("is_active", true),

    // [6] Doctor reviews this week (intakes reviewed)
    supabase
      .from("intakes")
      .select("reviewed_by")
      .not("reviewed_by", "is", null)
      .gte("updated_at", weekAgo.toISOString())
      .in("status", ["approved", "declined"]),

    // [7] Email delivery stats (last 7 days)
    supabase
      .from("email_outbox")
      .select("status")
      .gte("created_at", weekAgo.toISOString()),

    // [8] Conversion funnel: started intakes (last 30 days)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString()),

    // [9] Conversion funnel: paid intakes (last 30 days)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .not("paid_at", "is", null),

    // [10] Conversion funnel: approved intakes (last 30 days)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .eq("status", "approved"),

    // [11] Top paid referral sources (UTM first, then persisted referrer/direct)
    supabase
      .from("intakes")
      .select("utm_source, utm_medium, utm_campaign, referrer, landing_page, gclid, gbraid, wbraid")
      .gte("created_at", monthAgo.toISOString())
      .not("paid_at", "is", null),

    // [12] Page views / sessions from audit_logs
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .in("action", ["page_view", "session_start"]),

    // [13] Revenue previous week (for weekly trend)
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", prevWeekStart.toISOString())
      .lt("paid_at", weekAgo.toISOString()),

    // [14] Revenue this week
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", weekAgo.toISOString()),

    // [15] SLA breaches: paid intakes not yet approved past deadline
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review", "pending_info"])
      .not("sla_deadline", "is", null)
      .lt("sla_deadline", now.toISOString()),

    // [16] Total active intakes (in queue)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review", "pending_info"]),

    // [17] Refunds this month
    supabase
      .from("intakes")
      .select("amount_cents, refund_amount_cents")
      .not("refunded_at", "is", null)
      .gte("refunded_at", monthAgo.toISOString()),

    // [18] Today's revenue
    supabase
      .from("intakes")
      .select("amount_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", today.toISOString()),

    // [19] Support load this month
    supabase
      .from("support_tickets")
      .select("id, status, priority")
      .gte("created_at", monthAgo.toISOString()),

    // [20] Stripe disputes this month
    supabase
      .from("stripe_disputes")
      .select("id, status")
      .gte("created_at", monthAgo.toISOString()),
  ]

  // Fetch all KPI data in parallel
  const [results, acquisition] = await Promise.all([
    Promise.allSettled(kpiQueries),
    getAcquisitionHealth(7).catch(() => acquisitionHealthFallback(7)),
  ])

  // Helper to extract data safely
  const get = <T,>(index: number, fallback: T): T => {
    const r = results[index]
    if (r.status === "fulfilled" && "data" in r.value && r.value.data !== null) {
      return r.value.data as T
    }
    return fallback
  }
  const getCount = (index: number): number => {
    const r = results[index]
    if (r.status === "fulfilled" && "count" in r.value) return r.value.count || 0
    return 0
  }

  // === REVENUE METRICS ===
  const revenueData = get<Array<{
    amount_cents: number
    category: string | null
    id: string
    paid_at: string
    patient_id?: string | null
    prescription_sent_at?: string | null
    script_sent_at?: string | null
    status?: string | null
    subtype?: string | null
  }>>(0, [])
  const totalRevenueMonth = revenueData.reduce((s, i) => s + (i.amount_cents || 0), 0) / 100
  const paidOrdersMonth = revenueData.length

  const todayRevenueData = get<Array<{ amount_cents: number }>>(18, [])
  const todayRevenue = todayRevenueData.reduce((s, i) => s + (i.amount_cents || 0), 0) / 100

  const thisWeekRevenueData = get<Array<{ amount_cents: number }>>(14, [])
  const thisWeekRevenue = thisWeekRevenueData.reduce((s, i) => s + (i.amount_cents || 0), 0) / 100

  const prevWeekRevenueData = get<Array<{ amount_cents: number }>>(13, [])
  const prevWeekRevenue = prevWeekRevenueData.reduce((s, i) => s + (i.amount_cents || 0), 0) / 100

  const weeklyRevenueTrend = prevWeekRevenue > 0
    ? Math.round(((thisWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100)
    : thisWeekRevenue > 0 ? 100 : 0

  // Revenue by day for chart
  const revenueByDayRaw = get<Array<{ amount_cents: number; paid_at: string }>>(1, [])
  const dailyRevenueMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    dailyRevenueMap[d.toISOString().split("T")[0]] = 0
  }
  for (const item of revenueByDayRaw) {
    if (item.paid_at) {
      const key = item.paid_at.split("T")[0]
      if (dailyRevenueMap[key] !== undefined) {
        dailyRevenueMap[key] += (item.amount_cents || 0) / 100
      }
    }
  }
  const dailyRevenue = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({ date, revenue }))

  // === MED CERTS ===
  const certsToday = getCount(2)
  const certsThisWeek = getCount(3)

  // === SLA METRICS ===
  const slaData = get<Array<{ approved_at: string | null; paid_at: string; reviewed_at: string | null }>>(4, [])
  let avgSlaMinutes = 0
  const reviewDurations = slaData
    .map((item) => {
      const paid = new Date(item.paid_at).getTime()
      const reviewedAt = item.reviewed_at || item.approved_at
      if (!reviewedAt || Number.isNaN(paid)) return null
      const reviewed = new Date(reviewedAt).getTime()
      if (Number.isNaN(reviewed) || reviewed < paid) return null
      return (reviewed - paid) / 60000
    })
    .filter((duration): duration is number => duration !== null)

  if (reviewDurations.length > 0) {
    const totalMinutes = reviewDurations.reduce((sum, item) => sum + item, 0)
    avgSlaMinutes = Math.round(totalMinutes / reviewDurations.length)
  }
  const medianReviewMinutes = percentile(reviewDurations, 50)
  const p95ReviewMinutes = percentile(reviewDurations, 95)
  const slaBreaches = getCount(15)
  const activeQueueSize = getCount(16)

  // === DOCTOR UTILIZATION ===
  const activeDoctors = getCount(5)
  const doctorReviews = get<Array<{ reviewed_by: string }>>(6, [])
  const uniqueReviewers = new Set(doctorReviews.map(r => r.reviewed_by)).size
  const doctorUtilizationRate = activeDoctors > 0
    ? Math.round((uniqueReviewers / activeDoctors) * 100)
    : 0

  // === EMAIL DELIVERY ===
  const emailData = get<Array<{ status: string }>>(7, [])
  const emailSent = emailData.filter(e => e.status === "sent" || e.status === "skipped_e2e").length
  const emailFailed = emailData.filter(e => e.status === "failed").length
  const emailTotal = emailSent + emailFailed
  const emailDeliveryRate = emailTotal > 0 ? Math.round((emailSent / emailTotal) * 1000) / 10 : 100

  // === CONVERSION FUNNEL ===
  const pageViews = getCount(12)
  const intakesStarted = getCount(8)
  const intakesPaid = getCount(9)
  const intakesApproved = getCount(10)
  const conversionRate = intakesStarted > 0
    ? Math.round((intakesPaid / intakesStarted) * 1000) / 10
    : 0

  // === REFERRAL SOURCES ===
  const utmData = get<AttributionSourceRow[]>(11, [])
  const sourceCounts: Record<string, number> = {}
  for (const item of utmData) {
    const src = deriveAttributionSource(item)
    sourceCounts[src] = (sourceCounts[src] || 0) + 1
  }
  const referralSources = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }))

  // === REFUNDS ===
  const refundData = get<Array<{ amount_cents: number; refund_amount_cents?: number | null }>>(17, [])
  const totalRefundsMonth = refundData.reduce(
    (s, i) => s + (i.refund_amount_cents || i.amount_cents || 0),
    0,
  ) / 100
  const refundRate = paidOrdersMonth > 0
    ? round1((refundData.length / paidOrdersMonth) * 100)
    : 0

  // === UNIT ECONOMICS + RISK GATES ===
  const aov = paidOrdersMonth > 0
    ? round1(totalRevenueMonth / paidOrdersMonth)
    : 0

  const supportTickets = get<Array<{ status: string; priority: string }>>(19, [])
  const openSupportTickets = supportTickets.filter((ticket) =>
    ticket.status === "open" || ticket.status === "in_progress"
  ).length
  const highPrioritySupportTickets = supportTickets.filter((ticket) =>
    ticket.priority === "high" || ticket.priority === "urgent"
  ).length
  const supportTicketsPer100Orders = paidOrdersMonth > 0
    ? Math.round((supportTickets.length / paidOrdersMonth) * 1000) / 10
    : supportTickets.length > 0 ? 100 : 0

  const disputes = get<Array<{ status: string }>>(20, [])
  const activeDisputeStatuses = new Set([
    "needs_response",
    "warning_needs_response",
    "warning_under_review",
    "under_review",
  ])
  const activeDisputes = disputes.filter((dispute) =>
    activeDisputeStatuses.has(dispute.status)
  ).length
  const chargebackRate = paidOrdersMonth > 0
    ? round1((disputes.length / paidOrdersMonth) * 100)
    : disputes.length > 0 ? 100 : 0

  const paidOrdersByPatient = revenueData
    .filter((order) => Boolean(order.patient_id && order.paid_at))
    .map((order) => ({
      category: order.category,
      paid_at: order.paid_at,
      patient_id: order.patient_id as string,
    }))
    .sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime())
  const seenPatients = new Set<string>()
  const paidByService: Record<string, number> = {}
  const repeatByService: Record<string, number> = {}
  let repeatPaidOrders = 0

  for (const order of paidOrdersByPatient) {
    const category = order.category || "unknown"
    paidByService[category] = (paidByService[category] || 0) + 1

    if (seenPatients.has(order.patient_id)) {
      repeatPaidOrders++
      repeatByService[category] = (repeatByService[category] || 0) + 1
    } else {
      seenPatients.add(order.patient_id)
    }
  }

  const repeatOrderRate = paidOrdersByPatient.length > 0
    ? round1((repeatPaidOrders / paidOrdersByPatient.length) * 100)
    : 0
  const serviceRepeatUsage = Object.entries(paidByService)
    .map(([category, paidOrders]) => {
      const repeatOrders = repeatByService[category] || 0
      return {
        category,
        paidOrders,
        repeatPaidOrders: repeatOrders,
        repeatRate: paidOrders > 0 ? round1((repeatOrders / paidOrders) * 100) : 0,
      }
    })
    .sort((a, b) => b.paidOrders - a.paidOrders)

  // === DAILY BUSINESS SCORECARD ===
  const todayPaidOrders = todayRevenueData.length
  const todayAov = todayPaidOrders > 0 ? round1(todayRevenue / todayPaidOrders) : 0

  const serviceMap = new Map<string, {
    category: string
    grossRevenue: number
    paidOrders: number
    paidOrdersToday: number
    subtype: string | null
  }>()
  for (const order of revenueData) {
    const category = order.category || "unknown"
    const subtype = order.subtype || null
    const key = `${category}:${subtype || ""}`
    const existing = serviceMap.get(key) || {
      category,
      grossRevenue: 0,
      paidOrders: 0,
      paidOrdersToday: 0,
      subtype,
    }
    existing.paidOrders += 1
    existing.grossRevenue += (order.amount_cents || 0) / 100
    if (order.paid_at >= today.toISOString()) {
      existing.paidOrdersToday += 1
    }
    serviceMap.set(key, existing)
  }
  const paidOrdersByService = [...serviceMap.values()]
    .map((service) => ({
      ...service,
      aov: service.paidOrders > 0 ? round1(service.grossRevenue / service.paidOrders) : 0,
      grossRevenue: round1(service.grossRevenue),
    }))
    .sort((a, b) => b.grossRevenue - a.grossRevenue)

  const unknownPaidOrders = utmData.filter(isUnknownAttribution).length
  const unknownAttributionRate = paidOrdersMonth > 0
    ? round1((unknownPaidOrders / paidOrdersMonth) * 100)
    : 0
  const utmSourcedOrders = utmData.filter((row) => Boolean(row.utm_source?.trim())).length
  const clickIdOrders = utmData.filter(hasClickId).length

  const landingPageCounts: Record<string, number> = {}
  for (const row of utmData) {
    const landingPage = normalizeLandingPage(row.landing_page)
    landingPageCounts[landingPage] = (landingPageCounts[landingPage] || 0) + 1
  }
  const topLandingPages = Object.entries(landingPageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([landingPage, paidOrders]) => ({ landingPage, paidOrders }))

  const topSources = referralSources
    .slice(0, 5)
    .map(({ count, source }) => ({ paidOrders: count, source }))

  const paidMedCertIds = revenueData
    .filter((order) => order.category === "medical_certificate" && order.id)
    .map((order) => order.id)
  const { data: issuedCertificateRows } = paidMedCertIds.length > 0
    ? await supabase
      .from("issued_certificates")
      .select("intake_id")
      .in("intake_id", paidMedCertIds)
    : { data: [] as Array<{ intake_id: string }> }
  const issuedCertificateIntakeIds = new Set(
    (issuedCertificateRows || [])
      .map((row) => row.intake_id)
      .filter(Boolean),
  )
  const fulfilledMedCerts = paidMedCertIds.filter((id) => issuedCertificateIntakeIds.has(id)).length
  const paidPrescriptionOrders = revenueData.filter((order) => order.category === "prescription")
  const fulfilledPrescriptions = paidPrescriptionOrders.filter((order) =>
    Boolean(order.script_sent_at || order.prescription_sent_at || order.status === "completed")
  ).length
  const eligibleFulfillmentOrders = paidMedCertIds.length + paidPrescriptionOrders.length
  const fulfilledOrders = fulfilledMedCerts + fulfilledPrescriptions
  const fulfillmentRate = eligibleFulfillmentOrders > 0
    ? round1((fulfilledOrders / eligibleFulfillmentOrders) * 100)
    : 100

  const currentPatientIds = [...new Set(revenueData.map((order) => order.patient_id).filter(Boolean) as string[])]
  const { data: priorPaidPatientRows } = currentPatientIds.length > 0
    ? await supabase
      .from("intakes")
      .select("patient_id")
      .not("paid_at", "is", null)
      .lt("paid_at", monthAgo.toISOString())
      .in("patient_id", currentPatientIds)
    : { data: [] as Array<{ patient_id: string }> }
  const priorPaidPatientIds = new Set((priorPaidPatientRows || []).map((row) => row.patient_id).filter(Boolean))
  const currentOrderCountsByPatient = new Map<string, number>()
  for (const order of revenueData) {
    if (!order.patient_id) continue
    currentOrderCountsByPatient.set(order.patient_id, (currentOrderCountsByPatient.get(order.patient_id) || 0) + 1)
  }
  const repeatCustomerIds = currentPatientIds.filter((patientId) =>
    priorPaidPatientIds.has(patientId) || (currentOrderCountsByPatient.get(patientId) || 0) > 1
  )
  const repeatCustomerRate = currentPatientIds.length > 0
    ? round1((repeatCustomerIds.length / currentPatientIds.length) * 100)
    : 0

  const scaleReadinessGates = {
    unknownAttributionRate: {
      passed: paidOrdersMonth > 0 && unknownAttributionRate <= 20,
      target: 20,
      value: unknownAttributionRate,
    },
    refundRate: {
      passed: paidOrdersMonth > 0 && refundRate < 8,
      target: 8,
      value: refundRate,
    },
    chargebackRate: {
      passed: paidOrdersMonth > 0 && chargebackRate < 0.5,
      target: 0.5,
      value: chargebackRate,
    },
    aov: {
      passed: paidOrdersMonth > 0 && aov >= 35,
      target: 35,
      value: aov,
    },
    grossRevenue: {
      passed: totalRevenueMonth >= 10000,
      target: 10000,
      value: totalRevenueMonth,
    },
  }
  const scaleScore = Math.round(
    (Object.values(scaleReadinessGates).filter((gate) => gate.passed).length /
      Object.values(scaleReadinessGates).length) * 100,
  )

  // === LAUNCH READINESS ===
  const checks = {
    hasRevenue: totalRevenueMonth > 0,
    hasCertificates: certsThisWeek > 0,
    slaHealthy: slaBreaches === 0,
    emailHealthy: emailDeliveryRate >= 95,
    doctorsActive: activeDoctors > 0,
    queueManageable: activeQueueSize <= 20,
    refundRateLow: refundRate < 10,
    acquisitionTracked: acquisition.healthy,
    chargebackRateLow: chargebackRate < 0.5,
    supportLoadHealthy: supportTicketsPer100Orders <= 5,
  }
  const passedChecks = Object.values(checks).filter(Boolean).length
  const totalChecks = Object.values(checks).length
  const readinessScore = Math.round((passedChecks / totalChecks) * 100)

  return {
    scorecard: {
      generatedAt: now.toISOString(),
      windowDays: 30,
      scaleReadiness: {
        score: scaleScore,
        gates: scaleReadinessGates,
      },
      today: {
        aov: todayAov,
        grossRevenue: todayRevenue,
        paidOrders: todayPaidOrders,
      },
      paidOrdersByService,
      attribution: {
        clickIdOrders,
        topLandingPages,
        topSources,
        unknownPaidOrders,
        unknownRate: unknownAttributionRate,
        utmSourcedOrders,
      },
      fulfillment: {
        eligiblePaidOrders: eligibleFulfillmentOrders,
        fulfilledOrders,
        fulfillmentRate,
        missingOrders: Math.max(eligibleFulfillmentOrders - fulfilledOrders, 0),
      },
      repeatCustomers: {
        currentCustomers: currentPatientIds.length,
        repeatCustomerRate,
        repeatCustomers: repeatCustomerIds.length,
      },
      reviewTime: {
        medianMinutes: medianReviewMinutes,
        p95Minutes: p95ReviewMinutes,
        reviewedOrders: reviewDurations.length,
      },
    },
    revenue: {
      today: todayRevenue,
      thisWeek: thisWeekRevenue,
      thisMonth: totalRevenueMonth,
      weeklyTrend: weeklyRevenueTrend,
      daily: dailyRevenue,
    },
    certs: {
      today: certsToday,
      thisWeek: certsThisWeek,
    },
    sla: {
      avgMinutes: avgSlaMinutes,
      breaches: slaBreaches,
      queueSize: activeQueueSize,
    },
    doctors: {
      active: activeDoctors,
      utilizationRate: doctorUtilizationRate,
      reviewsThisWeek: doctorReviews.length,
    },
    email: {
      deliveryRate: emailDeliveryRate,
      sentThisWeek: emailSent,
      failedThisWeek: emailFailed,
    },
    funnel: {
      pageViews,
      started: intakesStarted,
      paid: intakesPaid,
      approved: intakesApproved,
      conversionRate,
    },
    unitEconomics: {
      aov,
      paidOrdersMonth,
      repeatPaidOrders,
      repeatOrderRate,
    },
    risk: {
      chargebacksMonth: disputes.length,
      chargebackRate,
      activeDisputes,
      supportTicketsMonth: supportTickets.length,
      supportTicketsPer100Orders,
      openSupportTickets,
      highPrioritySupportTickets,
    },
    referrals: referralSources,
    serviceRepeatUsage,
    refunds: {
      totalMonth: totalRefundsMonth,
      rate: refundRate,
    },
    acquisition,
    launchReadiness: {
      score: readinessScore,
      checks,
    },
  }
}
