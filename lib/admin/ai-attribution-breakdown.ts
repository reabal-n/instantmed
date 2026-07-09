import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"

/**
 * Curated AI-engine matchers for server-side attribution counting.
 *
 * Distinct from the client `AI_REFERRER_PATTERNS` in lib/analytics/ai-referral.ts
 * (which does loose substring matching to fire live referral events). Here we
 * count persisted `intakes.utm_source` / `intakes.referrer` values, so we match
 * precise tokens and deliberately EXCLUDE ambiguous hosts ("bing", "you.com")
 * that would over-count ordinary search traffic as AI. ChatGPT appends
 * `?utm_source=chatgpt.com`, which survives the native-app referrer strip, so it
 * stays the first source checked for the ChatGPT weekly series.
 */
const AI_ENGINES: ReadonlyArray<{ token: string; label: string }> = [
  { token: "chatgpt", label: "ChatGPT" },
  { token: "openai", label: "ChatGPT" },
  { token: "perplexity", label: "Perplexity" },
  { token: "gemini", label: "Gemini" },
  { token: "copilot", label: "Copilot" },
  { token: "claude", label: "Claude" },
  { token: "poe.com", label: "Poe" },
  { token: "phind", label: "Phind" },
  { token: "meta.ai", label: "Meta AI" },
]

function classifyAiSignal(value: string | null | undefined): string | null {
  if (!value) return null
  const s = value.toLowerCase()
  for (const engine of AI_ENGINES) {
    if (s.includes(engine.token)) return engine.label
  }
  return null
}

/**
 * Map persisted attribution fields to an AI engine label, or null if not AI.
 * `utm_source` is authoritative; referrer is only a fallback for engines that
 * do not reliably append UTM parameters.
 */
export function classifyAiUtmSource(
  utmSource: string | null | undefined,
  referrer?: string | null | undefined,
): string | null {
  return classifyAiSignal(utmSource) ?? classifyAiSignal(referrer)
}

export interface AiAttributionBreakdown {
  /** Trailing window length, in weeks. */
  weeks: number
  /** AI-attributed paid orders in the window. */
  totalAiOrders: number
  /** All paid orders in the window (AI-share denominator). */
  paidTotal: number
  /** Per-engine counts over the window, ordered by count desc. */
  bySource: Array<{ label: string; count: number }>
  /** One row per week (oldest -> newest); ChatGPT and total-AI order counts. */
  weekly: Array<{ weekStart: string; chatgpt: number; ai: number }>
}

/** Monday (UTC) of the week containing `d`, matching Postgres date_trunc('week'). */
function mondayUTC(d: Date): Date {
  const day = d.getUTCDay() // 0=Sun..6=Sat
  const shift = day === 0 ? -6 : 1 - day
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + shift))
}

/**
 * AI-assistant acquisition breakdown for /admin/analytics.
 *
 * Counts paid orders by AI-engine attribution, plus a per-week ChatGPT/total-AI
 * trend so the operator can see whether GEO / off-page work is moving the only
 * measurable AI channel. DB-only; never calls an external API. Filters seeded
 * E2E + excluded-from-reporting rows (same boundary the doctor queue uses).
 */
export async function getAiAttributionBreakdown(
  supabase: SupabaseClient,
  opts: { weeks?: number } = {},
): Promise<AiAttributionBreakdown> {
  const weeks = opts.weeks ?? 8

  // Continuous list of the last `weeks` Monday week-starts (oldest -> newest), so
  // zero-order weeks still render as 0 instead of vanishing from the series.
  const thisMonday = mondayUTC(new Date())
  const weekKeys: string[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday)
    d.setUTCDate(thisMonday.getUTCDate() - i * 7)
    weekKeys.push(d.toISOString().slice(0, 10))
  }
  const emptyWeekly = () => weekKeys.map((weekStart) => ({ weekStart, chatgpt: 0, ai: 0 }))

  const since = weekKeys[0] // start of the oldest week in the window
  const { data, error } = await supabase
    .from("intakes")
    .select("utm_source, referrer, created_at, patient_id, exclude_from_reporting")
    .in("payment_status", ["paid", "partially_refunded", "refunded"])
    .gte("created_at", since)

  if (error || !data) {
    return { weeks, totalAiOrders: 0, paidTotal: 0, bySource: [], weekly: emptyWeekly() }
  }

  const live = data.filter(
    (r) => !r.exclude_from_reporting && r.patient_id !== SEEDED_E2E_PATIENT_PROFILE_ID,
  )

  const weekly = new Map(emptyWeekly().map((w) => [w.weekStart, { ...w }]))
  const sourceCounts = new Map<string, number>()

  for (const r of live) {
    const label = classifyAiUtmSource(
      typeof r.utm_source === "string" ? r.utm_source : null,
      typeof r.referrer === "string" ? r.referrer : null,
    )
    if (!label) continue
    sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1)

    const weekKey = mondayUTC(new Date(r.created_at as string)).toISOString().slice(0, 10)
    const bucket = weekly.get(weekKey)
    if (bucket) {
      bucket.ai += 1
      if (label === "ChatGPT") bucket.chatgpt += 1
    }
  }

  const bySource = [...sourceCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  const totalAiOrders = bySource.reduce((sum, s) => sum + s.count, 0)

  return {
    weeks,
    totalAiOrders,
    paidTotal: live.length,
    bySource,
    weekly: [...weekly.values()],
  }
}
