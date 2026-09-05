import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  AdsOperationalQueueServiceEvidence,
  AdsOperationalQueueSnapshot,
  AdsOperationalService,
  ManualGrowthHealthEvidence,
} from "@/lib/ads-agent/types"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import {
  FULFILMENT_ENTITLED_PAYMENT_STATUSES,
  isFulfilmentEntitledPaymentStatus,
} from "@/lib/stripe/fulfilment-entitlement"

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_OPERATIONAL_QUEUE_ROWS = 5_000
export const ADS_OPERATIONAL_SERVICES = [
  "med_certs",
  "scripts",
  "ed",
  "hair_loss",
  "womens_health",
] as const satisfies readonly AdsOperationalService[]
const ACTIVE_MANUAL_REVIEW_STATUSES = new Set([
  "paid",
  "in_review",
  "pending_info",
  "awaiting_script",
  "escalated",
])
const NON_MANUAL_CERTIFICATE_STATES = new Set([
  "awaiting_drafts",
  "pending",
  "attempting",
  "failed_retrying",
  "approved",
])

interface AdsOperationalIntakeRow {
  auto_approval_state: string | null
  category: string | null
  id: string | null
  paid_at: string | null
  payment_status: string | null
  status: string | null
  subtype: string | null
}

interface AdsClinicianOpenRow {
  created_at: string | null
  intake_id: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function adsOperationalServiceForIntake(
  row: AdsOperationalIntakeRow,
): AdsOperationalService | null {
  const category = row.category?.trim().toLowerCase().replace(/-/g, "_")
  const subtype = row.subtype?.trim().toLowerCase().replace(/-/g, "_") ?? ""

  if (category === "medical_certificate") {
    const autoApprovalState = row.auto_approval_state?.trim().toLowerCase()
    return autoApprovalState && NON_MANUAL_CERTIFICATE_STATES.has(autoApprovalState)
      ? null
      : "med_certs"
  }
  if (
    category === "prescription"
    || category === "repeat_script"
    || category === "repeat_rx"
  ) {
    return "scripts"
  }
  if (category !== "consult") return null
  if (subtype === "ed" || subtype.includes("erectile")) return "ed"
  if (subtype.includes("hair")) return "hair_loss"
  if (
    subtype.includes("women")
    || subtype.includes("uti")
    || subtype.includes("contracept")
  ) {
    return "womens_health"
  }
  return null
}

function roundedHours(milliseconds: number): number {
  return Math.round(milliseconds / 3_600) / 1_000
}

function percentile95(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? null
}

/**
 * Reduces internal request/audit rows to service-level queue evidence. IDs are
 * used only for the in-memory join and never leave this boundary.
 */
export function aggregateAdsOperationalQueueEvidence(input: {
  clinicianOpens: AdsClinicianOpenRow[]
  intakes: AdsOperationalIntakeRow[]
  now: Date
}): AdsOperationalQueueSnapshot {
  const nowMs = input.now.getTime()
  if (!Number.isFinite(nowMs)) {
    throw new Error("Ads operational queue time is invalid")
  }

  const opensByRequest = new Map<string, number[]>()
  for (const event of input.clinicianOpens) {
    const requestId = event.intake_id?.trim()
    const createdAt = Date.parse(event.created_at ?? "")
    if (!requestId || !Number.isFinite(createdAt) || createdAt > nowMs) {
      throw new Error("ads_operational_queue_malformed")
    }
    const events = opensByRequest.get(requestId) ?? []
    events.push(createdAt)
    opensByRequest.set(requestId, events)
  }

  const reviewWaits = new Map<AdsOperationalService, number[]>()
  const unresolvedAges = new Map<AdsOperationalService, number[]>()
  const breaches = new Map<AdsOperationalService, number>()
  const seenIntakes = new Set<string>()

  for (const row of input.intakes) {
    const id = row.id?.trim()
    const paidAt = Date.parse(row.paid_at ?? "")
    if (
      !id
      || seenIntakes.has(id)
      || !Number.isFinite(paidAt)
      || paidAt > nowMs
      || !isFulfilmentEntitledPaymentStatus(row.payment_status)
    ) {
      throw new Error("ads_operational_queue_malformed")
    }
    seenIntakes.add(id)
    const firstLaterOpen = (opensByRequest.get(id) ?? [])
      .filter((openedAt) => openedAt > paidAt)
      .sort((left, right) => left - right)[0] ?? null
    const service = adsOperationalServiceForIntake(row)
    if (!service) continue

    const paidAgeMs = nowMs - paidAt
    if (paidAt >= nowMs - 7 * DAY_MS && firstLaterOpen !== null) {
      const waitHours = roundedHours(firstLaterOpen - paidAt)
      const waits = reviewWaits.get(service) ?? []
      waits.push(waitHours)
      reviewWaits.set(service, waits)
      if (waitHours >= 24) breaches.set(service, (breaches.get(service) ?? 0) + 1)
    }

    if (
      firstLaterOpen === null
      && ACTIVE_MANUAL_REVIEW_STATUSES.has(row.status ?? "")
    ) {
      const ageHours = roundedHours(paidAgeMs)
      const ages = unresolvedAges.get(service) ?? []
      ages.push(ageHours)
      unresolvedAges.set(service, ages)
      if (ageHours >= 24) breaches.set(service, (breaches.get(service) ?? 0) + 1)
    }
  }

  const services: AdsOperationalQueueServiceEvidence[] =
    ADS_OPERATIONAL_SERVICES.map((affectedService) => {
      const ages = unresolvedAges.get(affectedService) ?? []
      return {
        affectedService,
        availability: "available",
        oldestUnresolvedHours: ages.length > 0 ? Math.max(...ages) : null,
        p95ReviewHours: percentile95(reviewWaits.get(affectedService) ?? []),
        review24hBreaches: breaches.get(affectedService) ?? 0,
      }
    })

  return { availability: "available", services }
}

type OperationalIntakeQueryResult = {
  count: number | null
  data: AdsOperationalIntakeRow[] | null
  error: { message?: string } | null
}

type ClinicianOpenQueryResult = {
  count: number | null
  data: AdsClinicianOpenRow[] | null
  error: { message?: string } | null
}

const OPERATIONAL_INTAKE_SELECT = [
  "id",
  "category",
  "subtype",
  "status",
  "paid_at",
  "payment_status",
  "auto_approval_state",
].join(", ")

const SUPPORT_GROWTH_HEALTH_METRIC = "ads_support_contacts_per_100_paid"
const CLINICAL_QA_GROWTH_HEALTH_METRIC = "ads_completed_clinical_qa_state"

interface ManualGrowthHealthMetricRow {
  dimensions: unknown
  metric_name: string | null
  metric_value: number | string | null
  recorded_at: string | null
}

/** Reduces aggregate-only operator attestations to the closed typed contract. */
export function buildManualGrowthHealthEvidence(
  rows: ManualGrowthHealthMetricRow[],
): ManualGrowthHealthEvidence {
  const latestSupport = rows.find(
    (row) => row.metric_name === SUPPORT_GROWTH_HEALTH_METRIC,
  )
  const supportDimensions = asRecord(latestSupport?.dimensions)
  const supportValue = asFiniteNumber(latestSupport?.metric_value)
  const supportAsOf = asString(latestSupport?.recorded_at)
  const support =
    supportDimensions?.source === "verified_gmail_aggregate"
    && supportValue !== null
    && supportValue >= 0
    && supportAsOf !== null
      ? {
          asOf: supportAsOf,
          contactsPer100Paid: supportValue,
          source: "verified_gmail_aggregate" as const,
        }
      : null

  const latestClinicalQa = rows.find(
    (row) => row.metric_name === CLINICAL_QA_GROWTH_HEALTH_METRIC,
  )
  const clinicalQaDimensions = asRecord(latestClinicalQa?.dimensions)
  const clinicalQaAsOf = asString(latestClinicalQa?.recorded_at)
  const clinicalQaState = clinicalQaDimensions?.state
  const clinicalQa: ManualGrowthHealthEvidence["clinicalQa"] =
    clinicalQaDimensions?.source === "medical_director_completed_review"
    && (clinicalQaState === "current" || clinicalQaState === "behind")
    && clinicalQaAsOf !== null
      ? {
          asOf: clinicalQaAsOf,
          source: "medical_director_completed_review" as const,
          state: clinicalQaState,
        }
      : null

  return { support, clinicalQa }
}

export async function readManualGrowthHealthEvidence(
  supabase: SupabaseClient,
): Promise<ManualGrowthHealthEvidence> {
  const readLatest = async (metricName: string) => {
    const result = await supabase
      .from("operational_metrics")
      .select("metric_name, metric_value, dimensions, recorded_at")
      .eq("metric_name", metricName)
      .order("recorded_at", { ascending: false })
      .limit(1)
    if (result.error || !Array.isArray(result.data)) return null
    return (result.data[0] as ManualGrowthHealthMetricRow | undefined) ?? null
  }
  const [supportResult, clinicalQaResult] = await Promise.allSettled([
    readLatest(SUPPORT_GROWTH_HEALTH_METRIC),
    readLatest(CLINICAL_QA_GROWTH_HEALTH_METRIC),
  ])
  const rows = [supportResult, clinicalQaResult].flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  )
  return buildManualGrowthHealthEvidence(rows)
}

function assertCompleteOperationalRows(
  result: OperationalIntakeQueryResult,
): AdsOperationalIntakeRow[] {
  const rows = result.data ?? []
  if (
    result.error
    || typeof result.count !== "number"
    || result.count !== rows.length
    || result.count > MAX_OPERATIONAL_QUEUE_ROWS
  ) {
    throw new Error("ads_operational_queue_incomplete")
  }
  return rows
}

/**
 * Reads reportable paid requests and the first clinician-open seam. The return
 * value is aggregate-only; identifiers never cross this function boundary.
 */
export async function readAdsOperationalQueueEvidence(
  supabase: SupabaseClient,
  options: { now?: Date } = {},
): Promise<AdsOperationalQueueSnapshot> {
  const now = options.now ?? new Date()
  const nowMs = now.getTime()
  if (!Number.isFinite(nowMs)) {
    throw new Error("Ads operational queue time is invalid")
  }
  const nowIso = now.toISOString()
  const sevenDaysAgoIso = new Date(nowMs - 7 * DAY_MS).toISOString()

  const recentQuery = filterReportableIntakes(
    supabase
      .from("intakes")
      .select(OPERATIONAL_INTAKE_SELECT, { count: "exact" })
      .not("paid_at", "is", null)
      .in("payment_status", [...FULFILMENT_ENTITLED_PAYMENT_STATUSES])
      .gte("paid_at", sevenDaysAgoIso)
      .lte("paid_at", nowIso)
      .limit(MAX_OPERATIONAL_QUEUE_ROWS + 1),
  )
  const unresolvedQuery = filterReportableIntakes(
    supabase
      .from("intakes")
      .select(OPERATIONAL_INTAKE_SELECT, { count: "exact" })
      .not("paid_at", "is", null)
      .in("payment_status", [...FULFILMENT_ENTITLED_PAYMENT_STATUSES])
      .lte("paid_at", nowIso)
      .in("status", [...ACTIVE_MANUAL_REVIEW_STATUSES])
      .limit(MAX_OPERATIONAL_QUEUE_ROWS + 1),
  )
  const [recentResult, unresolvedResult] = await Promise.all([
    recentQuery as unknown as PromiseLike<OperationalIntakeQueryResult>,
    unresolvedQuery as unknown as PromiseLike<OperationalIntakeQueryResult>,
  ])
  const intakeRows = new Map<string, AdsOperationalIntakeRow>()
  for (const row of [
    ...assertCompleteOperationalRows(recentResult),
    ...assertCompleteOperationalRows(unresolvedResult),
  ]) {
    const id = row.id?.trim()
    if (!id) throw new Error("ads_operational_queue_malformed")
    if (!intakeRows.has(id)) intakeRows.set(id, row)
  }

  const intakeIds = [...intakeRows.keys()]
  const clinicianOpens: AdsClinicianOpenRow[] = []
  for (let start = 0; start < intakeIds.length; start += 200) {
    const ids = intakeIds.slice(start, start + 200)
    const result = await (supabase
      .from("compliance_audit_log")
      .select("intake_id, created_at", { count: "exact" })
      .eq("event_type", "clinician_opened_request")
      .eq("actor_role", "clinician")
      .eq("is_human_action", true)
      .in("intake_id", ids)
      .lte("created_at", nowIso)
      .order("created_at", { ascending: true })
      .limit(MAX_OPERATIONAL_QUEUE_ROWS + 1) as unknown as PromiseLike<ClinicianOpenQueryResult>)
    const rows = result.data ?? []
    if (
      result.error
      || typeof result.count !== "number"
      || result.count !== rows.length
      || clinicianOpens.length + rows.length > MAX_OPERATIONAL_QUEUE_ROWS
    ) {
      throw new Error("ads_operational_queue_audit_incomplete")
    }
    clinicianOpens.push(...rows)
  }

  return aggregateAdsOperationalQueueEvidence({
    clinicianOpens,
    intakes: [...intakeRows.values()],
    now,
  })
}
