import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { SEEDED_E2E_PATIENT_PROFILE_IDS } from "@/lib/data/seeded-e2e-data"
import { CRITICAL_CRONS } from "@/lib/monitoring/cron-heartbeat"

const DAY_MS = 24 * 60 * 60 * 1000
const REFILL_REMINDER_FUNNEL_WINDOW_DAYS = 90
const REFILL_REMINDER_CRON_MAX_DELAY_MS =
  CRITICAL_CRONS["refill-reminders"].maxDelayMinutes * 60 * 1000

export type RefillReminderFunnelAvailability =
  | "available"
  | "degraded"
  | "unavailable"
export type RefillReminderSchedulerEvidence = "healthy" | "missing" | "unavailable"

export interface RefillReminderFunnelWave {
  cohortStatus: "mature" | "maturing"
  delivered: number
  eligibleSentCohort: number | null
  maturityAt: string
  observedProviderClicks: number
  samePatientConvertedSendsWithin21d: number
  samePatientPaidReordersWithin21d: number
  samePatientReorderWithin21dPercent: number | null
  sent: number
  utmAttributedPaidRenewalsWithin21d: number
  utmConversionWithin21dPercent: number | null
  utmConvertedSendsWithin21d: number
  weekEndExclusive: string
  weekStart: string
}

export interface RefillReminderFunnelSnapshot {
  availability: RefillReminderFunnelAvailability
  delivered: number | null
  eligibleSentCohort: number | null
  from: string
  observedProviderClicks: number | null
  reason: string | null
  retainedRevenueAvailability: "unavailable"
  samePatientConvertedSendsWithin21d: number | null
  samePatientPaidReordersWithin21d: number | null
  samePatientReorderWithin21dPercent: number | null
  schedulerEvidence: RefillReminderSchedulerEvidence
  sent: number | null
  to: string
  utmAttributedPaidRenewalsWithin21d: number | null
  utmConversionWithin21dPercent: number | null
  utmConvertedSendsWithin21d: number | null
  waves: RefillReminderFunnelWave[]
}

interface ParsedWaveCounts {
  delivered: number
  observedProviderClicks: number
  samePatientConvertedSendsWithin21d: number
  samePatientPaidReordersWithin21d: number
  sent: number
  utmAttributedPaidRenewalsWithin21d: number
  utmConvertedSendsWithin21d: number
}

interface CronHeartbeatRow {
  job_name: unknown
  last_failure_at: unknown
  last_failure_status: unknown
  last_run_at: unknown
  last_status: unknown
  last_success_at: unknown
}

function percentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null
  return Math.round((numerator / denominator) * 1_000) / 10
}

function parseNonNegativeInteger(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function parseIso(value: unknown): { iso: string; ms: number } | null {
  if (typeof value !== "string") return null
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return null
  return { iso: new Date(ms).toISOString(), ms }
}

function parseWaveCounts(row: Record<string, unknown>): ParsedWaveCounts | null {
  const counts: ParsedWaveCounts = {
    delivered: parseNonNegativeInteger(row.delivered)!,
    observedProviderClicks: parseNonNegativeInteger(row.observed_provider_clicks)!,
    samePatientConvertedSendsWithin21d: parseNonNegativeInteger(
      row.same_patient_converted_sends_within_21d,
    )!,
    samePatientPaidReordersWithin21d: parseNonNegativeInteger(
      row.same_patient_paid_reorders_within_21d,
    )!,
    sent: parseNonNegativeInteger(row.sent)!,
    utmAttributedPaidRenewalsWithin21d: parseNonNegativeInteger(
      row.utm_attributed_paid_renewals_within_21d,
    )!,
    utmConvertedSendsWithin21d: parseNonNegativeInteger(
      row.utm_converted_sends_within_21d,
    )!,
  }

  if (Object.values(counts).some((count) => count === null)) return null
  if (
    counts.delivered > counts.sent ||
    counts.observedProviderClicks > counts.sent ||
    counts.utmConvertedSendsWithin21d > counts.sent ||
    counts.samePatientConvertedSendsWithin21d > counts.sent ||
    counts.utmConvertedSendsWithin21d > counts.samePatientConvertedSendsWithin21d ||
    counts.utmAttributedPaidRenewalsWithin21d > counts.samePatientPaidReordersWithin21d ||
    counts.utmConvertedSendsWithin21d > counts.utmAttributedPaidRenewalsWithin21d ||
    counts.samePatientConvertedSendsWithin21d > counts.samePatientPaidReordersWithin21d
  ) {
    return null
  }

  return counts
}

function parseWaves(value: unknown, asOfMs: number): RefillReminderFunnelWave[] | null {
  if (!Array.isArray(value)) return null

  const waves: RefillReminderFunnelWave[] = []
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null
    const row = item as Record<string, unknown>
    const weekStart = parseIso(row.week_start)
    const weekEnd = parseIso(row.week_end_exclusive)
    const maturityAt = parseIso(row.maturity_at)
    const counts = parseWaveCounts(row)
    if (
      !weekStart ||
      !weekEnd ||
      !maturityAt ||
      !counts ||
      weekStart.ms >= weekEnd.ms ||
      weekEnd.ms - weekStart.ms > 8 * DAY_MS ||
      maturityAt.ms < weekStart.ms + 21 * DAY_MS ||
      maturityAt.ms > weekEnd.ms + 21 * DAY_MS
    ) {
      return null
    }

    const mature = maturityAt.ms <= asOfMs
    waves.push({
      cohortStatus: mature ? "mature" : "maturing",
      delivered: counts.delivered,
      eligibleSentCohort: mature ? counts.sent : null,
      maturityAt: maturityAt.iso,
      observedProviderClicks: counts.observedProviderClicks,
      samePatientConvertedSendsWithin21d: counts.samePatientConvertedSendsWithin21d,
      samePatientPaidReordersWithin21d: counts.samePatientPaidReordersWithin21d,
      samePatientReorderWithin21dPercent: mature
        ? percentage(counts.samePatientConvertedSendsWithin21d, counts.sent)
        : null,
      sent: counts.sent,
      utmAttributedPaidRenewalsWithin21d: counts.utmAttributedPaidRenewalsWithin21d,
      utmConversionWithin21dPercent: mature
        ? percentage(counts.utmConvertedSendsWithin21d, counts.sent)
        : null,
      utmConvertedSendsWithin21d: counts.utmConvertedSendsWithin21d,
      weekEndExclusive: weekEnd.iso,
      weekStart: weekStart.iso,
    })
  }

  waves.sort((left, right) => Date.parse(left.weekStart) - Date.parse(right.weekStart))
  for (let index = 1; index < waves.length; index += 1) {
    if (Date.parse(waves[index - 1].weekEndExclusive) > Date.parse(waves[index].weekStart)) {
      return null
    }
  }
  return waves
}

function classifySchedulerEvidence(
  value: unknown,
  hasError: boolean,
  asOfMs: number,
): RefillReminderSchedulerEvidence {
  if (hasError) return "unavailable"
  if (value === null) return "missing"
  if (!value || typeof value !== "object" || Array.isArray(value)) return "unavailable"

  const row = value as CronHeartbeatRow
  const lastRun = parseIso(row.last_run_at)
  const lastSuccess = parseIso(row.last_success_at)
  const lastFailure = row.last_failure_at === null ? null : parseIso(row.last_failure_at)
  if (
    row.job_name !== "refill-reminders" ||
    typeof row.last_status !== "string" ||
    !lastRun ||
    !lastSuccess ||
    (row.last_failure_at !== null && !lastFailure) ||
    (row.last_failure_status !== null && typeof row.last_failure_status !== "string") ||
    lastRun.ms > asOfMs + 5 * 60 * 1000
  ) {
    return "unavailable"
  }

  const hasUnrecoveredFailure = Boolean(lastFailure && lastFailure.ms > lastSuccess.ms)
  if (hasUnrecoveredFailure || asOfMs - lastRun.ms > REFILL_REMINDER_CRON_MAX_DELAY_MS) {
    return "missing"
  }
  return "healthy"
}

export function buildUnavailableRefillReminderFunnelSnapshot(
  now = new Date(),
  reason = "funnel_read_failed",
): RefillReminderFunnelSnapshot {
  const to = now.toISOString()
  const from = new Date(now.getTime() - REFILL_REMINDER_FUNNEL_WINDOW_DAYS * DAY_MS).toISOString()
  return {
    availability: "unavailable",
    delivered: null,
    eligibleSentCohort: null,
    from,
    observedProviderClicks: null,
    reason,
    retainedRevenueAvailability: "unavailable",
    samePatientConvertedSendsWithin21d: null,
    samePatientPaidReordersWithin21d: null,
    samePatientReorderWithin21dPercent: null,
    schedulerEvidence: "unavailable",
    sent: null,
    to,
    utmAttributedPaidRenewalsWithin21d: null,
    utmConversionWithin21dPercent: null,
    utmConvertedSendsWithin21d: null,
    waves: [],
  }
}

export async function getRefillReminderFunnelSnapshot(
  supabase: Pick<SupabaseClient, "from" | "rpc">,
  now = new Date(),
): Promise<RefillReminderFunnelSnapshot> {
  const asOfMs = now.getTime()
  if (!Number.isFinite(asOfMs)) {
    return buildUnavailableRefillReminderFunnelSnapshot(new Date(0), "invalid_as_of")
  }
  const to = now.toISOString()
  const from = new Date(asOfMs - REFILL_REMINDER_FUNNEL_WINDOW_DAYS * DAY_MS).toISOString()

  const [funnelRead, heartbeatRead] = await Promise.allSettled([
    Promise.resolve().then(() => supabase.rpc("get_refill_reminder_funnel", {
      p_as_of: to,
      p_excluded_patient_ids: [...SEEDED_E2E_PATIENT_PROFILE_IDS],
      p_from: from,
      p_to: to,
    })),
    Promise.resolve().then(() => supabase
      .from("cron_heartbeats")
      .select(
        "job_name, last_run_at, last_status, last_success_at, last_failure_at, last_failure_status",
      )
      .eq("job_name", "refill-reminders")
      .maybeSingle()),
  ])

  const funnelResult = funnelRead.status === "fulfilled" ? funnelRead.value : null
  const waves = parseWaves(funnelResult?.data, asOfMs)
  if (funnelRead.status === "rejected" || funnelResult?.error || !waves) {
    return buildUnavailableRefillReminderFunnelSnapshot(now, "invalid_rpc_response")
  }

  const heartbeatResult = heartbeatRead.status === "fulfilled" ? heartbeatRead.value : null
  const schedulerEvidence = classifySchedulerEvidence(
    heartbeatResult?.data,
    heartbeatRead.status === "rejected" || Boolean(heartbeatResult?.error),
    asOfMs,
  )
  const matureWaves = waves.filter((wave) => wave.cohortStatus === "mature")
  const sum = (rows: RefillReminderFunnelWave[], field: keyof ParsedWaveCounts) => (
    rows.reduce((total, row) => total + row[field], 0)
  )
  const eligibleSentCohort = sum(matureWaves, "sent")
  const utmConvertedSendsWithin21d = sum(matureWaves, "utmConvertedSendsWithin21d")
  const samePatientConvertedSendsWithin21d = sum(
    matureWaves,
    "samePatientConvertedSendsWithin21d",
  )

  return {
    availability: "available",
    delivered: sum(waves, "delivered"),
    eligibleSentCohort,
    from,
    observedProviderClicks: sum(waves, "observedProviderClicks"),
    reason: null,
    retainedRevenueAvailability: "unavailable",
    samePatientConvertedSendsWithin21d,
    samePatientPaidReordersWithin21d: sum(
      matureWaves,
      "samePatientPaidReordersWithin21d",
    ),
    samePatientReorderWithin21dPercent: percentage(
      samePatientConvertedSendsWithin21d,
      eligibleSentCohort,
    ),
    schedulerEvidence,
    sent: sum(waves, "sent"),
    to,
    utmAttributedPaidRenewalsWithin21d: sum(
      matureWaves,
      "utmAttributedPaidRenewalsWithin21d",
    ),
    utmConversionWithin21dPercent: percentage(
      utmConvertedSendsWithin21d,
      eligibleSentCohort,
    ),
    utmConvertedSendsWithin21d,
    waves,
  }
}
