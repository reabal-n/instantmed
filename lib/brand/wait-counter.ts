/**
 * Wait-counter data source — single source of truth for the live wait device.
 *
 * The brand-rehaul spec (docs/BRAND.md §6.1) defines this as a real-data
 * device: the median time from `request_submitted` to `request_approved`
 * across the rolling 4-hour window, with graceful-degradation fallbacks.
 *
 * The displayed median is sourced from recent med-cert rows, not static
 * marketing constants. Missing/stale data degrades to neutral review copy.
 */
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { WaitState } from "./wait-counter-types"
export type { WaitState, WaitVariant } from "./wait-counter-types"
export { QUEUE_DISPLAY_CAP } from "./wait-counter-types"

const log = createLogger("wait-counter")
const RECENT_COMPLETION_WINDOW_HOURS = 24

const MED_CERT_QUEUE_STATUSES = [
  "paid",
  "in_review",
  "pending_info",
  "awaiting_script",
] as const

type CompletedMedCertRow = {
  paid_at: string | null
  approved_at: string | null
}

type QueueMedCertRow = {
  paid_at: string | null
  submitted_at: string | null
  created_at: string | null
}

/**
 * Returns the wait-counter state for hero display.
 *
 * Med certs run 24/7, so the `standby` branch never fires here.
 * Service-specific heroes can pass their own service hours when wired.
 */
export async function getWaitState(now = new Date()): Promise<WaitState> {
  try {
    const supabase = createServiceRoleClient()
    const since = new Date(now.getTime() - RECENT_COMPLETION_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

    const [completedResult, queueResult] = await Promise.all([
      supabase
        .from("intakes")
        .select("paid_at, approved_at")
        .eq("category", "medical_certificate")
        .eq("status", "approved")
        .not("paid_at", "is", null)
        .not("approved_at", "is", null)
        .gte("approved_at", since)
        .order("approved_at", { ascending: false })
        .limit(100),
      supabase
        .from("intakes")
        .select("paid_at, submitted_at, created_at")
        .eq("category", "medical_certificate")
        .eq("payment_status", "paid")
        .in("status", MED_CERT_QUEUE_STATUSES),
    ])

    if (completedResult.error || queueResult.error) {
      log.warn("Failed to load wait-counter metrics", {
        completedError: completedResult.error?.message,
        queueError: queueResult.error?.message,
      })
      return { variant: "reviewing", service: "med-cert" }
    }

    const completedRows = (completedResult.data ?? []) as CompletedMedCertRow[]
    const samples = completedRows
      .map((row) => reviewMinutes(row.paid_at, row.approved_at))
      .filter((value): value is number => typeof value === "number" && value >= 0)
    const newestApprovedAt = completedRows
      .map((row) => row.approved_at ? new Date(row.approved_at).getTime() : null)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      .sort((a, b) => b - a)[0]
    const newestSampleAgeMinutes = typeof newestApprovedAt === "number"
      ? Math.max(0, Math.round((now.getTime() - newestApprovedAt) / 60000))
      : null

    const queueRows = (queueResult.data ?? []) as QueueMedCertRow[]
    const queueWaitMinutes = queueRows
      .map((row) => queueMinutes(row, now))
      .filter((value): value is number => typeof value === "number" && value >= 0)
    const queueP95Minutes = percentile(queueWaitMinutes, 95) ?? 0

    if (samples.length === 0) {
      return queueRows.length > 0
        ? { variant: "queued", queueLength: queueRows.length, queueP95Minutes, service: "med-cert" }
        : { variant: "reviewing", service: "med-cert" }
    }

    return {
      variant: "live",
      medianMinutes: median(samples),
      sampleSize: samples.length,
      newestSampleAgeMinutes: newestSampleAgeMinutes ?? undefined,
      queueP95Minutes,
      service: "med-cert",
    }
  } catch (error) {
    log.warn("Wait-counter metrics unavailable", {
      error: error instanceof Error ? error.message : String(error),
    })
    return { variant: "reviewing", service: "med-cert" }
  }
}

function reviewMinutes(paidAt: string | null, approvedAt: string | null): number | null {
  if (!paidAt || !approvedAt) return null
  return Math.round((new Date(approvedAt).getTime() - new Date(paidAt).getTime()) / 60000)
}

function queueMinutes(row: QueueMedCertRow, now: Date): number | null {
  const timestamp = row.paid_at ?? row.submitted_at ?? row.created_at
  if (!timestamp) return null
  return Math.round((now.getTime() - new Date(timestamp).getTime()) / 60000)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return Math.round(sorted[mid])
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index]
}
