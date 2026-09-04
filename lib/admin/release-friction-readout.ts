import "server-only"

import { randomUUID } from "node:crypto"
import { mkdir, rename, rm, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  buildUnavailableGuestAccountLinkageSnapshot,
  type GuestAccountLinkageSnapshot,
  readGuestAccountLinkageSnapshot,
  type ReleaseEvidenceAvailability,
  type ReleaseMeasurementWindow,
} from "@/lib/admin/guest-account-linkage"
import {
  buildUnavailablePostHogReleaseConversionSnapshot,
  getPostHogReleaseConversionSnapshot,
  type PostHogReleaseConversionSnapshot,
} from "@/lib/analytics/posthog-release-conversion"
import {
  buildCustomerGrowthRevenueForIntakeIds,
  type CustomerGrowthRevenueEvidence,
  readCustomerGrowthRevenueEvidence,
} from "@/lib/data/customer-growth-revenue-read"
import { getRecordedRefundCents } from "@/lib/data/net-retained-purchase-value"

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/i
const STRICT_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const UUID_VALUE_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
const SECRET_VALUE_PATTERN = /\b(?:bearer\s+|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.|sk_(?:live|test)_|service_role)/i
const SENSITIVE_EXACT_KEYS = new Set([
  "address",
  "answers",
  "body",
  "clinical",
  "dateofbirth",
  "dob",
  "email",
  "medication",
  "payload",
  "phone",
  "raw",
  "results",
  "rows",
  "token",
])
const SENSITIVE_IDENTIFIER_KEY = /^(?:id|intake_id|profile_id|auth_user_id|flow_instance_id|event_id|distinct_id)$/i
const SENSITIVE_NORMALIZED_IDENTIFIER_KEY = /^(?:intake|profile|authuser|flowinstance|event|distinct)ids?$/i
const SENSITIVE_PHI_KEY = /(?:email|phone|dob|dateofbirth|address|token)/i
const SENSITIVE_MEDICAL_KEY = /^(?:allergies|clinicalnotes?|conditions|currentdose|currentmedications|dosageinstructions|medicationform|medicationname|medicationstrength|othermedications|symptoms)$/i
const SENSITIVE_UPSTREAM_KEY = /^(?:payload|results|rows|raw.*|.*body)$/i

type ReleaseMeasurementWindowName = "7d" | "14d"

export const RELEASE_FRICTION_USAGE =
  "Usage: pnpm analytics:release-friction --release-sha=<40-hex-sha> --release-at=<canonical-utc-ready-time> --window=<7d|14d> [--support-contacts=<count>] [--output=<path>]"

interface ReleasePrescriptionCashSnapshot {
  declinedOrders: number | null
  declinesPer100Paid: number | null
  paidOrders: number | null
  refundedCents: number | null
  refundedOrders: number | null
  refundsPer100Paid: number | null
}

interface ReleaseCashSnapshot {
  asOf: string
  availability: ReleaseEvidenceAvailability
  cohortStatus: "complete" | "in_progress" | "unavailable"
  disputedCents: number | null
  disputedOrders: number | null
  from: string
  grossCents: number | null
  netCents: number | null
  observationFollowUpHours: number | null
  paidOrders: number | null
  prescription: ReleasePrescriptionCashSnapshot
  reason: string | null
  refundedCents: number | null
  refundedOrders: number | null
  refundsPer100Paid: number | null
  to: string
}

interface ReleaseFrictionPeriodSnapshot {
  availability: ReleaseEvidenceAvailability
  cash: ReleaseCashSnapshot
  guestLinkage: GuestAccountLinkageSnapshot
  posthog: PostHogReleaseConversionSnapshot
  reason: string | null
}

interface ReleaseFrictionDashboardPeriod extends ReleaseFrictionPeriodSnapshot {
  label: "Baseline · 7d" | "D+7" | "Baseline · 14d" | "D+14"
}

export interface ReleaseFrictionDashboardSnapshot {
  asOf: string
  availability: ReleaseEvidenceAvailability
  periods: ReleaseFrictionDashboardPeriod[]
  reason: string | null
  releaseAt: string | null
  releaseSha: string | null
}

interface ReleaseFrictionCliOptions {
  output?: string
  releaseAt: string
  releaseSha: string
  supportContacts?: number
  window: ReleaseMeasurementWindowName
}

export function buildUnavailableReleaseFrictionDashboardSnapshot(
  now: Date,
  reason: string,
): ReleaseFrictionDashboardSnapshot {
  return {
    asOf: now.toISOString(),
    availability: "unavailable",
    periods: [],
    reason,
    releaseAt: null,
    releaseSha: null,
  }
}

interface ReceiptInput {
  baseline: ReleaseFrictionPeriodSnapshot
  generatedAt: Date
  release: ReleaseFrictionPeriodSnapshot
  releaseAt: string
  releaseSha: string
  supportContacts?: number
  window: ReleaseMeasurementWindowName
}

function assertWindow(window: ReleaseMeasurementWindow): void {
  const from = window.from.getTime()
  const to = window.to.getTime()
  const asOf = window.asOf.getTime()
  if (![from, to, asOf].every(Number.isFinite) || from >= to) {
    throw new Error("Release measurement window is invalid")
  }
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0
    ? null
    : Math.round((numerator / denominator) * 1_000) / 10
}

function unavailablePrescriptionCash(): ReleasePrescriptionCashSnapshot {
  return {
    declinedOrders: null,
    declinesPer100Paid: null,
    paidOrders: null,
    refundedCents: null,
    refundedOrders: null,
    refundsPer100Paid: null,
  }
}

function buildUnavailableReleaseCashSnapshot(
  window: ReleaseMeasurementWindow,
  reason: string,
): ReleaseCashSnapshot {
  assertWindow(window)
  return {
    asOf: window.asOf.toISOString(),
    availability: "unavailable",
    cohortStatus: "unavailable",
    disputedCents: null,
    disputedOrders: null,
    from: window.from.toISOString(),
    grossCents: null,
    netCents: null,
    observationFollowUpHours: null,
    paidOrders: null,
    prescription: unavailablePrescriptionCash(),
    reason,
    refundedCents: null,
    refundedOrders: null,
    refundsPer100Paid: null,
    to: window.to.toISOString(),
  }
}

function cohortIntakeIds(
  evidence: CustomerGrowthRevenueEvidence,
  window: ReleaseMeasurementWindow,
): Set<string> {
  const from = window.from.getTime()
  const to = window.to.getTime()
  return new Set(evidence.paidRows.flatMap((row) => {
    const paidAt = Date.parse(row.paid_at ?? "")
    return row.id && Number.isFinite(paidAt) && paidAt >= from && paidAt < to
      ? [row.id]
      : []
  }))
}

function prescriptionCohortIntakeIds(
  evidence: CustomerGrowthRevenueEvidence,
  intakeIds: ReadonlySet<string>,
): Set<string> {
  return new Set(evidence.paidRows.flatMap((row) =>
    row.id && intakeIds.has(row.id) && row.category === "prescription"
      ? [row.id]
      : [],
  ))
}

function countPrescriptionDeclines(
  evidence: CustomerGrowthRevenueEvidence,
  intakeIds: ReadonlySet<string>,
  asOf: Date,
): number {
  const declined = new Set<string>()
  const asOfMs = asOf.getTime()
  for (const row of evidence.paidRows) {
    if (!row.id || !intakeIds.has(row.id) || row.status !== "declined") continue
    const declinedAt = Date.parse(row.declined_at ?? "")
    if (!Number.isFinite(declinedAt)) {
      throw new Error("Prescription decline evidence is incomplete")
    }
    if (declinedAt <= asOfMs) declined.add(row.id)
  }
  return declined.size
}

function followUpHours(window: ReleaseMeasurementWindow): number {
  return Math.round(
    (Math.max(window.asOf.getTime() - window.to.getTime(), 0) / HOUR_MS) * 10,
  ) / 10
}

function countOutstandingRefundOrders(
  evidence: CustomerGrowthRevenueEvidence,
  intakeIds: ReadonlySet<string>,
  asOf: Date,
): number {
  const totals = new Map<string, number>()
  const exactRefundIds = new Set<string>()
  const asOfMs = asOf.getTime()
  for (const row of evidence.refundRows) {
    if (!row.id || !intakeIds.has(row.id)) continue
    const refundedAt = Date.parse(row.refunded_at ?? "")
    if (!Number.isFinite(refundedAt) || refundedAt > asOfMs) continue
    if (row.stripe_refund_id) {
      if (exactRefundIds.has(row.stripe_refund_id)) continue
      exactRefundIds.add(row.stripe_refund_id)
    }
    const reversedAt = Date.parse(row.refund_reversed_at ?? "")
    if (Number.isFinite(reversedAt) && reversedAt <= asOfMs) continue
    const amount = getRecordedRefundCents(row)
    if (amount <= 0) continue
    totals.set(row.id, (totals.get(row.id) ?? 0) + amount)
  }
  return [...totals.values()].filter((value) => value > 0).length
}

function countOutstandingDisputeOrders(
  evidence: CustomerGrowthRevenueEvidence,
  intakeIds: ReadonlySet<string>,
  asOf: Date,
): number {
  const totals = new Map<string, { reinstated: number; withdrawn: number }>()
  const asOfMs = asOf.getTime()
  for (const row of evidence.disputeRows) {
    if (!row.intake_id || !intakeIds.has(row.intake_id)) continue
    const current = totals.get(row.intake_id) ?? { reinstated: 0, withdrawn: 0 }
    const withdrawnAt = Date.parse(row.funds_withdrawn_at ?? "")
    if (Number.isFinite(withdrawnAt) && withdrawnAt <= asOfMs) {
      current.withdrawn += Math.max(Number(row.funds_withdrawn_cents ?? 0), 0)
    }
    const reinstatedAt = Date.parse(row.funds_reinstated_at ?? "")
    if (Number.isFinite(reinstatedAt) && reinstatedAt <= asOfMs) {
      current.reinstated += Math.max(Number(row.funds_reinstated_cents ?? 0), 0)
    }
    totals.set(row.intake_id, current)
  }
  return [...totals.values()].filter(
    ({ reinstated, withdrawn }) => withdrawn - reinstated > 0,
  ).length
}

/**
 * The public cohort is half-open, while the reused revenue reducer is
 * inclusive. Membership is therefore fixed first with paid_at < cohort.to;
 * the existing reducer then observes cash movements through the independent
 * inclusive as-of cutoff for only those intake IDs.
 */
export function buildReleaseCashSnapshot(
  evidence: CustomerGrowthRevenueEvidence,
  window: ReleaseMeasurementWindow,
): ReleaseCashSnapshot {
  assertWindow(window)
  if (window.asOf.getTime() < window.to.getTime()) {
    return {
      asOf: window.asOf.toISOString(),
      availability: "degraded",
      cohortStatus: "in_progress",
      disputedCents: null,
      disputedOrders: null,
      from: window.from.toISOString(),
      grossCents: null,
      netCents: null,
      observationFollowUpHours: null,
      paidOrders: null,
      prescription: unavailablePrescriptionCash(),
      reason: "cohort_in_progress",
      refundedCents: null,
      refundedOrders: null,
      refundsPer100Paid: null,
      to: window.to.toISOString(),
    }
  }
  const intakeIds = cohortIntakeIds(evidence, window)
  const cash = buildCustomerGrowthRevenueForIntakeIds(
    evidence,
    intakeIds,
    window.from,
    window.asOf,
  )
  const refundedOrders = countOutstandingRefundOrders(evidence, intakeIds, window.asOf)
  const prescriptionIds = prescriptionCohortIntakeIds(evidence, intakeIds)
  const prescriptionCash = buildCustomerGrowthRevenueForIntakeIds(
    evidence,
    prescriptionIds,
    window.from,
    window.asOf,
  )
  const prescriptionDeclinedOrders = countPrescriptionDeclines(
    evidence,
    prescriptionIds,
    window.asOf,
  )
  const prescriptionRefundedOrders = countOutstandingRefundOrders(
    evidence,
    prescriptionIds,
    window.asOf,
  )
  return {
    asOf: window.asOf.toISOString(),
    availability: "available",
    cohortStatus: "complete",
    disputedCents: cash.disputeCents,
    disputedOrders: countOutstandingDisputeOrders(evidence, intakeIds, window.asOf),
    from: window.from.toISOString(),
    grossCents: cash.grossCents,
    netCents: cash.netCents,
    observationFollowUpHours: followUpHours(window),
    paidOrders: cash.orderCount,
    prescription: {
      declinedOrders: prescriptionDeclinedOrders,
      declinesPer100Paid: rate(
        prescriptionDeclinedOrders,
        prescriptionCash.orderCount,
      ),
      paidOrders: prescriptionCash.orderCount,
      refundedCents: prescriptionCash.refundCents,
      refundedOrders: prescriptionRefundedOrders,
      refundsPer100Paid: rate(
        prescriptionRefundedOrders,
        prescriptionCash.orderCount,
      ),
    },
    reason: null,
    refundedCents: cash.refundCents,
    refundedOrders,
    refundsPer100Paid: rate(refundedOrders, cash.orderCount),
    to: window.to.toISOString(),
  }
}

async function readReleaseCashSnapshot(
  supabase: SupabaseClient,
  window: ReleaseMeasurementWindow,
): Promise<ReleaseCashSnapshot> {
  if (window.asOf.getTime() < window.to.getTime()) {
    return buildReleaseCashSnapshot({ disputeRows: [], paidRows: [], refundRows: [] }, window)
  }
  try {
    // Revenue evidence deliberately extends through asOf so post-cohort
    // refunds, reversals, disputes, and reinstatements are not lost.
    const evidence = await readCustomerGrowthRevenueEvidence(
      supabase,
      window.from,
      window.asOf,
    )
    return buildReleaseCashSnapshot(evidence, window)
  } catch {
    return buildUnavailableReleaseCashSnapshot(window, "cash_evidence_query_failed")
  }
}

function combineReleaseEvidenceAvailability(
  sources: Array<{ availability: ReleaseEvidenceAvailability }>,
): ReleaseEvidenceAvailability {
  const usable = sources.filter((source) => source.availability !== "unavailable")
  if (usable.length === 0) return "unavailable"
  if (
    usable.length !== sources.length ||
    usable.some((source) => source.availability === "degraded")
  ) {
    return "degraded"
  }
  return "available"
}

function buildPeriod(
  cash: ReleaseCashSnapshot,
  guestLinkage: GuestAccountLinkageSnapshot,
  posthog: PostHogReleaseConversionSnapshot,
): ReleaseFrictionPeriodSnapshot {
  const availability = combineReleaseEvidenceAvailability([cash, guestLinkage, posthog])
  return {
    availability,
    cash,
    guestLinkage,
    posthog,
    reason: availability === "available"
      ? null
      : availability === "degraded"
        ? "partial_or_degraded_evidence"
        : "no_usable_evidence",
  }
}

export async function readReleaseFrictionPeriod(
  supabase: SupabaseClient | null,
  window: ReleaseMeasurementWindow,
): Promise<ReleaseFrictionPeriodSnapshot> {
  const reads = await Promise.allSettled([
    getPostHogReleaseConversionSnapshot(window),
    supabase
      ? readReleaseCashSnapshot(supabase, window)
      : Promise.resolve(buildUnavailableReleaseCashSnapshot(window, "database_not_configured")),
    supabase
      ? readGuestAccountLinkageSnapshot(supabase, window)
      : Promise.resolve(buildUnavailableGuestAccountLinkageSnapshot({
          ...window,
          reason: "database_not_configured",
        })),
  ])
  const posthog = reads[0].status === "fulfilled"
    ? reads[0].value
    : buildUnavailablePostHogReleaseConversionSnapshot(window, "posthog_read_failed")
  const cash = reads[1].status === "fulfilled"
    ? reads[1].value
    : buildUnavailableReleaseCashSnapshot(window, "cash_read_failed")
  const guestLinkage = reads[2].status === "fulfilled"
    ? reads[2].value
    : buildUnavailableGuestAccountLinkageSnapshot({
        ...window,
        reason: "guest_linkage_read_failed",
      })
  return buildPeriod(cash, guestLinkage, posthog)
}

export function buildReleaseMeasurementWindows(input: {
  asOf: Date
  releaseAt: Date
  window: ReleaseMeasurementWindowName
}): { baseline: { asOf: string; from: string; to: string }; release: { asOf: string; from: string; to: string } } {
  const days = input.window === "7d" ? 7 : 14
  const duration = days * DAY_MS
  if (!Number.isFinite(input.releaseAt.getTime()) || !Number.isFinite(input.asOf.getTime())) {
    throw new Error("Release timestamps are invalid")
  }
  if (input.releaseAt.getTime() > input.asOf.getTime()) {
    throw new Error("Release boundary cannot be in the future")
  }
  const releaseTo = input.releaseAt.getTime() + duration
  const matchedFollowUp = Math.max(input.asOf.getTime() - releaseTo, 0)
  const baselineAsOf = input.releaseAt.getTime() + matchedFollowUp
  return {
    baseline: {
      asOf: new Date(baselineAsOf).toISOString(),
      from: new Date(input.releaseAt.getTime() - duration).toISOString(),
      to: input.releaseAt.toISOString(),
    },
    release: {
      asOf: input.asOf.toISOString(),
      from: input.releaseAt.toISOString(),
      to: new Date(releaseTo).toISOString(),
    },
  }
}

export function buildReleaseDashboardWindows(input: {
  asOf: Date
  releaseAt: Date
}): Array<{
  asOf: string
  from: string
  label: ReleaseFrictionDashboardPeriod["label"]
  to: string
}> {
  const sevenDays = buildReleaseMeasurementWindows({ ...input, window: "7d" })
  const fourteenDays = buildReleaseMeasurementWindows({ ...input, window: "14d" })
  return [
    { ...sevenDays.baseline, label: "Baseline · 7d" },
    { ...sevenDays.release, label: "D+7" },
    { ...fourteenDays.baseline, label: "Baseline · 14d" },
    { ...fourteenDays.release, label: "D+14" },
  ]
}

function dateWindow(window: { asOf: string; from: string; to: string }): ReleaseMeasurementWindow {
  return {
    asOf: new Date(window.asOf),
    from: new Date(window.from),
    to: new Date(window.to),
  }
}

function configuredRelease(env: Partial<NodeJS.ProcessEnv>): {
  releaseAt: Date
  releaseSha: string
} | null {
  const releaseSha = env.INSTANTMED_RELEASE_MEASUREMENT_SHA?.trim()
  const releaseAt = env.INSTANTMED_RELEASE_MEASUREMENT_AT?.trim()
  const releaseAtMs = releaseAt ? Date.parse(releaseAt) : Number.NaN
  if (
    !releaseSha ||
    !RELEASE_SHA_PATTERN.test(releaseSha) ||
    !releaseAt ||
    !STRICT_ISO_PATTERN.test(releaseAt) ||
    !Number.isFinite(releaseAtMs) ||
    new Date(releaseAtMs).toISOString() !== releaseAt
  ) {
    return null
  }
  return { releaseAt: new Date(releaseAtMs), releaseSha: releaseSha.toLowerCase() }
}

export async function getReleaseFrictionDashboardSnapshot(
  supabase: SupabaseClient,
  options: { env?: Partial<NodeJS.ProcessEnv>; now?: Date } = {},
): Promise<ReleaseFrictionDashboardSnapshot> {
  const now = options.now ?? new Date()
  const release = configuredRelease(options.env ?? process.env)
  if (!release) {
    return buildUnavailableReleaseFrictionDashboardSnapshot(
      now,
      "release_boundary_not_configured",
    )
  }
  if (release.releaseAt.getTime() > now.getTime()) {
    return buildUnavailableReleaseFrictionDashboardSnapshot(
      now,
      "release_boundary_in_future",
    )
  }

  const dashboardWindows = buildReleaseDashboardWindows({
    asOf: now,
    releaseAt: release.releaseAt,
  })
  const periodReads = await Promise.all(
    dashboardWindows.map((window) => readReleaseFrictionPeriod(supabase, dateWindow(window))),
  )
  const periods: ReleaseFrictionDashboardPeriod[] = periodReads.map((period, index) => ({
    ...period,
    label: dashboardWindows[index].label,
  }))
  const availability = combineReleaseEvidenceAvailability(periods)
  return {
    asOf: now.toISOString(),
    availability,
    periods,
    reason: availability === "available"
      ? null
      : availability === "degraded"
        ? "partial_or_degraded_evidence"
        : "no_usable_evidence",
    releaseAt: release.releaseAt.toISOString(),
    releaseSha: release.releaseSha,
  }
}

export function parseReleaseFrictionArgs(
  args: string[],
  options: { now?: Date } = {},
): ReleaseFrictionCliOptions {
  const values = new Map<string, string>()
  const allowed = new Set([
    "release-sha",
    "release-at",
    "window",
    "support-contacts",
    "output",
  ])
  for (const arg of args) {
    const match = /^--([a-z-]+)=(.*)$/.exec(arg)
    if (!match || !allowed.has(match[1]) || values.has(match[1])) {
      throw new Error(`Invalid or duplicate argument: ${arg}`)
    }
    values.set(match[1], match[2])
  }

  const releaseSha = values.get("release-sha")
  const releaseAt = values.get("release-at")
  const window = values.get("window")
  if (!releaseSha || !RELEASE_SHA_PATTERN.test(releaseSha)) {
    throw new Error("--release-sha must be exactly 40 hexadecimal characters")
  }
  if (
    !releaseAt ||
    !STRICT_ISO_PATTERN.test(releaseAt) ||
    !Number.isFinite(Date.parse(releaseAt)) ||
    new Date(releaseAt).toISOString() !== releaseAt
  ) {
    throw new Error("--release-at must be a canonical ISO timestamp")
  }
  const now = options.now ?? new Date()
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Current timestamp is invalid")
  }
  if (Date.parse(releaseAt) > now.getTime()) {
    throw new Error("--release-at cannot be in the future")
  }
  if (window !== "7d" && window !== "14d") {
    throw new Error("--window must be 7d or 14d")
  }

  const supportValue = values.get("support-contacts")
  let supportContacts: number | undefined
  if (supportValue !== undefined) {
    if (!/^(?:0|[1-9]\d*)$/.test(supportValue)) {
      throw new Error("--support-contacts must be a non-negative integer")
    }
    supportContacts = Number(supportValue)
    if (!Number.isSafeInteger(supportContacts)) {
      throw new Error("--support-contacts must be a safe integer")
    }
  }

  const output = values.get("output")
  if (output !== undefined && (!output.trim() || output !== output.trim() || output.includes("\0"))) {
    throw new Error("--output must be a non-blank path")
  }
  return {
    ...(output === undefined ? {} : { output }),
    releaseAt,
    releaseSha: releaseSha.toLowerCase(),
    ...(supportContacts === undefined ? {} : { supportContacts }),
    window,
  }
}

export function buildReleaseFrictionReceipt(input: ReceiptInput) {
  const paidOrders = input.release.cash.paidOrders
  const hasSupport = input.supportContacts !== undefined
  const supportAvailable = hasSupport && typeof paidOrders === "number"
  const availability = combineReleaseEvidenceAvailability([
    input.baseline,
    input.release,
  ])
  const receipt = {
    asOf: input.generatedAt.toISOString(),
    availability,
    baseline: input.baseline,
    release: {
      at: input.releaseAt,
      cohort: input.release,
      sha: input.releaseSha,
    },
    reason: availability === "available"
      ? null
      : availability === "degraded"
        ? "partial_or_degraded_evidence"
        : "no_usable_evidence",
    schemaVersion: 2,
    support: {
      asOf: input.generatedAt.toISOString(),
      availability: supportAvailable ? "available" as const : "unavailable" as const,
      contacts: hasSupport ? input.supportContacts ?? null : null,
      contactsPer100PaidOrders: supportAvailable
        ? rate(input.supportContacts ?? 0, paidOrders ?? 0)
        : null,
      reason: supportAvailable
        ? null
        : hasSupport
          ? "paid_orders_unavailable"
          : "not_provided",
    },
    window: input.window,
  }
  assertAggregateReceiptSafe(receipt)
  return receipt
}

export function assertAggregateReceiptSafe(value: unknown): void {
  const visit = (current: unknown, key: string | null): void => {
    if (key !== null) {
      const normalizedKey = key.replace(/[-_]/g, "").toLowerCase()
      if (
        SENSITIVE_IDENTIFIER_KEY.test(key) ||
        SENSITIVE_NORMALIZED_IDENTIFIER_KEY.test(normalizedKey) ||
        SENSITIVE_PHI_KEY.test(normalizedKey) ||
        SENSITIVE_MEDICAL_KEY.test(normalizedKey) ||
        SENSITIVE_UPSTREAM_KEY.test(normalizedKey) ||
        SENSITIVE_EXACT_KEYS.has(normalizedKey) ||
        /(?:firstname|lastname|fullname|medicarenumber|ihinumber)/i.test(normalizedKey)
      ) {
        throw new Error(`Sensitive receipt key is prohibited: ${key}`)
      }
    }
    if (typeof current === "string") {
      if (
        EMAIL_VALUE_PATTERN.test(current) ||
        UUID_VALUE_PATTERN.test(current) ||
        SECRET_VALUE_PATTERN.test(current)
      ) {
        throw new Error("Sensitive receipt value is prohibited")
      }
      return
    }
    if (Array.isArray(current)) {
      current.forEach((entry) => visit(entry, null))
      return
    }
    if (current && typeof current === "object") {
      for (const [childKey, child] of Object.entries(current)) visit(child, childKey)
    }
  }
  visit(value, null)
}

export async function writeAggregateReceiptAtomic(
  output: string,
  value: unknown,
): Promise<void> {
  assertAggregateReceiptSafe(value)
  const outputDirectory = dirname(output)
  await mkdir(outputDirectory, { recursive: true })
  const temporaryPath = `${output}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    })
    await rename(temporaryPath, output)
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
    throw error
  }
}
