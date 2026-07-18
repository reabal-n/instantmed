import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { buildGoogleAdsReturnSnapshot } from "@/lib/analytics/google-ads-return-summary"
import { classifyAttributionSource } from "@/lib/analytics/source-classification"
import {
  assertNoSensitiveBaselineText,
  buildCustomerGrowthBaselineSummary,
  type CustomerGrowthGoogleAdsBaseline,
  type CustomerGrowthPostHogBaseline,
  type CustomerGrowthSupabaseBaseline,
} from "@/lib/data/customer-growth-baseline"
import { buildNetRetainedPurchaseValue } from "@/lib/data/net-retained-purchase-value"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"

import { hydrateLocalEnv } from "./video-review/local-env"

const DEFAULT_OUT_DIR = "docs/reviews/2026-06-06-customer-growth-baseline"
const POSTHOG_EVENTS = [
  "intake_started",
  "checkout_viewed",
  "purchase_completed",
  "purchase_completed_server",
  "google_ads_server_conversion",
] as const
const DAY_MS = 24 * 60 * 60 * 1000

type CliOptions = {
  days: number
  outDir: string
}

type IntakeAggregateRow = {
  amount_cents: number | null
  category: string | null
  paid_at: string | null
  payment_status: string | null
  status: string | null
  subtype: string | null
}

type RefundAggregateRow = {
  refund_amount_cents: number | null
  refund_status: string | null
  refunded_at: string | null
}

type RecoveryPaidAttributionRow = {
  amount_cents: number | null
  campaignid?: string | null
  gbraid?: string | null
  gclid?: string | null
  referrer?: string | null
  refund_amount_cents: number | null
  utm_campaign?: string | null
  utm_medium?: string | null
  utm_source?: string | null
  wbraid?: string | null
}

type CountResult = {
  count: number | null
  error: { message: string } | null
}

hydrateLocalEnv([
  "CRON_SECRET",
  "INSTANTMED_INTEGRATION_BASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "POSTHOG_PROJECT_API_KEY",
  "POSTHOG_PROJECT_ID",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
])

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    days: 30,
    outDir: resolve(DEFAULT_OUT_DIR),
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === "--out-dir") options.outDir = resolve(args[i + 1] ?? options.outDir)
    if (arg === "--days") {
      const parsed = Number(args[i + 1])
      if (Number.isFinite(parsed)) options.days = Math.min(Math.max(Math.floor(parsed), 1), 90)
    }
  }

  return options
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function serviceFromIntake(row: IntakeAggregateRow): string {
  if (row.category === "medical_certificate") return "medical_certificate"
  if (row.category === "repeat_script" || row.category === "prescription") return "repeat_prescription"
  if (row.category === "consult" && row.subtype === "ed") return "ed"
  if (row.category === "consult" && row.subtype === "hair_loss") return "hair_loss"
  if (row.category === "consult") return "consult"
  return row.category || "unknown"
}

async function countQuery(label: string, query: PromiseLike<CountResult>): Promise<number> {
  const result = await query
  if (result.error) throw new Error(`${label} count failed: ${result.error.message}`)
  return result.count ?? 0
}

async function querySupabaseBaseline(
  supabase: SupabaseClient,
  now: Date,
  days: number,
): Promise<CustomerGrowthSupabaseBaseline> {
  const since = new Date(now.getTime() - days * DAY_MS)
  const sinceIso = since.toISOString()
  const nowIso = now.toISOString()

  const [createdResult, paidResult, refundResult] = await Promise.all([
    filterReportableIntakes(
      supabase
        .from("intakes")
        .select("category, subtype, status, payment_status, paid_at, amount_cents")
        .gte("created_at", sinceIso)
        .lte("created_at", nowIso),
    ),
    filterReportableIntakes(
      supabase
        .from("intakes")
        .select("category, subtype, status, payment_status, paid_at, amount_cents")
        .in("payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES])
        .not("paid_at", "is", null)
        .gte("paid_at", sinceIso)
        .lte("paid_at", nowIso),
    ),
    filterReportableIntakes(
      supabase
        .from("intakes")
        .select("refund_amount_cents, refund_status, refunded_at")
        .not("refunded_at", "is", null)
        .gte("refunded_at", sinceIso)
        .lte("refunded_at", nowIso),
    ),
  ])
  if (createdResult.error) {
    throw new Error(`Supabase intake baseline query failed: ${createdResult.error.message}`)
  }
  if (paidResult.error) {
    throw new Error(`Supabase paid revenue query failed: ${paidResult.error.message}`)
  }
  if (refundResult.error) {
    throw new Error(`Supabase refund revenue query failed: ${refundResult.error.message}`)
  }

  const intakes = (createdResult.data ?? []) as IntakeAggregateRow[]
  const paidRows = (paidResult.data ?? []) as IntakeAggregateRow[]
  const refundRows = (refundResult.data ?? []) as RefundAggregateRow[]
  const revenue = buildNetRetainedPurchaseValue({
    paidRows,
    refundRows,
    since,
    until: now,
  })
  // Saved-intake demand is a created-at cohort. Revenue and paid-order volume
  // are event-window metrics, so they come from the canonical paid-at read.
  const byService = new Map<string, { grossRevenueCents: number; intakes: number; paid: number }>()

  for (const row of intakes) {
    const service = serviceFromIntake(row)
    const bucket = byService.get(service) ?? { grossRevenueCents: 0, intakes: 0, paid: 0 }
    bucket.intakes += 1
    byService.set(service, bucket)
  }
  for (const row of paidRows) {
    const service = serviceFromIntake(row)
    const bucket = byService.get(service) ?? { grossRevenueCents: 0, intakes: 0, paid: 0 }
    bucket.paid += 1
    bucket.grossRevenueCents += Number(row.amount_cents ?? 0)
    byService.set(service, bucket)
  }

  const [
    partialsCaptured,
    emailCaptured,
    convertedPartials,
    partialRecoveryRowsSent,
    abandonedCheckoutSent,
    recoveredPaidRows,
  ] = await Promise.all([
    countQuery(
      "partial_intakes captured",
      supabase
        .from("partial_intakes")
        .select("session_id", { count: "exact", head: true })
        .gte("updated_at", sinceIso)
        .lte("updated_at", nowIso),
    ),
    countQuery(
      "partial_intakes email captured",
      supabase
        .from("partial_intakes")
        .select("session_id", { count: "exact", head: true })
        .gte("updated_at", sinceIso)
        .lte("updated_at", nowIso)
        .not("email", "is", null),
    ),
    countQuery(
      "partial_intakes converted",
      supabase
        .from("partial_intakes")
        .select("session_id", { count: "exact", head: true })
        .gte("updated_at", sinceIso)
        .lte("updated_at", nowIso)
        .not("converted_to_intake_id", "is", null),
    ),
    countQuery(
      "partial_intakes recovery marked sent",
      supabase
        .from("partial_intakes")
        .select("session_id", { count: "exact", head: true })
        .gte("updated_at", sinceIso)
        .lte("updated_at", nowIso)
        .not("recovery_email_sent_at", "is", null),
    ),
    countQuery(
      "abandoned checkout outbox sent",
      supabase
        .from("email_outbox")
        .select("email_type", { count: "exact", head: true })
        .in("email_type", ["abandoned_checkout", "abandoned_checkout_followup"])
        .in("status", ["sent", "skipped_e2e"])
        .gte("created_at", sinceIso)
        .lte("created_at", nowIso),
    ),
    queryRecoveredPaidRows(supabase, sinceIso, nowIso),
  ])

  const recoveredGrossCents = recoveredPaidRows.reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0)
  const recoveredRefundedCents = recoveredPaidRows.reduce((sum, row) => sum + Number(row.refund_amount_cents ?? 0), 0)
  const partialRecoverySent = partialRecoveryRowsSent

  return {
    dateFrom: sinceIso,
    dateTo: nowIso,
    days,
    intakes: {
      averageOrderValueAud:
        revenue.averageOrderCents === null
          ? null
          : roundMoney(revenue.averageOrderCents / 100),
      byService: Array.from(byService.entries())
        .map(([service, bucket]) => ({
          grossRevenueAud: roundMoney(bucket.grossRevenueCents / 100),
          intakes: bucket.intakes,
          paid: bucket.paid,
          service,
        }))
        .sort((a, b) => b.grossRevenueAud - a.grossRevenueAud),
      grossRevenueAud: roundMoney(revenue.grossCents / 100),
      intakes: intakes.length,
      netRevenueAud: roundMoney(revenue.netCents / 100),
      paid: revenue.orderCount,
      paidRate: roundRate(revenue.orderCount, intakes.length),
      refundedAud: roundMoney(revenue.refundCents / 100),
    },
    recovery: {
      abandonedCheckoutSent,
      convertedPartials,
      emailCaptured,
      emailCaptureRate: roundRate(emailCaptured, partialsCaptured),
      partialRecoverySent,
      partialsCaptured,
      recoveredGrossRevenueAud: roundMoney(recoveredGrossCents / 100),
      recoveredNetRevenueAud: roundMoney((recoveredGrossCents - recoveredRefundedCents) / 100),
      recoveredPaidCount: recoveredPaidRows.length,
      recoveryEmailCoverageRate: roundRate(partialRecoverySent, emailCaptured),
    },
  }
}

async function queryRecoveredPaidRows(
  supabase: SupabaseClient,
  sinceIso: string,
  nowIso: string,
): Promise<RecoveryPaidAttributionRow[]> {
  const { data, error } = await filterReportableIntakes(
    supabase
      .from("intakes")
      .select("amount_cents, refund_amount_cents, utm_source, utm_medium, utm_campaign, referrer, gclid, gbraid, wbraid, campaignid")
      .in("payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES])
      .not("paid_at", "is", null)
      .gte("paid_at", sinceIso)
      .lte("paid_at", nowIso),
  )
  if (error) throw new Error(`Recovered paid query failed: ${error.message}`)

  return ((data ?? []) as RecoveryPaidAttributionRow[]).filter((row) => classifyAttributionSource(row).group === "recovery_email")
}

async function queryPostHogBaseline(now: Date, days: number): Promise<CustomerGrowthPostHogBaseline> {
  const apiKey = process.env.POSTHOG_PROJECT_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  if (!apiKey || !projectId) {
    return {
      days,
      reason: "POSTHOG_PROJECT_API_KEY or POSTHOG_PROJECT_ID missing",
      skipped: true,
    }
  }

  const since = new Date(now.getTime() - days * DAY_MS)
  const eventList = POSTHOG_EVENTS.map((event) => `'${event.replace(/'/g, "''")}'`).join(", ")
  const host = normalizePostHogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com")
  const hogql = `
    SELECT event, count() AS count
    FROM events
    WHERE timestamp >= toDateTime('${since.toISOString()}')
      AND timestamp <= toDateTime('${now.toISOString()}')
      AND event IN (${eventList})
      AND (properties.is_e2e IS NULL OR properties.is_e2e != true)
    GROUP BY event
    ORDER BY count DESC
  `

  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `InstantMed customer growth baseline ${days}d`,
      query: {
        kind: "HogQLQuery",
        query: hogql,
      },
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    return {
      days,
      ok: false,
      reason: `PostHog query returned ${response.status}`,
      status: response.status,
    }
  }

  const payload = (await response.json().catch(() => ({}))) as { results?: unknown[][] }
  const counts = new Map<string, number>()
  for (const row of payload.results ?? []) {
    const [event, count] = row
    if (typeof event === "string") counts.set(event, Math.round(Number(count ?? 0)))
  }

  return {
    dateFrom: since.toISOString(),
    dateTo: now.toISOString(),
    days,
    events: POSTHOG_EVENTS.map((event) => ({
      count: counts.get(event) ?? 0,
      event,
    })),
    ok: true,
    status: response.status,
  }
}

function normalizePostHogHost(host: string): string {
  if (host.includes("us.i.posthog.com")) return "https://us.posthog.com"
  return host.replace(/\/$/, "")
}

function integrationBaseUrl(): string {
  return (
    process.env.INSTANTMED_INTEGRATION_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://instantmed.com.au"
  ).replace(/\/$/, "")
}

async function queryGoogleAdsBaseline(days: number): Promise<CustomerGrowthGoogleAdsBaseline> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return {
      ok: false,
      reason: "CRON_SECRET missing; protected Google Ads endpoint not called",
      skipped: true,
      source: "protected-endpoint",
    }
  }

  const url = new URL("/api/internal/google-ads-report", integrationBaseUrl())
  url.searchParams.set("days", String(days))

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  })
  const payload = (await response.json().catch(() => null)) as {
    report?: Parameters<typeof buildGoogleAdsReturnSnapshot>[0]
    success?: boolean
  } | null

  if (!response.ok || !payload?.report) {
    return {
      ok: false,
      reason: `Protected Google Ads endpoint returned ${response.status}`,
      source: "protected-endpoint",
      status: response.status,
    }
  }

  const adsReturn = buildGoogleAdsReturnSnapshot(payload.report)
  return {
    ok: Boolean(payload.success),
    source: "protected-endpoint",
    status: response.status,
    summary: {
      clicks: adsReturn.summary.totalClicks,
      localCacAud: adsReturn.summary.costPerLocalOrderAud,
      localNetRevenueAud: adsReturn.summary.localNetRevenueAud,
      localOrders: adsReturn.summary.localOrders,
      localRoas: adsReturn.summary.localRoas,
      spendAud: adsReturn.summary.spendAud,
    },
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const text = `${JSON.stringify(value, null, 2)}\n`
  assertNoSensitiveBaselineText(text)
  await writeFile(path, text, "utf8")
}

async function writeText(path: string, value: string): Promise<void> {
  assertNoSensitiveBaselineText(value)
  await writeFile(path, value, "utf8")
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const dataDir = join(options.outDir, "data")
  const now = new Date()
  await mkdir(dataDir, { recursive: true })

  const supabase = createSupabaseClient()
  const [supabase30d, posthog30d, googleAds30d] = await Promise.all([
    querySupabaseBaseline(supabase, now, options.days),
    queryPostHogBaseline(now, options.days),
    queryGoogleAdsBaseline(options.days),
  ])

  const summary = buildCustomerGrowthBaselineSummary({
    generatedAt: now.toISOString(),
    googleAds30d,
    posthog30d,
    supabase30d,
  })

  await Promise.all([
    writeJson(join(dataDir, "supabase-funnel-30d.json"), supabase30d),
    writeJson(join(dataDir, "posthog-30d.json"), posthog30d),
    writeJson(join(dataDir, "google-ads-30d.json"), googleAds30d),
    writeText(join(options.outDir, "summary.md"), summary),
  ])

  process.stdout.write(`[customer-growth-baseline] wrote ${options.outDir}\n`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`[customer-growth-baseline] ${message}\n`)
  process.exitCode = 1
})
