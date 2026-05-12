import "server-only"

import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Compact funnel-snapshot data for the staff dashboard.
 *
 * Source of truth is the `intakes` table (Supabase). PostHog client events
 * miss 70-80% of real purchases due to adblockers (2026-05-12 audit), and
 * Google Ads only counts ad-attributed clicks. Supabase is the only layer
 * that sees every paid intake, so funnel reporting here renders from DB.
 *
 * Seeded E2E test patient is filtered out the same way the doctor queue
 * filters it (lib/data/seeded-e2e-data.ts), so real-traffic numbers are
 * never inflated by Playwright runs.
 */

export type ConversionWindow = "24h" | "7d" | "30d" | "90d"

export interface ConversionWindowMetrics {
  /** Intakes created in the window (top of funnel). */
  started: number
  /** Intakes that opened a Stripe Checkout Session (payment_id is not null). */
  checkout_reached: number
  /** Intakes that completed payment (payment_status = 'paid'). */
  paid: number
  /** Intakes that were clinically approved (status = 'approved'). */
  approved: number
  /** Sum of amount_cents on paid intakes in the window. */
  revenue_aud_cents: number
}

export interface ConversionSnapshot {
  generatedAt: string
  windows: Record<ConversionWindow, ConversionWindowMetrics>
}

const WINDOW_HOURS: Record<ConversionWindow, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
}

const EMPTY_METRICS: ConversionWindowMetrics = {
  started: 0,
  checkout_reached: 0,
  paid: 0,
  approved: 0,
  revenue_aud_cents: 0,
}

async function getMetricsForWindow(hours: number): Promise<ConversionWindowMetrics> {
  const supabase = createServiceRoleClient()
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  // Pull every intake in the window once and reduce in JS. One query is
  // cheaper than 5 parallel COUNT round-trips, and the row volume in the
  // last 90 days is small enough (<10k) that the bandwidth cost is trivial.
  const baseQuery = supabase
    .from("intakes")
    .select("payment_id, payment_status, status, amount_cents")
    .gte("created_at", since)

  const { data, error } = await filterSeededE2EIntakes(baseQuery)

  if (error || !data) {
    return EMPTY_METRICS
  }

  let started = 0
  let checkout_reached = 0
  let paid = 0
  let approved = 0
  let revenue_aud_cents = 0

  for (const row of data) {
    started += 1
    if (row.payment_id) checkout_reached += 1
    if (row.payment_status === "paid") {
      paid += 1
      revenue_aud_cents += row.amount_cents ?? 0
    }
    if (row.status === "approved") approved += 1
  }

  return { started, checkout_reached, paid, approved, revenue_aud_cents }
}

export async function getConversionSnapshot(): Promise<ConversionSnapshot> {
  const entries = await Promise.all(
    (Object.keys(WINDOW_HOURS) as ConversionWindow[]).map(async (window) => {
      const metrics = await getMetricsForWindow(WINDOW_HOURS[window])
      return [window, metrics] as const
    }),
  )

  const windows = entries.reduce<Record<ConversionWindow, ConversionWindowMetrics>>(
    (acc, [window, metrics]) => {
      acc[window] = metrics
      return acc
    },
    { "24h": EMPTY_METRICS, "7d": EMPTY_METRICS, "30d": EMPTY_METRICS, "90d": EMPTY_METRICS },
  )

  return {
    generatedAt: new Date().toISOString(),
    windows,
  }
}

/** Conversion-rate helpers. Returns null when denominator is 0 (avoid 0% noise). */
export function pct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null
  return (numerator / denominator) * 100
}
