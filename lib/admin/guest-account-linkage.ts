import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_GUEST_LINKAGE_ROWS = 5_000

export type ReleaseEvidenceAvailability = "available" | "degraded" | "unavailable"
export type LinkageHorizonStatus = "available" | "pending" | "unavailable"

export interface ReleaseMeasurementWindow {
  asOf: Date
  from: Date
  to: Date
}

export interface GuestAccountLinkageReadRow {
  id: string | null
  paid_at: string | null
  patient:
    | {
        auth_user_id: string | null
        email_verified_at: string | null
      }
    | Array<{
        auth_user_id: string | null
        email_verified_at: string | null
      }>
    | null
}

export interface GuestLinkageHorizon {
  eligibleOrders: number | null
  linkedOrders: number | null
  percent: number | null
  status: LinkageHorizonStatus
}

export interface GuestAccountLinkageSnapshot {
  asOf: string
  availability: ReleaseEvidenceAvailability
  cohortStatus: "complete" | "in_progress" | "unavailable"
  eligiblePaidGuestOrders: number | null
  from: string
  currentlyLinkedOrders: number | null
  reason: string | null
  to: string
  unlinkedAtCutoffOrders: number | null
  verifiedBeforePaidAnomalies: number | null
  within24h: GuestLinkageHorizon
  within7d: GuestLinkageHorizon
  within14d: GuestLinkageHorizon
}

// guest_email is intentionally absent: it is a server-side eligibility
// predicate only and must never enter the in-memory aggregate reader.
const GUEST_LINKAGE_SELECT = [
  "id",
  "paid_at",
  "patient:profiles!intakes_patient_id_fkey(auth_user_id,email_verified_at)",
].join(", ")

function assertValidWindow(window: ReleaseMeasurementWindow): void {
  const from = window.from.getTime()
  const to = window.to.getTime()
  const asOf = window.asOf.getTime()
  if (![from, to, asOf].every(Number.isFinite) || from >= to) {
    throw new Error("Release measurement window is invalid")
  }
}

function unavailableHorizon(): GuestLinkageHorizon {
  return {
    eligibleOrders: null,
    linkedOrders: null,
    percent: null,
    status: "unavailable",
  }
}

function pendingHorizon(): GuestLinkageHorizon {
  return {
    eligibleOrders: null,
    linkedOrders: null,
    percent: null,
    status: "pending",
  }
}

export function buildUnavailableGuestAccountLinkageSnapshot({
  asOf,
  from,
  reason,
  to,
}: ReleaseMeasurementWindow & { reason: string }): GuestAccountLinkageSnapshot {
  assertValidWindow({ asOf, from, to })
  return {
    asOf: asOf.toISOString(),
    availability: "unavailable",
    cohortStatus: "unavailable",
    eligiblePaidGuestOrders: null,
    from: from.toISOString(),
    currentlyLinkedOrders: null,
    reason,
    to: to.toISOString(),
    unlinkedAtCutoffOrders: null,
    verifiedBeforePaidAnomalies: null,
    within14d: unavailableHorizon(),
    within24h: unavailableHorizon(),
    within7d: unavailableHorizon(),
  }
}

function percentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null
  return Math.round((numerator / denominator) * 1_000) / 10
}

function patientForRow(row: GuestAccountLinkageReadRow) {
  return Array.isArray(row.patient) ? (row.patient[0] ?? null) : row.patient
}

function buildHorizon(input: {
  asOfMs: number
  cohortToMs: number
  eligibleOrders: number
  horizonMs: number
  linkedDeltasMs: number[]
}): GuestLinkageHorizon {
  if (input.asOfMs < input.cohortToMs + input.horizonMs) {
    return {
      eligibleOrders: null,
      linkedOrders: null,
      percent: null,
      status: "pending",
    }
  }

  const linkedOrders = input.linkedDeltasMs.filter(
    (delta) => delta >= 0 && delta <= input.horizonMs,
  ).length
  return {
    eligibleOrders: input.eligibleOrders,
    linkedOrders,
    percent: percentage(linkedOrders, input.eligibleOrders),
    status: "available",
  }
}

/**
 * Reduces the server-only guest cohort to order-level aggregates. A current
 * profile link is not described as durable or "ever linked": profile rows can
 * subsequently be merged or closed, so this is explicitly an as-of snapshot.
 */
export function buildGuestAccountLinkageSnapshot(
  rows: GuestAccountLinkageReadRow[],
  window: ReleaseMeasurementWindow,
): GuestAccountLinkageSnapshot {
  assertValidWindow(window)
  const fromMs = window.from.getTime()
  const toMs = window.to.getTime()
  const asOfMs = window.asOf.getTime()
  if (asOfMs < toMs) {
    return {
      asOf: window.asOf.toISOString(),
      availability: "degraded",
      cohortStatus: "in_progress",
      eligiblePaidGuestOrders: null,
      from: window.from.toISOString(),
      currentlyLinkedOrders: null,
      reason: "cohort_in_progress",
      to: window.to.toISOString(),
      unlinkedAtCutoffOrders: null,
      verifiedBeforePaidAnomalies: null,
      within14d: pendingHorizon(),
      within24h: pendingHorizon(),
      within7d: pendingHorizon(),
    }
  }
  const uniqueRows = new Map<string, GuestAccountLinkageReadRow>()

  for (const row of rows) {
    const id = typeof row.id === "string" ? row.id.trim() : ""
    const paidAtMs = Date.parse(row.paid_at ?? "")
    if (!id || !Number.isFinite(paidAtMs)) {
      throw new Error("Guest linkage evidence is malformed")
    }
    if (paidAtMs < fromMs || paidAtMs >= toMs) continue
    if (!uniqueRows.has(id)) uniqueRows.set(id, row)
  }

  let currentlyLinkedOrders = 0
  let verifiedBeforePaidAnomalies = 0
  const linkedDeltasMs: number[] = []

  for (const row of uniqueRows.values()) {
    const paidAtMs = Date.parse(row.paid_at ?? "")
    const patient = patientForRow(row)
    const verifiedAtMs = Date.parse(patient?.email_verified_at ?? "")
    if (!patient?.auth_user_id || !Number.isFinite(verifiedAtMs)) continue
    const delta = verifiedAtMs - paidAtMs
    if (delta < 0) {
      verifiedBeforePaidAnomalies += 1
      continue
    }
    if (verifiedAtMs > asOfMs) continue
    currentlyLinkedOrders += 1
    linkedDeltasMs.push(delta)
  }

  const eligiblePaidGuestOrders = uniqueRows.size
  const horizonInput = {
    asOfMs,
    cohortToMs: toMs,
    eligibleOrders: eligiblePaidGuestOrders,
    linkedDeltasMs,
  }
  return {
    asOf: window.asOf.toISOString(),
    availability: "available",
    cohortStatus: "complete",
    eligiblePaidGuestOrders,
    from: window.from.toISOString(),
    currentlyLinkedOrders,
    reason: null,
    to: window.to.toISOString(),
    unlinkedAtCutoffOrders: eligiblePaidGuestOrders - currentlyLinkedOrders,
    verifiedBeforePaidAnomalies,
    within14d: buildHorizon({ ...horizonInput, horizonMs: 14 * DAY_MS }),
    within24h: buildHorizon({ ...horizonInput, horizonMs: DAY_MS }),
    within7d: buildHorizon({ ...horizonInput, horizonMs: 7 * DAY_MS }),
  }
}

type GuestLinkageQueryResult = {
  count: number | null
  data: GuestAccountLinkageReadRow[] | null
  error: { message: string } | null
}

export async function readGuestAccountLinkageSnapshot(
  supabase: SupabaseClient,
  window: ReleaseMeasurementWindow,
): Promise<GuestAccountLinkageSnapshot> {
  assertValidWindow(window)
  if (window.asOf.getTime() < window.to.getTime()) {
    return buildGuestAccountLinkageSnapshot([], window)
  }
  const fromIso = window.from.toISOString()
  const toIso = window.to.toISOString()

  try {
    const query = supabase
      .from("intakes")
      .select(GUEST_LINKAGE_SELECT, { count: "exact" })
      .in("payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES])
      .not("paid_at", "is", null)
      .not("guest_email", "is", null)
      .gte("paid_at", fromIso)
      .lt("paid_at", toIso)
      .limit(MAX_GUEST_LINKAGE_ROWS)
    const result = await (filterReportableIntakes(query) as unknown as PromiseLike<GuestLinkageQueryResult>)
    const rows = result.data ?? []
    if (
      result.error ||
      typeof result.count !== "number" ||
      result.count !== rows.length ||
      result.count > MAX_GUEST_LINKAGE_ROWS
    ) {
      return buildUnavailableGuestAccountLinkageSnapshot({
        ...window,
        reason: "guest_linkage_incomplete",
      })
    }
    return buildGuestAccountLinkageSnapshot(rows, window)
  } catch {
    return buildUnavailableGuestAccountLinkageSnapshot({
      ...window,
      reason: "guest_linkage_query_failed",
    })
  }
}
