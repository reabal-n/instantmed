import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { HEARD_ABOUT_US_OPTIONS } from "@/lib/analytics/heard-about-us"
import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"

export interface HeardAboutUsBreakdown {
  /** Paid orders in the window that carry a self-reported answer. */
  answered: number
  /** All paid orders in the window (answer-rate denominator). */
  paidTotal: number
  /** Per-source counts, ordered by count desc; always one row per known option. */
  rows: Array<{ value: string; label: string; count: number }>
}

const EMPTY_ROWS = () =>
  HEARD_ABOUT_US_OPTIONS.map((o) => ({ value: o.value, label: o.label, count: 0 }))

/**
 * Self-reported "How did you hear about us?" breakdown for /admin/ops.
 *
 * Counts paid orders in the trailing window by their `heard_about_us` token,
 * filtering out seeded E2E + excluded-from-reporting rows (same boundary the
 * doctor queue uses). The answer rate is `answered / paidTotal` — it starts low
 * (the survey is forward-only and only began collecting on 2026-06-09) and
 * climbs as survey-era orders accumulate. DB-only; never calls an external API.
 */
export async function getHeardAboutUsBreakdown(
  supabase: SupabaseClient,
  opts: { days?: number } = {},
): Promise<HeardAboutUsBreakdown> {
  const days = opts.days ?? 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select("heard_about_us, patient_id, exclude_from_reporting")
    .in("payment_status", ["paid", "partially_refunded", "refunded"])
    .gte("created_at", since)

  if (error || !data) {
    return { answered: 0, paidTotal: 0, rows: EMPTY_ROWS() }
  }

  const live = data.filter(
    (r) =>
      !r.exclude_from_reporting && r.patient_id !== SEEDED_E2E_PATIENT_PROFILE_ID,
  )

  const counts = new Map<string, number>()
  for (const r of live) {
    const token = typeof r.heard_about_us === "string" ? r.heard_about_us : null
    if (token) counts.set(token, (counts.get(token) ?? 0) + 1)
  }

  const rows = HEARD_ABOUT_US_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    count: counts.get(o.value) ?? 0,
  })).sort((a, b) => b.count - a.count)

  const answered = rows.reduce((sum, r) => sum + r.count, 0)

  return { answered, paidTotal: live.length, rows }
}
