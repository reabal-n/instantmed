import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  REVENUE_ACTIVE_MILESTONE_CENTS,
  REVENUE_CAPACITY_REVIEW_CENTS,
} from "@/lib/business/revenue-milestones"
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

type BusinessContributionReadiness = {
  label: string
  status: "inputs_required"
  display: string
  decision: "complete_and_positive_before_scaling"
  formula: string
  requiredInputs: string[]
  ownerDoctorLabour: {
    marginalCashCostCents: 0
    capacityBounded: true
    display: string
  }
  realisedIncrementalLabourRule: string
  scaleRule: string
}

export type BusinessOperatingScorecard = {
  rolling30DayNetRetainedCents: BusinessScorecardMetric
  paidOrderVolume: BusinessScorecardMetric
  refundRate: BusinessScorecardMetric
  chargebackRate: BusinessScorecardMetric
  supportTicketsPer100Orders: BusinessScorecardMetric
  paidToDecisionMinutes: BusinessScorecardMetric
  queueP95Minutes: BusinessScorecardMetric
  contributionReadiness: BusinessContributionReadiness
  capacityReviewState: {
    label: string
    status: ScorecardStatus
    display: string
    triggeredBy: string[]
    automaticExtraDoctorTrigger: string
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
  rolling30DayNetRetainedCents: number
  paidIntakes: BusinessScorecardPaidIntake[]
  supportMessageCount: number
  queueWaitMinutes: number[]
}

export type BusinessScorecardSource = Omit<
  BusinessScorecardInput,
  "rolling30DayNetRetainedCents"
>

const SUPPORT_TICKETS_PER_100_TARGET = 5
const QUEUE_P95_TARGET_MINUTES = 120
const REFUND_RATE_TARGET = 10
const CHARGEBACK_RATE_TARGET = 0.5
const BELOW_CAPACITY_CONTRIBUTION_INPUTS = [
  "Stripe/payment fees",
  "Attributable acquisition cost",
]
const AUTOMATIC_EXTRA_DOCTOR_TRIGGER = "Sustained 20+ prescription requests/hour"

export function buildBusinessOperatingScorecard(input: BusinessScorecardInput): BusinessOperatingScorecard {
  const paidOrderCount = input.paidIntakes.length
  const rolling30DayNetRetainedCents = input.rolling30DayNetRetainedCents

  const refundedCount = input.paidIntakes.filter((row) => {
    const status = row.payment_status ?? ""
    return status === "refunded" || status === "partially_refunded" || Boolean(row.refunded_at) || Number(row.refund_amount_cents ?? 0) > 0
  }).length
  const disputeCount = input.paidIntakes.filter((row) => row.payment_status === "disputed" || Boolean(row.dispute_id)).length
  const paidToDecisionMinuteSamples = input.paidIntakes
    .map((row) => elapsedPaidToDecisionMinutes(row))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0)

  const refundRate = percent(refundedCount, paidOrderCount)
  const chargebackRate = percent(disputeCount, paidOrderCount)
  const supportTicketsPer100Orders = paidOrderCount > 0
    ? round1((input.supportMessageCount / paidOrderCount) * 100)
    : null
  const paidToDecisionMinutes = paidToDecisionMinuteSamples.length > 0
    ? Math.round(sum(paidToDecisionMinuteSamples) / paidToDecisionMinuteSamples.length)
    : null
  const queueP95Minutes = percentile(input.queueWaitMinutes, 95)
  const triggeredBy: string[] = []
  if (rolling30DayNetRetainedCents >= REVENUE_CAPACITY_REVIEW_CENTS) triggeredBy.push("$10k+ rolling 30-day net-retained revenue")
  if ((supportTicketsPer100Orders ?? 0) > SUPPORT_TICKETS_PER_100_TARGET) triggeredBy.push("support load above 5/100 orders")
  if ((queueP95Minutes ?? 0) > QUEUE_P95_TARGET_MINUTES) triggeredBy.push("queue P95 above 2h")

  return {
    rolling30DayNetRetainedCents: metric({
      label: "Rolling 30-day net-retained revenue",
      value: rolling30DayNetRetainedCents,
      display: formatCurrencyCents(rolling30DayNetRetainedCents),
      status: rolling30DayNetRetainedCents >= REVENUE_CAPACITY_REVIEW_CENTS
        ? "triggered"
        : rolling30DayNetRetainedCents >= REVENUE_ACTIVE_MILESTONE_CENTS
          ? "healthy"
          : "watch",
      target: "Track the next unmet $2k -> $5k -> $10k rung; $10k triggers a capacity review",
    }),
    paidOrderVolume: metric({
      label: "Paid order volume",
      value: paidOrderCount,
      display: `${paidOrderCount}`,
      status: paidOrderCount > 0 ? "healthy" : "unknown",
      target: "Watch service mix and clinical workload as demand grows",
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
    paidToDecisionMinutes: metric({
      label: "Average paid-to-decision time",
      value: paidToDecisionMinutes,
      display: paidToDecisionMinutes == null ? "No decided cases" : `${paidToDecisionMinutes} min`,
      status: paidToDecisionMinutes == null
        ? "unknown"
        : paidToDecisionMinutes > QUEUE_P95_TARGET_MINUTES
          ? "watch"
          : "healthy",
      target: "Operational latency only; not an active-labour input",
    }),
    queueP95Minutes: metric({
      label: "Queue P95",
      value: queueP95Minutes,
      display: queueP95Minutes == null ? "No active queue" : `${queueP95Minutes} min`,
      status: queueP95Minutes == null ? "healthy" : queueP95Minutes > QUEUE_P95_TARGET_MINUTES ? "triggered" : "healthy",
      target: "Below 2h; never beyond 24h",
    }),
    contributionReadiness: {
      label: "Below-capacity first-order contribution",
      status: "inputs_required",
      display: "Fees + acquisition needed",
      decision: "complete_and_positive_before_scaling",
      formula: "Net-retained order revenue - Stripe/payment fees - attributable acquisition cost",
      requiredInputs: [...BELOW_CAPACITY_CONTRIBUTION_INPUTS],
      ownerDoctorLabour: {
        marginalCashCostCents: 0,
        capacityBounded: true,
        display: "Owner-doctor cash labour is $0 while demand stays within current capacity.",
      },
      realisedIncrementalLabourRule: "Deduct realised paid doctor or support labour when incurred.",
      scaleRule: "Scale only with complete trusted inputs and positive first-order contribution.",
    },
    capacityReviewState: {
      label: "Capacity review state",
      status: triggeredBy.length > 0 ? "triggered" : "healthy",
      display: triggeredBy.length > 0 ? "Review needed" : "Within current capacity",
      triggeredBy,
      automaticExtraDoctorTrigger: AUTOMATIC_EXTRA_DOCTOR_TRIGGER,
    },
  }
}

export async function getBusinessOperatingScorecardSource(
  supabase: SupabaseClient = createServiceRoleClient(),
  now = new Date(),
): Promise<BusinessScorecardSource> {
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

  if (paidResult.error || supportResult.error || queueResult.error) {
    throw new Error("Business scorecard source unavailable")
  }

  const paidIntakes = (paidResult.data ?? []) as BusinessScorecardPaidIntake[]
  const queueRows = (queueResult.data ?? []) as Array<{
    paid_at?: string | null
    submitted_at?: string | null
    created_at?: string | null
  }>

  return {
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
  }
}

function metric(input: BusinessScorecardMetric): BusinessScorecardMetric {
  return input
}

function elapsedPaidToDecisionMinutes(row: BusinessScorecardPaidIntake): number | null {
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
