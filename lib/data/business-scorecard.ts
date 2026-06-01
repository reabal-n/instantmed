import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { QUEUE_REVIEW_STATUSES } from "@/lib/doctor/queue-utils"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

type ScorecardStatus = "healthy" | "watch" | "triggered" | "unknown"

export type BusinessScorecardMetric = {
  label: string
  value: number | null
  display: string
  status: ScorecardStatus
  target: string
}

export type BusinessOperatingScorecard = {
  monthlyGrossCents: BusinessScorecardMetric
  paidOrderVolume: BusinessScorecardMetric
  cacCeilingCents: BusinessScorecardMetric
  refundRate: BusinessScorecardMetric
  chargebackRate: BusinessScorecardMetric
  supportTicketsPer100Orders: BusinessScorecardMetric
  doctorMinutesPerOrder: BusinessScorecardMetric
  queueP95Minutes: BusinessScorecardMetric
  hireTriggerState: {
    label: string
    status: ScorecardStatus
    display: string
    triggeredBy: string[]
  }
}

export type BusinessScorecardPaidIntake = {
  amount_cents: number | null
  payment_status: string | null
  paid_at: string | null
  approved_at: string | null
  declined_at: string | null
  refunded_at: string | null
  refund_amount_cents: number | null
  dispute_id: string | null
}

export type BusinessScorecardInput = {
  now: Date
  paidIntakes: BusinessScorecardPaidIntake[]
  supportMessageCount: number
  queueWaitMinutes: number[]
}

const MONTHLY_REVENUE_HIRE_TRIGGER_CENTS = 60_000_00
const DAILY_ORDER_HIRE_TRIGGER = 30
const SUPPORT_TICKETS_PER_100_TARGET = 5
const QUEUE_P95_TARGET_MINUTES = 120
const REFUND_RATE_TARGET = 10
const CHARGEBACK_RATE_TARGET = 0.5

export function buildBusinessOperatingScorecard(input: BusinessScorecardInput): BusinessOperatingScorecard {
  const paidOrderCount = input.paidIntakes.length
  const monthlyGrossCents = sum(input.paidIntakes.map((row) => row.amount_cents ?? 0))
  const averageOrderCents = paidOrderCount > 0 ? monthlyGrossCents / paidOrderCount : 0
  const cacCeilingCents = paidOrderCount > 0 ? Math.round(averageOrderCents * 0.3) : null

  const refundedCount = input.paidIntakes.filter((row) => {
    const status = row.payment_status ?? ""
    return status === "refunded" || status === "partially_refunded" || Boolean(row.refunded_at) || Number(row.refund_amount_cents ?? 0) > 0
  }).length
  const disputeCount = input.paidIntakes.filter((row) => row.payment_status === "disputed" || Boolean(row.dispute_id)).length
  const reviewedMinuteSamples = input.paidIntakes
    .map((row) => reviewMinutes(row))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0)

  const refundRate = percent(refundedCount, paidOrderCount)
  const chargebackRate = percent(disputeCount, paidOrderCount)
  const supportTicketsPer100Orders = paidOrderCount > 0
    ? round1((input.supportMessageCount / paidOrderCount) * 100)
    : null
  const doctorMinutesPerOrder = reviewedMinuteSamples.length > 0
    ? Math.round(sum(reviewedMinuteSamples) / reviewedMinuteSamples.length)
    : null
  const queueP95Minutes = percentile(input.queueWaitMinutes, 95)
  const dailyOrderRunRate = paidOrderCount / 30

  const triggeredBy: string[] = []
  if (dailyOrderRunRate >= DAILY_ORDER_HIRE_TRIGGER) triggeredBy.push("30+ paid orders/day run rate")
  if (monthlyGrossCents >= MONTHLY_REVENUE_HIRE_TRIGGER_CENTS) triggeredBy.push("$60k+ monthly gross")
  if ((supportTicketsPer100Orders ?? 0) > SUPPORT_TICKETS_PER_100_TARGET) triggeredBy.push("support load above 5/100 orders")
  if ((queueP95Minutes ?? 0) > QUEUE_P95_TARGET_MINUTES) triggeredBy.push("queue P95 above 2h")

  return {
    monthlyGrossCents: metric({
      label: "Monthly gross revenue",
      value: monthlyGrossCents,
      display: formatCurrencyCents(monthlyGrossCents),
      status: monthlyGrossCents >= MONTHLY_REVENUE_HIRE_TRIGGER_CENTS ? "triggered" : "watch",
      target: "$60k-$80k starts formal staff planning",
    }),
    paidOrderVolume: metric({
      label: "Paid order volume",
      value: paidOrderCount,
      display: `${paidOrderCount}`,
      status: dailyOrderRunRate >= DAILY_ORDER_HIRE_TRIGGER ? "triggered" : "watch",
      target: "30-50 orders/day triggers admin/support planning",
    }),
    cacCeilingCents: metric({
      label: "CAC ceiling",
      value: cacCeilingCents,
      display: cacCeilingCents == null ? "No paid orders" : formatCurrencyCents(cacCeilingCents),
      status: cacCeilingCents == null ? "unknown" : "healthy",
      target: "Keep CAC below 30% of first-order gross",
    }),
    refundRate: metric({
      label: "Refund rate",
      value: refundRate,
      display: formatPercent(refundRate),
      status: rateStatus(refundRate, REFUND_RATE_TARGET),
      target: "Below 8-10%",
    }),
    chargebackRate: metric({
      label: "Chargeback rate",
      value: chargebackRate,
      display: formatPercent(chargebackRate),
      status: rateStatus(chargebackRate, CHARGEBACK_RATE_TARGET),
      target: "Below 0.5%",
    }),
    supportTicketsPer100Orders: metric({
      label: "Support tickets per 100 orders",
      value: supportTicketsPer100Orders,
      display: supportTicketsPer100Orders == null ? "No paid orders" : `${supportTicketsPer100Orders}/100`,
      status: rateStatus(supportTicketsPer100Orders, SUPPORT_TICKETS_PER_100_TARGET),
      target: "Below 5 per 100",
    }),
    doctorMinutesPerOrder: metric({
      label: "Doctor minutes per order",
      value: doctorMinutesPerOrder,
      display: doctorMinutesPerOrder == null ? "Not enough decided cases" : `${doctorMinutesPerOrder} min`,
      status: doctorMinutesPerOrder == null ? "unknown" : doctorMinutesPerOrder > 15 ? "watch" : "healthy",
      target: "Stable or falling as volume rises",
    }),
    queueP95Minutes: metric({
      label: "Queue P95",
      value: queueP95Minutes,
      display: queueP95Minutes == null ? "No active queue" : `${queueP95Minutes} min`,
      status: queueP95Minutes == null ? "healthy" : queueP95Minutes > QUEUE_P95_TARGET_MINUTES ? "triggered" : "healthy",
      target: "Below 2h during operating hours",
    }),
    hireTriggerState: {
      label: "Hire trigger state",
      status: triggeredBy.length > 0 ? "triggered" : "healthy",
      display: triggeredBy.length > 0 ? "Triggered" : "Clear",
      triggeredBy,
    },
  }
}

export async function getBusinessOperatingScorecard(
  supabase: SupabaseClient = createServiceRoleClient(),
  now = new Date(),
): Promise<BusinessOperatingScorecard> {
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [paidResult, supportResult, queueResult] = await Promise.all([
    filterReportableIntakes(supabase
      .from("intakes")
      .select("amount_cents, payment_status, paid_at, approved_at, declined_at, refunded_at, refund_amount_cents, dispute_id")
      .not("paid_at", "is", null)
      .gte("paid_at", monthAgo.toISOString())),
    supabase
      .from("patient_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_type", "patient")
      .gte("created_at", monthAgo.toISOString()),
    filterReportableIntakes(supabase
      .from("intakes")
      .select("paid_at, submitted_at, created_at")
      .in("status", QUEUE_REVIEW_STATUSES)
      .eq("payment_status", "paid")),
  ])

  const paidIntakes = (paidResult.data ?? []) as BusinessScorecardPaidIntake[]
  const queueRows = (queueResult.data ?? []) as Array<{
    paid_at?: string | null
    submitted_at?: string | null
    created_at?: string | null
  }>

  return buildBusinessOperatingScorecard({
    now,
    paidIntakes,
    supportMessageCount: supportResult.count ?? 0,
    queueWaitMinutes: queueRows
      .map((row) => {
        const timestamp = row.paid_at ?? row.submitted_at ?? row.created_at
        if (!timestamp) return null
        return Math.max(0, Math.round((now.getTime() - new Date(timestamp).getTime()) / 60000))
      })
      .filter((value): value is number => typeof value === "number"),
  })
}

function metric(input: BusinessScorecardMetric): BusinessScorecardMetric {
  return input
}

function reviewMinutes(row: BusinessScorecardPaidIntake): number | null {
  const end = row.approved_at ?? row.declined_at
  if (!row.paid_at || !end) return null
  return Math.round((new Date(end).getTime() - new Date(row.paid_at).getTime()) / 60000)
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index]
}

function percent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return round1((numerator / denominator) * 100)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function rateStatus(value: number | null, target: number): ScorecardStatus {
  if (value == null) return "unknown"
  if (value > target) return "triggered"
  if (value > target * 0.8) return "watch"
  return "healthy"
}

function formatCurrencyCents(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value / 100)
}

function formatPercent(value: number | null): string {
  return value == null ? "No paid orders" : `${value}%`
}
