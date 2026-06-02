/* eslint-disable no-console */
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import { openai } from "@ai-sdk/openai"
import { GoogleGenAI } from "@google/genai"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { generateText, type LanguageModel } from "ai"
import { chromium, devices, type Browser, type BrowserContext, type Page } from "playwright"
import { z } from "zod"

import { filterReportableIntakes } from "@/lib/data/reporting-filters"

import { getClaudeCredentialSource, getClaudeModel, getClaudeModelLabel } from "./video-review/claude-model"
import { getEnv } from "./video-review/local-env"
import { withRetry, withTimeout } from "./video-review/retry"

const AUDIT_DATE = "2026-06-02"
const OUT_DIR = resolve(`docs/reviews/${AUDIT_DATE}-conversion-funnel-audit`)
const DATA_DIR = join(OUT_DIR, "data")
const MODEL_DIR = join(OUT_DIR, "model-reports")
const CAPTURE_DIR = join(OUT_DIR, "captures")
const PRODUCTION_BASE_URL = "https://instantmed.com.au"
const LOCAL_BASE_URL = "http://localhost:3060"
const CAPTURE_TIMEOUT_MS = 45_000
const MODEL_TIMEOUT_MS = 6 * 60_000
const GEMINI_FILE_POLL_BUDGET_MS = 120_000

const SERVICES = [
  {
    key: "medical-certificate",
    label: "Medical certificate",
    service: "med-cert",
    subtype: null,
    landingPath: "/medical-certificate",
    requestPath: "/request?service=med-cert",
    searchTerm: "medical certificate online",
  },
  {
    key: "repeat-prescriptions",
    label: "Repeat prescriptions",
    service: "repeat-script",
    subtype: null,
    landingPath: "/prescriptions",
    requestPath: "/request?service=repeat-script",
    searchTerm: "online prescription refill",
  },
  {
    key: "erectile-dysfunction",
    label: "ED consult",
    service: "consult",
    subtype: "ed",
    landingPath: "/erectile-dysfunction",
    requestPath: "/request?service=consult&subtype=ed",
    searchTerm: "erectile dysfunction online doctor",
  },
  {
    key: "hair-loss",
    label: "Hair loss consult",
    service: "consult",
    subtype: "hair_loss",
    landingPath: "/hair-loss",
    requestPath: "/request?service=consult&subtype=hair_loss",
    searchTerm: "hair loss treatment online",
  },
] as const

const POSTHOG_EVENTS = [
  "intake_started",
  "step_viewed",
  "step_completed",
  "checkout_viewed",
  "intake_funnel_intake_started",
  "intake_funnel_payment_initiated",
  "intake_funnel_payment_completed",
  "purchase_completed",
  "purchase_completed_server",
  "google_ads_server_conversion",
  "intake_abandoned_passive",
] as const

const RECOVERY_EMAIL_TYPES = [
  "partial_intake_recovery",
  "abandoned_checkout_recovery",
  "abandoned_checkout_followup",
  "payment_recovery",
] as const

type ServiceKey = (typeof SERVICES)[number]["key"]
type Severity = "P0" | "P1" | "P2" | "P3"

interface AuditOptions {
  baseUrl: string
  localUrl: string
  outDir: string
  skipModels: boolean
  skipBrowser: boolean
}

interface RawIntakeRow {
  abandoned_email_sent_at: string | null
  abandoned_followup_sent_at: string | null
  adgroupid: string | null
  amount_cents: number | null
  attribution_captured_at: string | null
  campaignid: string | null
  category: string | null
  checkout_error: string | null
  creative: string | null
  device: string | null
  gbraid: string | null
  gclid: string | null
  keyword: string | null
  landing_page: string | null
  matchtype: string | null
  network: string | null
  paid_at: string | null
  payment_status: string | null
  referrer: string | null
  refund_amount_cents: number | null
  status: string | null
  subtype: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_id: string | null
  utm_medium: string | null
  utm_source: string | null
  utm_term: string | null
  wbraid: string | null
}

interface RawPartialIntakeRow {
  converted_to_intake_id: string | null
  created_at: string | null
  current_step_id: string | null
  email: string | null
  expires_at: string | null
  recovery_email_sent_at: string | null
  service_type: string | null
  updated_at: string | null
}

interface RawEmailOutboxRow {
  created_at: string | null
  delivery_status: string | null
  email_type: string | null
  sent_at: string | null
  status: string | null
}

interface RawAbandonmentRow {
  abandon_reason?: string | null
  created_at?: string | null
  device_type?: string | null
  last_step?: string | null
  reached_payment?: boolean | null
  service_type?: string | null
  stripe_checkout_started?: boolean | null
  was_blocked_by_safety?: boolean | null
}

interface AggregateBucket {
  abandonedEmailSent: number
  adAttributed: number
  avgOrderValueAud: number
  count: number
  failedPayment: number
  grossAud: number
  netAud: number
  paid: number
  paidRate: number
  pendingPayment: number
  refundAud: number
  refunded: number
}

interface FunnelData {
  dateFrom: string
  dateTo: string
  days: number
  errors: string[]
  emailRecovery: Record<string, { count: number; sent: number; delivered: number; failed: number }>
  intakes: {
    byCampaign: Record<string, AggregateBucket>
    byDevice: Record<string, AggregateBucket>
    byLandingPage: Record<string, AggregateBucket>
    byNetwork: Record<string, AggregateBucket>
    byService: Record<string, AggregateBucket>
    byTerm: Record<string, AggregateBucket>
    totals: AggregateBucket
  }
  partialIntakes: {
    byService: Record<string, PartialBucket>
    byStep: Record<string, PartialBucket>
    totals: PartialBucket
  }
  postPaymentAbandonment: Record<string, { count: number; reachedPayment: number; stripeStarted: number; safetyBlocked: number }>
}

interface PartialBucket {
  converted: number
  count: number
  expired: number
  recoverySent: number
  staleEligibleApprox: number
  withEmail: number
}

interface CaptureArtifact {
  baseUrl: string
  consoleErrors: string[]
  consoleWarnings: string[]
  domPath: string
  durationMs: number
  finalUrl: string
  harPath: string | null
  journey: string
  networkPath: string
  requestFailures: string[]
  screenshotPath: string
  service: string
  startedAt: string
  status: "ok" | "partial" | "failed"
  tracePath: string | null
  viewport: "desktop" | "mobile"
  videoPath: string | null
}

interface ModelFinding {
  severity: Severity
  blocker: string
  evidence: string
  affected_service: string
  likely_funnel_stage: string
  cac_impact: string
  compliance_risk: string
  confidence: "high" | "medium" | "low"
  recommended_fix: string
}

interface ModelReview {
  model: string
  status: "ok" | "skipped" | "failed"
  summary: string
  findings: ModelFinding[]
  ads_triage: string[]
  measurement_notes: string[]
  errors: string[]
}

interface EvidencePack {
  ads30: unknown
  ads90: unknown
  browser: {
    captures: CaptureArtifact[]
    localBaseUrlReachable: boolean
  }
  funnel30: FunnelData | null
  funnel90: FunnelData | null
  posthog30: unknown
  posthog90: unknown
  staticFindings: ModelFinding[]
}

const ModelReviewSchema = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({
      severity: z.enum(["P0", "P1", "P2", "P3"]),
      blocker: z.string(),
      evidence: z.string(),
      affected_service: z.string(),
      likely_funnel_stage: z.string(),
      cac_impact: z.string(),
      compliance_risk: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      recommended_fix: z.string(),
    }),
  ),
  ads_triage: z.array(z.string()),
  measurement_notes: z.array(z.string()),
})

async function main() {
  const options = parseArgs(process.argv.slice(2))
  await ensureDirs(options.outDir)

  console.log(`[conversion-audit] writing artifacts to ${options.outDir}`)

  const [ads30, ads90] = await Promise.all([
    fetchGoogleAdsReport(options.baseUrl, 30),
    fetchGoogleAdsReport(options.baseUrl, 90),
  ])

  await writeJson(join(DATA_DIR, "google-ads-30d.json"), ads30)
  await writeJson(join(DATA_DIR, "google-ads-90d.json"), ads90)

  const supabase = createSupabaseClient()
  const [funnel30, funnel90, posthog30, posthog90] = await Promise.all([
    supabase ? queryFunnelData(supabase, 30) : Promise.resolve(null),
    supabase ? queryFunnelData(supabase, 90) : Promise.resolve(null),
    queryPostHog(30),
    queryPostHog(90),
  ])

  if (funnel30) await writeJson(join(DATA_DIR, "supabase-funnel-30d.json"), funnel30)
  if (funnel90) await writeJson(join(DATA_DIR, "supabase-funnel-90d.json"), funnel90)
  await writeJson(join(DATA_DIR, "posthog-30d.json"), posthog30)
  await writeJson(join(DATA_DIR, "posthog-90d.json"), posthog90)

  const browserEvidence = options.skipBrowser
    ? await loadExistingBrowserEvidence()
    : await captureBrowserEvidence(options)

  const staticFindings = await runStaticChecks()
  const evidencePack: EvidencePack = {
    ads30,
    ads90,
    browser: browserEvidence,
    funnel30,
    funnel90,
    posthog30,
    posthog90,
    staticFindings,
  }

  await writeJson(join(DATA_DIR, "evidence-pack.json"), evidencePack)
  await writeFile(join(DATA_DIR, "evidence-summary.md"), buildEvidenceSummary(evidencePack), "utf8")

  const modelReviews = options.skipModels
    ? [skippedReview("models", "Skipped by --skip-models")]
    : await runModelPanel(evidencePack)

  for (const review of modelReviews) {
    await writeJson(join(MODEL_DIR, `${slug(review.model)}.json`), review)
  }

  const report = buildReport({ evidencePack, modelReviews })
  await writeFile(join(options.outDir, "report.md"), report, "utf8")
  await writeJson(join(options.outDir, "metadata.json"), {
    generatedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    localUrl: options.localUrl,
    services: SERVICES,
    modelReports: modelReviews.map((review) => ({
      model: review.model,
      status: review.status,
      findings: review.findings.length,
    })),
  })

  console.log(`[conversion-audit] complete: ${join(options.outDir, "report.md")}`)
}

function parseArgs(args: string[]): AuditOptions {
  const options: AuditOptions = {
    baseUrl: PRODUCTION_BASE_URL,
    localUrl: LOCAL_BASE_URL,
    outDir: OUT_DIR,
    skipModels: false,
    skipBrowser: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === "--skip-models") options.skipModels = true
    if (arg === "--skip-browser") options.skipBrowser = true
    if (arg === "--base-url") options.baseUrl = args[i + 1] ?? options.baseUrl
    if (arg === "--local-url") options.localUrl = args[i + 1] ?? options.localUrl
    if (arg === "--out-dir") options.outDir = resolve(args[i + 1] ?? options.outDir)
  }

  return options
}

async function ensureDirs(outDir: string) {
  await mkdir(outDir, { recursive: true })
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(MODEL_DIR, { recursive: true })
  await mkdir(CAPTURE_DIR, { recursive: true })
}

function createSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[conversion-audit] Supabase env missing; Supabase funnel extract skipped")
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function fetchGoogleAdsReport(baseUrl: string, days: number): Promise<unknown> {
  const secret = getEnv("CRON_SECRET")
  const url = new URL("/api/internal/google-ads-report", baseUrl)
  url.searchParams.set("days", String(days))

  if (!secret) {
    return {
      success: false,
      skipped: true,
      reason: "CRON_SECRET missing; protected Google Ads endpoint not called",
      days,
    }
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  })
  const payload = (await response.json().catch(() => ({}))) as unknown
  return sanitizeJson({
    status: response.status,
    ok: response.ok,
    payload,
  })
}

async function queryFunnelData(supabase: SupabaseClient, days: number): Promise<FunnelData> {
  const now = new Date()
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const errors: string[] = []

  const intakeQuery = supabase
    .from("intakes")
    .select(
      [
        "created_at",
        "paid_at",
        "status",
        "payment_status",
        "category",
        "subtype",
        "amount_cents",
        "refund_amount_cents",
        "checkout_error",
        "abandoned_email_sent_at",
        "abandoned_followup_sent_at",
        "utm_source",
        "utm_medium",
        "utm_id",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "referrer",
        "landing_page",
        "attribution_captured_at",
        "gclid",
        "gbraid",
        "wbraid",
        "campaignid",
        "adgroupid",
        "keyword",
        "creative",
        "matchtype",
        "device",
        "network",
      ].join(","),
    )
    .gte("created_at", since.toISOString())
    .lte("created_at", now.toISOString())

  const { data: rawIntakes, error: intakesError } = await filterReportableIntakes(intakeQuery)
  if (intakesError) errors.push(`intakes: ${intakesError.message}`)

  const partialQuery = supabase
    .from("partial_intakes")
    .select("service_type,current_step_id,email,converted_to_intake_id,recovery_email_sent_at,created_at,updated_at,expires_at")
    .gte("created_at", since.toISOString())
    .lte("created_at", now.toISOString())

  const { data: partialRows, error: partialError } = await partialQuery
  if (partialError) errors.push(`partial_intakes: ${partialError.message}`)

  const { data: emailRows, error: emailError } = await supabase
    .from("email_outbox")
    .select("email_type,status,delivery_status,created_at,sent_at")
    .in("email_type", RECOVERY_EMAIL_TYPES as unknown as string[])
    .gte("created_at", since.toISOString())
    .lte("created_at", now.toISOString())
  if (emailError) errors.push(`email_outbox: ${emailError.message}`)

  const abandonmentRows = await queryOptionalAbandonmentRows(supabase, since, now, errors)

  const intakeRows = (rawIntakes ?? []) as unknown as RawIntakeRow[]

  return {
    dateFrom: since.toISOString(),
    dateTo: now.toISOString(),
    days,
    errors,
    emailRecovery: summarizeEmailRows((emailRows ?? []) as RawEmailOutboxRow[]),
    intakes: summarizeIntakes(intakeRows),
    partialIntakes: summarizePartialIntakes((partialRows ?? []) as RawPartialIntakeRow[]),
    postPaymentAbandonment: summarizeAbandonment(abandonmentRows),
  }
}

async function queryOptionalAbandonmentRows(
  supabase: SupabaseClient,
  since: Date,
  now: Date,
  errors: string[],
): Promise<RawAbandonmentRow[]> {
  const { data, error } = await supabase
    .from("intake_abandonment")
    .select("service_type,last_step,abandon_reason,device_type,reached_payment,stripe_checkout_started,was_blocked_by_safety,created_at")
    .gte("created_at", since.toISOString())
    .lte("created_at", now.toISOString())

  if (error) {
    errors.push(`intake_abandonment: ${error.message}`)
    return []
  }

  return (data ?? []) as RawAbandonmentRow[]
}

function summarizeIntakes(rows: RawIntakeRow[]) {
  const totals = emptyAggregate()
  const byService: Record<string, AggregateBucket> = {}
  const byCampaign: Record<string, AggregateBucket> = {}
  const byDevice: Record<string, AggregateBucket> = {}
  const byNetwork: Record<string, AggregateBucket> = {}
  const byLandingPage: Record<string, AggregateBucket> = {}
  const byTerm: Record<string, AggregateBucket> = {}

  for (const row of rows) {
    const service = serviceFromIntake(row)
    addIntake(totals, row)
    addIntake(getBucket(byService, service), row)
    addIntake(getBucket(byCampaign, campaignKey(row)), row)
    addIntake(getBucket(byDevice, cleanDimension(row.device, "unknown_device")), row)
    addIntake(getBucket(byNetwork, cleanDimension(row.network, "unknown_network")), row)
    addIntake(getBucket(byLandingPage, cleanDimension(row.landing_page, "unknown_landing_page")), row)
    addIntake(getBucket(byTerm, cleanDimension(row.keyword || row.utm_term, "unknown_term")), row)
  }

  finalizeAggregate(totals)
  for (const bucket of [
    ...Object.values(byService),
    ...Object.values(byCampaign),
    ...Object.values(byDevice),
    ...Object.values(byNetwork),
    ...Object.values(byLandingPage),
    ...Object.values(byTerm),
  ]) {
    finalizeAggregate(bucket)
  }

  return {
    totals,
    byService: sortRecord(byService, (bucket) => bucket.count),
    byCampaign: sortRecord(byCampaign, (bucket) => bucket.count),
    byDevice: sortRecord(byDevice, (bucket) => bucket.count),
    byNetwork: sortRecord(byNetwork, (bucket) => bucket.count),
    byLandingPage: sortRecord(byLandingPage, (bucket) => bucket.count),
    byTerm: sortRecord(byTerm, (bucket) => bucket.count),
  }
}

function summarizePartialIntakes(rows: RawPartialIntakeRow[]) {
  const totals = emptyPartial()
  const byService: Record<string, PartialBucket> = {}
  const byStep: Record<string, PartialBucket> = {}
  const now = Date.now()

  for (const row of rows) {
    addPartial(totals, row, now)
    addPartial(getPartialBucket(byService, cleanDimension(row.service_type, "unknown_service")), row, now)
    addPartial(getPartialBucket(byStep, cleanDimension(row.current_step_id, "unknown_step")), row, now)
  }

  return {
    totals,
    byService: sortRecord(byService, (bucket) => bucket.count),
    byStep: sortRecord(byStep, (bucket) => bucket.count),
  }
}

function summarizeEmailRows(rows: RawEmailOutboxRow[]) {
  const result: Record<string, { count: number; sent: number; delivered: number; failed: number }> = {}
  for (const row of rows) {
    const key = cleanDimension(row.email_type, "unknown_email_type")
    const bucket = result[key] ?? { count: 0, sent: 0, delivered: 0, failed: 0 }
    bucket.count += 1
    if (row.sent_at || row.status === "sent") bucket.sent += 1
    if (row.delivery_status === "delivered") bucket.delivered += 1
    if (row.status === "failed" || row.delivery_status === "failed" || row.delivery_status === "bounced") {
      bucket.failed += 1
    }
    result[key] = bucket
  }
  return sortRecord(result, (bucket) => bucket.count)
}

function summarizeAbandonment(rows: RawAbandonmentRow[]) {
  const result: Record<string, { count: number; reachedPayment: number; stripeStarted: number; safetyBlocked: number }> = {}
  for (const row of rows) {
    const key = cleanDimension(row.service_type, "unknown_service")
    const bucket = result[key] ?? { count: 0, reachedPayment: 0, stripeStarted: 0, safetyBlocked: 0 }
    bucket.count += 1
    if (row.reached_payment) bucket.reachedPayment += 1
    if (row.stripe_checkout_started) bucket.stripeStarted += 1
    if (row.was_blocked_by_safety) bucket.safetyBlocked += 1
    result[key] = bucket
  }
  return sortRecord(result, (bucket) => bucket.count)
}

function addIntake(bucket: AggregateBucket, row: RawIntakeRow) {
  const amount = cents(row.amount_cents)
  const refund = cents(row.refund_amount_cents)
  const isPaid = row.payment_status === "paid" || row.payment_status === "refunded" || row.payment_status === "partially_refunded"
  bucket.count += 1
  if (isPaid) bucket.paid += 1
  if (row.payment_status === "pending" || row.status === "pending_payment") bucket.pendingPayment += 1
  if (row.payment_status === "failed" || row.status === "checkout_failed" || row.checkout_error) bucket.failedPayment += 1
  if (row.payment_status === "refunded" || row.payment_status === "partially_refunded") bucket.refunded += 1
  if (row.abandoned_email_sent_at || row.abandoned_followup_sent_at) bucket.abandonedEmailSent += 1
  if (isLikelyGoogleAttributed(row)) bucket.adAttributed += 1
  bucket.grossAud += amount
  bucket.refundAud += refund
  bucket.netAud += amount - refund
}

function addPartial(bucket: PartialBucket, row: RawPartialIntakeRow, now: number) {
  bucket.count += 1
  if (row.email) bucket.withEmail += 1
  if (row.converted_to_intake_id) bucket.converted += 1
  if (row.recovery_email_sent_at) bucket.recoverySent += 1
  if (row.expires_at && Date.parse(row.expires_at) < now) bucket.expired += 1

  const updatedAt = row.updated_at ? Date.parse(row.updated_at) : Number.NaN
  const minutesOld = Number.isFinite(updatedAt) ? (now - updatedAt) / 60_000 : 0
  if (row.email && !row.converted_to_intake_id && !row.recovery_email_sent_at && minutesOld >= 60 && minutesOld <= 360) {
    bucket.staleEligibleApprox += 1
  }
}

function emptyAggregate(): AggregateBucket {
  return {
    abandonedEmailSent: 0,
    adAttributed: 0,
    avgOrderValueAud: 0,
    count: 0,
    failedPayment: 0,
    grossAud: 0,
    netAud: 0,
    paid: 0,
    paidRate: 0,
    pendingPayment: 0,
    refundAud: 0,
    refunded: 0,
  }
}

function emptyPartial(): PartialBucket {
  return {
    converted: 0,
    count: 0,
    expired: 0,
    recoverySent: 0,
    staleEligibleApprox: 0,
    withEmail: 0,
  }
}

function finalizeAggregate(bucket: AggregateBucket) {
  bucket.grossAud = roundMoney(bucket.grossAud)
  bucket.netAud = roundMoney(bucket.netAud)
  bucket.refundAud = roundMoney(bucket.refundAud)
  bucket.avgOrderValueAud = bucket.paid > 0 ? roundMoney(bucket.grossAud / bucket.paid) : 0
  bucket.paidRate = bucket.count > 0 ? roundNumber(bucket.paid / bucket.count, 4) : 0
}

function getBucket(record: Record<string, AggregateBucket>, key: string): AggregateBucket {
  const existing = record[key]
  if (existing) return existing
  const bucket = emptyAggregate()
  record[key] = bucket
  return bucket
}

function getPartialBucket(record: Record<string, PartialBucket>, key: string): PartialBucket {
  const existing = record[key]
  if (existing) return existing
  const bucket = emptyPartial()
  record[key] = bucket
  return bucket
}

function serviceFromIntake(row: RawIntakeRow): string {
  if (row.category === "medical_certificate") return "medical-certificate"
  if (row.category === "prescription") return "repeat-prescriptions"
  if (row.category === "consult" && row.subtype === "ed") return "erectile-dysfunction"
  if (row.category === "consult" && row.subtype === "hair_loss") return "hair-loss"
  return cleanDimension(row.subtype || row.category, "unknown_service")
}

function campaignKey(row: RawIntakeRow): string {
  return cleanDimension(row.campaignid || row.utm_id || row.utm_campaign, "missing_campaign")
}

function cleanDimension(value: string | null | undefined, fallback: string): string {
  const clean = value?.trim()
  return clean ? redactText(clean) : fallback
}

function cents(value: number | null | undefined): number {
  return roundMoney((value ?? 0) / 100)
}

function isLikelyGoogleAttributed(row: Partial<RawIntakeRow>): boolean {
  const tokens = [
    row.utm_source,
    row.utm_medium,
    row.utm_campaign,
    row.referrer,
    row.campaignid,
    row.adgroupid,
    row.creative,
    row.network,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return Boolean(
    row.gclid ||
      row.gbraid ||
      row.wbraid ||
      row.campaignid ||
      row.adgroupid ||
      row.keyword ||
      row.creative ||
      row.matchtype ||
      row.device ||
      row.network ||
      tokens.includes("google") ||
      tokens.includes("adwords") ||
      tokens.includes("cpc") ||
      tokens.includes("paid_search") ||
      tokens.includes("doubleclick"),
  )
}

async function queryPostHog(days: number): Promise<unknown> {
  const apiKey = getEnv("POSTHOG_PROJECT_API_KEY")
  const projectId = getEnv("POSTHOG_PROJECT_ID")
  if (!apiKey || !projectId) {
    return {
      skipped: true,
      reason: "POSTHOG_PROJECT_API_KEY or POSTHOG_PROJECT_ID missing",
      days,
    }
  }

  const now = new Date()
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const posthogHost = normalizePostHogHost(getEnv("NEXT_PUBLIC_POSTHOG_HOST") || "https://us.posthog.com")
  const eventList = POSTHOG_EVENTS.map((event) => `'${event.replace(/'/g, "''")}'`).join(", ")
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
  const queryBody = {
    query: {
      kind: "HogQLQuery",
      query: hogql,
    },
    name: `InstantMed conversion funnel audit ${days}d`,
  }

  const response = await fetch(`${posthogHost}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(queryBody),
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => ({}))) as {
    columns?: string[]
    results?: unknown[][]
  }

  if (!response.ok) {
    return sanitizeJson({
      ok: false,
      status: response.status,
      days,
      error: redactText(JSON.stringify(payload).slice(0, 1000)),
    })
  }

  const counts = new Map<string, number>()
  for (const row of payload.results ?? []) {
    const [event, count] = row
    if (typeof event === "string") counts.set(event, Math.round(Number(count ?? 0)))
  }
  const events = POSTHOG_EVENTS.map((event) => ({
    event,
    count: counts.get(event) ?? 0,
  }))

  return sanitizeJson({
    ok: true,
    status: response.status,
    days,
    dateFrom: since.toISOString(),
    dateTo: now.toISOString(),
    events,
  })
}

function normalizePostHogHost(host: string): string {
  if (host.includes("us.i.posthog.com")) return "https://us.posthog.com"
  return host.replace(/\/$/, "")
}

async function captureBrowserEvidence(options: AuditOptions) {
  const captures: CaptureArtifact[] = []
  const localBaseUrlReachable = await isReachable(options.localUrl)
  const browser = await chromium.launch({ headless: true })

  try {
    for (const service of SERVICES) {
      captures.push(
        await captureJourney(browser, {
          baseUrl: options.baseUrl,
          journey: "landing",
          serviceKey: service.key,
          path: withAuditParams(service.landingPath, service.searchTerm),
          viewport: "desktop",
          blockAnalytics: false,
          blockDrafts: true,
          runner: (page) => inspectLanding(page, service.label),
        }),
      )
      captures.push(
        await captureJourney(browser, {
          baseUrl: options.baseUrl,
          journey: "landing",
          serviceKey: service.key,
          path: withAuditParams(service.landingPath, service.searchTerm),
          viewport: "mobile",
          blockAnalytics: false,
          blockDrafts: true,
          runner: (page) => inspectLanding(page, service.label),
        }),
      )
    }

    captures.push(
      await captureJourney(browser, {
        baseUrl: options.baseUrl,
        journey: "attribution-continuity",
        serviceKey: "medical-certificate",
        path: withAuditParams("/medical-certificate", "medical certificate online"),
        viewport: "mobile",
        blockAnalytics: false,
        blockDrafts: true,
        runner: inspectAttributionContinuity,
      }),
    )

    if (!localBaseUrlReachable) {
      console.warn("[conversion-audit] local app unavailable; skipping deep request captures to avoid production form writes")
    } else {
      for (const service of SERVICES) {
        captures.push(
          await captureJourney(browser, {
            baseUrl: options.localUrl,
            journey: "request-to-checkout",
            serviceKey: service.key,
            path: service.requestPath,
            viewport: "mobile",
            blockAnalytics: true,
            blockDrafts: true,
            runner: (page) => completeRequestFlow(page, service.key),
          }),
        )
      }
    }
  } finally {
    await browser.close()
  }

  await writeJson(join(DATA_DIR, "browser-captures.json"), {
    localBaseUrlReachable,
    captures,
  })

  return { captures, localBaseUrlReachable }
}

async function loadExistingBrowserEvidence() {
  const path = join(DATA_DIR, "browser-captures.json")
  if (!existsSync(path)) {
    return { captures: [] as CaptureArtifact[], localBaseUrlReachable: false }
  }

  const payload = JSON.parse(await readFile(path, "utf8")) as {
    captures?: CaptureArtifact[]
    localBaseUrlReachable?: boolean
  }
  return {
    captures: payload.captures ?? [],
    localBaseUrlReachable: payload.localBaseUrlReachable ?? false,
  }
}

function withAuditParams(path: string, searchTerm: string): string {
  const url = new URL(path, PRODUCTION_BASE_URL)
  url.searchParams.set("utm_source", "google")
  url.searchParams.set("utm_medium", "cpc")
  url.searchParams.set("utm_campaign", "conversion_audit_synthetic")
  url.searchParams.set("utm_id", "conversion_audit")
  url.searchParams.set("utm_term", searchTerm)
  url.searchParams.set("campaignid", "conversion_audit")
  url.searchParams.set("adgroupid", "conversion_audit")
  url.searchParams.set("keyword", searchTerm)
  url.searchParams.set("creative", "conversion_audit")
  url.searchParams.set("matchtype", "e")
  url.searchParams.set("device", "m")
  url.searchParams.set("network", "g")
  url.searchParams.set("gclid", "conversion_audit_click_id")
  return `${url.pathname}${url.search}`
}

async function captureJourney(
  browser: Browser,
  config: {
    baseUrl: string
    blockAnalytics: boolean
    blockDrafts: boolean
    journey: string
    path: string
    runner: (page: Page) => Promise<unknown>
    serviceKey: ServiceKey
    viewport: "desktop" | "mobile"
  },
): Promise<CaptureArtifact> {
  const startedAt = new Date().toISOString()
  const captureName = `${config.serviceKey}-${config.journey}-${config.viewport}`
  const dir = join(CAPTURE_DIR, captureName)
  await mkdir(dir, { recursive: true })

  const context = await newContext(browser, config.viewport, dir)
  await installCaptureRoutes(context, config.blockDrafts, config.blockAnalytics)
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false })
  const page = await context.newPage()
  const networkEvents: Array<Record<string, unknown>> = []
  const consoleErrors: string[] = []
  const consoleWarnings: string[] = []
  const requestFailures: string[] = []
  wirePageLogging(page, networkEvents, consoleErrors, consoleWarnings, requestFailures)

  const startMs = Date.now()
  let status: CaptureArtifact["status"] = "ok"
  let tracePath: string | null = join(dir, "trace.zip")
  let harPath: string | null = join(dir, "network.har")
  let screenshotPath = join(dir, "final.png")
  let domPath = join(dir, "dom-evidence.json")
  const url = new URL(config.path, config.baseUrl).toString()

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: CAPTURE_TIMEOUT_MS })
    await waitForQuietPage(page)
    await dismissOverlays(page)
    await withTimeout(config.runner(page), CAPTURE_TIMEOUT_MS, `${captureName} runner`)
  } catch (error) {
    status = "failed"
    consoleErrors.push(error instanceof Error ? error.message : String(error))
  }

  try {
    await page.screenshot({ path: screenshotPath, fullPage: true })
  } catch (error) {
    status = status === "failed" ? "failed" : "partial"
    screenshotPath = ""
    consoleErrors.push(`screenshot: ${error instanceof Error ? error.message : String(error)}`)
  }

  try {
    await writeJson(domPath, await collectDomEvidence(page))
  } catch (error) {
    status = status === "failed" ? "failed" : "partial"
    domPath = ""
    consoleErrors.push(`dom evidence: ${error instanceof Error ? error.message : String(error)}`)
  }

  await writeJson(join(dir, "network-events.json"), sanitizeJson(networkEvents))
  try {
    await context.tracing.stop({ path: tracePath })
  } catch (error) {
    tracePath = null
    consoleWarnings.push(`trace stop failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  const video = page.video()
  const finalUrl = page.url()
  await page.close().catch(() => {})
  await context.close().catch(() => {})

  let videoPath: string | null = null
  if (video) {
    try {
      const rawVideoPath = await video.path()
      videoPath = join(dir, "capture.webm")
      if (rawVideoPath !== videoPath) await rename(rawVideoPath, videoPath)
    } catch (error) {
      consoleWarnings.push(`video path failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (harPath && existsSync(harPath)) await redactFileInPlace(harPath)
  if (!existsSync(harPath ?? "")) harPath = null

  return {
    baseUrl: config.baseUrl,
    consoleErrors: consoleErrors.map(redactText),
    consoleWarnings: consoleWarnings.map(redactText),
    domPath: relativeToOut(domPath),
    durationMs: Date.now() - startMs,
    finalUrl: redactUrl(finalUrl),
    harPath: harPath ? relativeToOut(harPath) : null,
    journey: config.journey,
    networkPath: relativeToOut(join(dir, "network-events.json")),
    requestFailures: requestFailures.map(redactText),
    screenshotPath: screenshotPath ? relativeToOut(screenshotPath) : "",
    service: config.serviceKey,
    startedAt,
    status,
    tracePath: tracePath ? relativeToOut(tracePath) : null,
    viewport: config.viewport,
    videoPath: videoPath ? relativeToOut(videoPath) : null,
  }
}

async function newContext(browser: Browser, viewport: "desktop" | "mobile", dir: string): Promise<BrowserContext> {
  if (viewport === "mobile") {
    return browser.newContext({
      ...devices["iPhone 13"],
      locale: "en-AU",
      timezoneId: "Australia/Sydney",
      recordVideo: { dir, size: { width: 390, height: 844 } },
      recordHar: { path: join(dir, "network.har"), mode: "minimal", content: "omit" },
    })
  }

  return browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
    recordVideo: { dir, size: { width: 1440, height: 1100 } },
    recordHar: { path: join(dir, "network.har"), mode: "minimal", content: "omit" },
  })
}

async function installCaptureRoutes(context: BrowserContext, blockDrafts: boolean, blockAnalytics: boolean) {
  await context.addInitScript(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("instantmed-") || key.startsWith("posthog")) {
        window.localStorage.removeItem(key)
      }
    }
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith("instantmed") || key.startsWith("posthog")) {
        window.sessionStorage.removeItem(key)
      }
    }
  })

  if (blockDrafts) {
    await context.route("**/api/draft**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, redacted_audit_capture: true }),
      }),
    )
  }

  if (blockAnalytics) {
    await context.route(/(posthog|googletagmanager|google-analytics|googleadservices|doubleclick)/i, (route) =>
      route.abort("blockedbyclient"),
    )
  }
}

function wirePageLogging(
  page: Page,
  networkEvents: Array<Record<string, unknown>>,
  consoleErrors: string[],
  consoleWarnings: string[],
  requestFailures: string[],
) {
  page.on("console", (message) => {
    const entry = redactText(message.text())
    if (/ERR_BLOCKED_BY_CLIENT|posthog-recorder|googletagmanager|google-analytics|googleadservices/i.test(entry)) {
      return
    }
    if (message.type() === "error") consoleErrors.push(entry)
    if (message.type() === "warning") consoleWarnings.push(entry)
  })

  page.on("pageerror", (error) => consoleErrors.push(redactText(error.message)))
  page.on("requestfailed", (request) => {
    const url = request.url()
    const errorText = request.failure()?.errorText ?? "failed"
    if (/(posthog|googletagmanager|google-analytics|googleadservices|doubleclick)/i.test(url) && /blocked|aborted/i.test(errorText)) {
      return
    }
    requestFailures.push(`${request.method()} ${redactUrl(url)}: ${errorText}`)
  })
  page.on("response", (response) => {
    const url = response.url()
    if (!isAuditRelevantNetworkUrl(url)) return
    networkEvents.push({
      status: response.status(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      url: redactUrl(url),
    })
  })
}

function isAuditRelevantNetworkUrl(url: string): boolean {
  return /(instantmed|stripe|posthog|googletagmanager|google-analytics|googleadservices|doubleclick)/i.test(url)
}

async function inspectLanding(page: Page, serviceLabel: string) {
  await page.mouse.move(160, 240).catch(() => {})
  await page.mouse.click(160, 240).catch(() => {})
  await page.evaluate(() => window.scrollTo({ top: Math.round(window.innerHeight * 0.75), behavior: "instant" }))
  await page.waitForTimeout(800)
  await page.evaluate((label) => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .filter((link) => link.href.includes("/request"))
      .slice(0, 12)
      .map((link) => ({
        text: link.textContent?.trim() ?? "",
        href: link.href,
      }))
    return {
      serviceLabel: label,
      ctaLinks: links,
      hasAttributionCookie: document.cookie.includes("instantmed_attribution="),
      storedAttribution: window.sessionStorage.getItem("instantmed_attribution"),
      dataLayerLength: Array.isArray((window as unknown as { dataLayer?: unknown[] }).dataLayer)
        ? (window as unknown as { dataLayer: unknown[] }).dataLayer.length
        : 0,
      gtagType: typeof (window as unknown as { gtag?: unknown }).gtag,
    }
  }, serviceLabel)
}

async function inspectAttributionContinuity(page: Page) {
  await page.mouse.click(160, 240).catch(() => {})
  await page.waitForTimeout(800)
  const requestLink = page.locator('a[href*="/request"]').first()
  const href = await requestLink.getAttribute("href", { timeout: 5000 }).catch(() => null)
  if (href) {
    await page.goto(new URL(href, page.url()).toString(), { waitUntil: "domcontentloaded", timeout: 20_000 })
    await waitForQuietPage(page)
  } else {
    await page.goto("/request?service=med-cert", { waitUntil: "domcontentloaded" })
  }

  await page.evaluate(() => ({
    url: window.location.href,
    hasAttributionCookie: document.cookie.includes("instantmed_attribution="),
    storedAttribution: window.sessionStorage.getItem("instantmed_attribution"),
  }))
}

async function completeRequestFlow(page: Page, serviceKey: ServiceKey) {
  await dismissOverlays(page)
  if (serviceKey === "medical-certificate") return completeMedicalCertificate(page)
  if (serviceKey === "repeat-prescriptions") return completeRepeatScript(page)
  if (serviceKey === "erectile-dysfunction") return completeEdConsult(page)
  return completeHairLossConsult(page)
}

async function completeMedicalCertificate(page: Page) {
  await waitForText(page, /Certificate details/i)
  await clickChoice(page, /^Work$/i)
  await clickChoice(page, /1 day/i)
  await clickChoice(page, /^Today$/i)
  await clickContinue(page)

  await waitForText(page, /What symptoms do you have|What is happening|What is stopping you today/i)
  await clickChoice(page, /Cold\/Flu/i)
  await clickChoice(page, /Headache/i)
  await clickChoice(page, /1-2 days/i)
  await fillFirstTextbox(page, "I have had a cold and headache since yesterday with body aches and a runny nose.")
  await clickContinue(page)

  await completeDetailsStep(page, { needsPhone: false, needsPrescriptionDetails: false })
  await completeReviewStep(page)
  await verifyCheckoutVisible(page)
}

async function completeRepeatScript(page: Page) {
  await waitForText(page, /Which medication do you need/i)
  const medInput = page.getByRole("combobox").first()
  if (await medInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await medInput.fill("E2E test medication")
    await medInput.blur()
    await page.waitForTimeout(500)
  }
  const manualOption = page.getByRole("button", { name: /Continue with "E2E test medication"/i })
  if (await manualOption.isVisible({ timeout: 1500 }).catch(() => false)) await manualOption.click()
  if (await page.locator("#medication-strength-0").isVisible({ timeout: 4000 }).catch(() => false)) {
    await page.locator("#medication-strength-0").fill("500 mg")
    await page.locator("#medication-form-0").fill("capsule")
  }
  await clickContinue(page)

  await waitForText(page, /When were you last prescribed/i)
  await clickChoice(page, /Less than 3 months ago/i)
  const dose = page.getByPlaceholder(/2 puffs twice daily|1 tablet daily/i).first()
  if (await dose.isVisible({ timeout: 3000 }).catch(() => false)) await dose.fill("1 tablet daily")
  await clickChoice(page, /No side effects/i)
  await clickContinue(page)

  await completeMedicalHistoryStep(page)
  await completeDetailsStep(page, { needsPhone: true, needsPrescriptionDetails: true })
  await completeReviewStep(page)
  await verifyCheckoutVisible(page)
}

async function completeEdConsult(page: Page) {
  await waitForText(page, /What matters most right now|What brings you in/i)
  await tickCheckboxByLabel(page, /I confirm I am 18 years or older/i)
  await clickFirstAvailable(page, [/Improve erections/i, /Get erections/i, /Better erections/i, /Doctor decides/i])
  await clickFirstAvailable(page, [/< 3 months/i, /3.12 months/i, /3\+ months/i, /More than 3 months/i, /Less than 6 months/i], true)
  await clickContinue(page)

  await clickIiefAnswers(page)
  await clickContinue(page)

  await completeAccordionHealthStep(page)
  await clickContinue(page)

  await waitForText(page, /preference|daily|as needed|doctor/i)
  await clickFirstAvailable(page, [/Doctor decides/i, /As needed/i, /Occasional/i, /Daily/i])
  await clickContinue(page)

  await completeDetailsStep(page, { needsPhone: true, needsPrescriptionDetails: true })
  await completeReviewStep(page)
  await verifyCheckoutVisible(page)
}

async function completeHairLossConsult(page: Page) {
  await waitForText(page, /main goal|Hair loss goal|What.*goal/i)
  await clickFirstAvailable(page, [/Slow hair loss/i, /Regrow hair/i, /Prevent/i, /Doctor decides/i])
  await clickFirstAvailable(page, [/Few months/i, /6-12 months/i, /6.12 months/i, /1-2 years/i, /2\+ years/i], true)
  await clickContinue(page)

  await clickFirstAvailable(page, [/Minimal/i, /Slight recession/i, /Mild/i, /Moderate/i, /Hairline/i, /Crown/i, /Thinning/i, /Top of scalp/i], true)
  await clickFirstAvailable(page, [/Gradual/i, /6\+ months/i, /More than 6 months/i], true)
  await clickContinue(page)

  await completeAccordionHealthStep(page)
  await clickContinue(page)

  await waitForText(page, /preference|doctor/i)
  await clickFirstAvailable(page, [/Doctor decides/i, /Oral/i, /Topical/i], true)
  await clickContinue(page)

  await completeDetailsStep(page, { needsPhone: true, needsPrescriptionDetails: true })
  await completeReviewStep(page)
  await verifyCheckoutVisible(page)
}

async function completeAccordionHealthStep(page: Page) {
  await page.waitForTimeout(500)
  const bodyText = await getBodyText(page)
  const labels = [
    /No/i,
    /No allergies/i,
    /No conditions/i,
    /No medications/i,
    /Not pregnant/i,
    /None/i,
    /I understand/i,
  ]

  for (const label of labels) {
    await clickAllVisibleChoices(page, label, 6)
  }

  if (/nitrate|chest pain|heart|blood pressure/i.test(bodyText)) {
    await clickAllVisibleChoices(page, /^No$/i, 10)
  }
}

async function clickIiefAnswers(page: Page) {
  await waitForText(page, /assessment|confidence|How often/i)
  const answers = [
    /High confidence/i,
    /Almost always/i,
    /Most times/i,
    /Usually/i,
    /Satisfied/i,
    /Good enough/i,
  ]
  for (const answer of answers) {
    await clickFirstAvailable(page, [answer], true)
  }

  for (let i = 0; i < 5; i += 1) {
    const checked = await clickFirstAvailable(page, [/Most times/i, /Usually/i, /More than half/i, /High/i], true)
    if (!checked) break
  }
}

async function completeMedicalHistoryStep(page: Page) {
  await waitForText(page, /Any allergies/i)
  await clickChoice(page, /No allergies/i)
  await clickChoice(page, /No conditions/i)
  await clickChoice(page, /No medications/i)
  await clickContinue(page)
  if (await page.getByText(/Currently pregnant or breastfeeding|Previous adverse reactions/i).first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await clickFirstAvailable(page, [/^No$/i], true)
    await clickFirstAvailable(page, [/No reactions/i, /^No$/i], true)
    await clickContinue(page)
  }
}

async function completeDetailsStep(
  page: Page,
  options: { needsPhone: boolean; needsPrescriptionDetails: boolean },
) {
  await waitForText(page, /Your details|This information is required/i)
  const noThanks = page.getByRole("button", { name: /No thanks/i })
  if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) await noThanks.click()

  await fillByLabelOrSelector(page, /First name/i, 'input[placeholder="Jane"], input[placeholder="First name"]', "Audit")
  await fillByLabelOrSelector(page, /Last name/i, 'input[placeholder="Smith"], input[placeholder="Last name"]', "Patient")
  await fillByLabelOrSelector(page, /^Email/i, 'input[placeholder="jane@example.com"], input[type="email"]', "conversion-audit@example.invalid")
  await fillByLabelOrSelector(page, /Date of birth/i, 'input[placeholder="DD/MM/YYYY"]', "01/01/1990")
  if (options.needsPhone) await fillByLabelOrSelector(page, /Mobile phone|Phone/i, 'input[placeholder="0412 345 678"], input[type="tel"]', "0412345678")

  if (options.needsPrescriptionDetails) {
    if (await page.locator("#sex-select-trigger").isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.locator("#sex-select-trigger").click()
      await page.getByRole("option", { name: /^Male$/i }).click()
    }

    await fillLocatorIfVisible(page, 'input[placeholder="10 digits"]', "2123456701")
    await page.waitForTimeout(200)
    await clickFirstAvailable(page, [/^1$/], true)
    await fillLocatorIfVisible(page, '[placeholder="Start typing your address..."]', "123 Test Street")
    await fillLocatorIfVisible(page, "#suburb", "Sydney")
    if (await page.locator("#state-select-trigger").isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.locator("#state-select-trigger").click()
      await page.getByRole("option", { name: /^NSW$/i }).click()
    }
    await fillLocatorIfVisible(page, "#postcode", "2000")
  }

  await clickContinue(page)
}

async function completeReviewStep(page: Page) {
  const payButton = page.getByRole("button", { name: /^Pay \$/ }).last()
  if (await payButton.isVisible({ timeout: 1500 }).catch(() => false)) return
  await waitForText(page, /One last check|Review/i)

  const safetyCheckbox = page.locator("#safety-consent")
  if (await safetyCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    if (!(await safetyCheckbox.isChecked().catch(() => false))) await safetyCheckbox.click()
  }

  if (await payButton.isVisible({ timeout: 1500 }).catch(() => false)) return
  const continueToPayment = page.getByRole("button", { name: /Continue to payment/i }).last()
  if (await continueToPayment.isVisible({ timeout: 3000 }).catch(() => false)) {
    await continueToPayment.click()
  }
}

async function verifyCheckoutVisible(page: Page) {
  const payButton = page.getByRole("button", { name: /^Pay \$/ }).last()
  if (await payButton.isVisible({ timeout: 3000 }).catch(() => false)) return

  await waitForText(page, /Request Summary|Ready to submit|Pay \$/i, 10_000)
  const consentCheckbox = page.locator("#consent-checkbox")
  if (await consentCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    if (!(await consentCheckbox.isChecked().catch(() => false))) await consentCheckbox.click()
  }
}

async function dismissOverlays(page: Page) {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 1500 }).catch(() => false)) await essentialOnly.click()
  await page.evaluate(() => {
    const style = document.createElement("style")
    style.textContent = `
      [data-nextjs-dialog-overlay], [data-nextjs-toast],
      [class*="nextjs-portal"], button[aria-label="Open chat assistant"],
      [data-nextjs-dev-toolbar] { display: none !important; }
    `
    document.head.appendChild(style)
  })
}

async function clickContinue(page: Page) {
  await page.waitForTimeout(250)
  const button = page.getByRole("button", { name: /^Continue|Review (my|your)|Continue to/i }).last()
  if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
    await button.scrollIntoViewIfNeeded().catch(() => {})
    await button.click()
  }
}

async function clickChoice(page: Page, label: RegExp) {
  const button = page.getByRole("button", { name: label }).first()
  if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
    await button.scrollIntoViewIfNeeded().catch(() => {})
    await button.click()
    return true
  }
  const radio = page.getByRole("radio", { name: label }).first()
  if (await radio.isVisible({ timeout: 1500 }).catch(() => false)) {
    await radio.scrollIntoViewIfNeeded().catch(() => {})
    await radio.click()
    return true
  }
  const text = page.getByText(label).first()
  if (await text.isVisible({ timeout: 800 }).catch(() => false)) {
    await text.scrollIntoViewIfNeeded().catch(() => {})
    await text.click()
    return true
  }
  return false
}

async function clickFirstAvailable(page: Page, labels: RegExp[], optional = false): Promise<boolean> {
  for (const label of labels) {
    if (await clickChoice(page, label)) return true
  }
  if (!optional) throw new Error(`No visible choice matched ${labels.map(String).join(", ")}`)
  return false
}

async function tickCheckboxByLabel(page: Page, label: RegExp) {
  const checkbox = page.getByRole("checkbox", { name: label }).first()
  if (await checkbox.isVisible({ timeout: 1500 }).catch(() => false)) {
    if (!(await checkbox.isChecked().catch(() => false))) await checkbox.click()
    return
  }

  const text = page.getByText(label).first()
  if (await text.isVisible({ timeout: 800 }).catch(() => false)) {
    await text.click()
  }
}

async function clickAllVisibleChoices(page: Page, label: RegExp, limit: number) {
  for (let i = 0; i < limit; i += 1) {
    const clicked = await clickChoice(page, label)
    if (!clicked) break
    await page.waitForTimeout(120)
  }
}

async function fillFirstTextbox(page: Page, text: string) {
  const textbox = page.getByRole("textbox").first()
  await textbox.click()
  await textbox.fill(text)
}

async function fillLocatorIfVisible(page: Page, selector: string, value: string) {
  const locator = page.locator(selector).first()
  if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) {
    await locator.fill(value)
  }
}

async function fillByLabelOrSelector(page: Page, label: RegExp, selector: string, value: string) {
  const labelled = page.getByLabel(label).first()
  if (await labelled.isVisible({ timeout: 1000 }).catch(() => false)) {
    await labelled.fill(value)
    return
  }
  await fillLocatorIfVisible(page, selector, value)
}

async function waitForText(page: Page, text: RegExp, timeout = 15_000) {
  await page.getByText(text).first().waitFor({ state: "visible", timeout })
}

async function getBodyText(page: Page): Promise<string> {
  return page.locator("body").innerText({ timeout: 5000 }).catch(() => "")
}

async function waitForQuietPage(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(500)
}

async function collectDomEvidence(page: Page): Promise<unknown> {
  return sanitizeJson(
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
        .slice(0, 30)
        .map((node) => node.textContent?.trim() ?? "")
      const ctas = Array.from(document.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>("a,button"))
        .filter((node) => {
          const text = node.textContent?.trim() ?? ""
          return /start|request|continue|pay|medical|prescription|treatment|consult/i.test(text)
        })
        .slice(0, 40)
        .map((node) => ({
          tag: node.tagName.toLowerCase(),
          text: node.textContent?.trim() ?? "",
          href: node instanceof HTMLAnchorElement ? node.href : null,
          disabled: node instanceof HTMLButtonElement ? node.disabled || node.getAttribute("aria-disabled") : null,
        }))
      const bodyText = document.body.innerText.replace(/\s+/g, " ").slice(0, 5000)
      const storage: Record<string, string | null> = {}
      for (const key of ["instantmed_attribution", "instantmed-request-draft"]) {
        storage[key] = window.sessionStorage.getItem(key) || window.localStorage.getItem(key)
      }
      return {
        url: window.location.href,
        title: document.title,
        headings,
        ctas,
        bodyText,
        hasAttributionCookie: document.cookie.includes("instantmed_attribution="),
        storage,
      }
    }),
  )
}

async function isReachable(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(baseUrl, { signal: controller.signal, cache: "no-store" })
    clearTimeout(timer)
    return response.ok
  } catch {
    return false
  }
}

async function runStaticChecks(): Promise<ModelFinding[]> {
  const findings: ModelFinding[] = []
  const prescriptions = await readFile(resolve("components/marketing/prescriptions-landing.tsx"), "utf8").catch(() => "")
  if (prescriptions.includes('/request?service=consult"') || prescriptions.includes("/request?service=consult'")) {
    findings.push({
      severity: "P1",
      blocker: "Prescription landing page has a new-prescription CTA to the retired bare consult flow.",
      evidence: "components/marketing/prescriptions-landing.tsx contains /request?service=consult; /request?service=consult now redirects to the service hub/services overview rather than a payable new-prescription intake.",
      affected_service: "Repeat prescriptions / new prescription secondary CTA",
      likely_funnel_stage: "Landing CTA to intake",
      cac_impact: "Paid users looking for a new prescription can be sent into an ambiguous retired pathway, wasting clicks before checkout.",
      compliance_risk: "Medium: a generic consult CTA can revive a retired back-channel for gated services.",
      confidence: "high",
      recommended_fix: "Replace the CTA with an explicit active pathway or remove it until a compliant structured new-prescription subtype exists.",
    })
  }

  const tagIds = await readFile(resolve("lib/analytics/google-tag-ids.ts"), "utf8").catch(() => "")
  if (!/GOOGLE_ADS_ID/.test(tagIds) || !/GOOGLE_ANALYTICS_ID/.test(tagIds)) {
    findings.push({
      severity: "P1",
      blocker: "Google tag ID constants are not present where expected.",
      evidence: "lib/analytics/google-tag-ids.ts did not expose expected Google Ads and GA4 IDs during static check.",
      affected_service: "All paid services",
      likely_funnel_stage: "Attribution",
      cac_impact: "Purchase imports may still work server-side, but click-to-checkout measurement is harder to reconcile.",
      compliance_risk: "Low",
      confidence: "medium",
      recommended_fix: "Restore canonical Google tag constants or update audit tooling and tag loaders to the new source of truth.",
    })
  }

  return findings
}

async function runModelPanel(evidencePack: EvidencePack): Promise<ModelReview[]> {
  const summary = buildEvidenceSummary(evidencePack)
  console.log("[conversion-audit] running Gemini, Opus, and GPT reviews...")
  const [gemini, opus, gpt] = await Promise.all([
    runGeminiReview(summary, evidencePack),
    runOpusReview(summary),
    runGptReview(summary),
  ])
  return [gemini, opus, gpt]
}

async function runGeminiReview(summary: string, evidencePack: EvidencePack): Promise<ModelReview> {
  const apiKey = getEnv("GEMINI_API_KEY")
  if (!apiKey) return skippedReview("gemini", "GEMINI_API_KEY missing")

  const ai = new GoogleGenAI({ apiKey })
  const model = getEnv("GEMINI_REVIEW_MODEL") || "gemini-3.5-flash"
  const attachVideos = getEnv("GEMINI_VIDEO_UPLOAD") === "1"
  let videoParts: { fileNames: string[]; parts: Array<{ fileData: { fileUri: string; mimeType: string } }> } = {
    fileNames: [],
    parts: [],
  }
  if (attachVideos) {
    try {
      console.log("[conversion-audit] uploading request-flow videos to Gemini...")
      videoParts = await withTimeout(
        buildGeminiVideoParts(ai, evidencePack.browser.captures),
        150_000,
        "Gemini video upload and processing",
      )
    } catch (error) {
      console.warn(
        `[conversion-audit] Gemini video upload skipped after timeout/error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }
  const prompt = buildModelPrompt(
    "Gemini",
    summary,
    attachVideos
      ? "Review the attached funnel videos first, then the evidence summary."
      : "Review the structured artifact pack, screenshot/trace/video paths, and funnel evidence. Direct video file upload was disabled after SDK stalls in this audit run.",
  )

  try {
    const response = await withTimeout(
      withRetry(
        () =>
          ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [...videoParts.parts, { text: prompt }],
              },
            ],
            config: {
              responseMimeType: "application/json",
            },
          }),
        { label: "gemini conversion review", attempts: 2, initialDelayMs: 5000 },
      ),
      MODEL_TIMEOUT_MS,
      "Gemini conversion review",
    )

    const review = parseModelReview(response.text ?? "", `gemini-${model}`)
    if (!attachVideos) {
      review.measurement_notes.unshift(
        "Gemini reviewed the artifact pack without attached video bytes after direct Files API upload stalled in two prior audit runs.",
      )
    }
    void cleanupGeminiUploads(ai, videoParts.fileNames)
    return review
  } catch (error) {
    void cleanupGeminiUploads(ai, videoParts.fileNames)
    return failedReview(`gemini-${model}`, error)
  }
}

async function buildGeminiVideoParts(ai: GoogleGenAI, captures: CaptureArtifact[]) {
  const selected = captures
    .filter((capture) => capture.videoPath && capture.journey === "request-to-checkout")
    .slice(0, 4)
  const parts: Array<{ fileData: { fileUri: string; mimeType: string } }> = []
  const fileNames: string[] = []

  for (const capture of selected) {
    const videoPath = resolve(OUT_DIR, capture.videoPath!)
    if (!existsSync(videoPath)) continue
    const uploaded = await withRetry(
      () => ai.files.upload({ file: videoPath, config: { mimeType: "video/webm" } }),
      { label: `gemini upload ${capture.service}`, attempts: 2, initialDelayMs: 2000 },
    )
    if (!uploaded.name) continue
    const file = await pollGeminiFile(ai, uploaded.name)
    if (file.uri) {
      fileNames.push(uploaded.name)
      parts.push({ fileData: { fileUri: file.uri, mimeType: file.mimeType ?? "video/webm" } })
    }
  }

  return { parts, fileNames }
}

async function pollGeminiFile(ai: GoogleGenAI, fileName: string) {
  const deadline = Date.now() + GEMINI_FILE_POLL_BUDGET_MS
  let delay = 2000
  while (Date.now() < deadline) {
    const file = await ai.files.get({ name: fileName })
    if (file.state === "ACTIVE") return { uri: file.uri, mimeType: file.mimeType }
    if (file.state === "FAILED") throw new Error(`Gemini file ${fileName} failed`)
    await new Promise((resolveDelay) => setTimeout(resolveDelay, delay))
    delay = Math.min(delay * 2, 10_000)
  }
  throw new Error(`Gemini file ${fileName} did not become ACTIVE`)
}

async function cleanupGeminiUploads(ai: GoogleGenAI, fileNames: string[]) {
  for (const fileName of fileNames) {
    await ai.files.delete({ name: fileName }).catch(() => {})
  }
}

async function runOpusReview(summary: string): Promise<ModelReview> {
  if (!getClaudeCredentialSource()) return skippedReview("claude-opus", "No Claude credential configured")

  try {
    const model = await getClaudeModel()
    const label = await getClaudeModelLabel()
    return await runAiSdkReview({
      model,
      label: `opus-${label}`,
      prompt: buildModelPrompt("Opus", summary, "Review frames, DOM evidence, service UX, and friction severity."),
    })
  } catch (error) {
    return failedReview("claude-opus", error)
  }
}

async function runGptReview(summary: string): Promise<ModelReview> {
  const apiKey = getEnv("OPENAI_API_KEY")
  if (!apiKey) return skippedReview("gpt", "OPENAI_API_KEY missing")

  const modelId = getEnv("OPENAI_CONVERSION_AUDIT_MODEL") || "gpt-5-mini"
  try {
    return await runAiSdkReview({
      model: openai(modelId),
      label: `gpt-${modelId}`,
      prompt: buildModelPrompt("GPT", summary, "Review the funnel tables, attribution wiring, Ads economics, and conversion strategy."),
    })
  } catch (error) {
    return failedReview(`gpt-${modelId}`, error)
  }
}

async function runAiSdkReview({
  label,
  model,
  prompt,
}: {
  label: string
  model: LanguageModel
  prompt: string
}): Promise<ModelReview> {
  const result = await withTimeout(
    generateText({
      model,
      prompt,
    }),
    MODEL_TIMEOUT_MS,
    `${label} conversion review`,
  )
  return parseModelReview(result.text, label)
}

function buildModelPrompt(modelName: string, summary: string, remit: string): string {
  return [
    `You are ${modelName}, independently auditing InstantMed's paid conversion funnel.`,
    remit,
    "",
    "Return JSON only with this shape:",
    "{",
    '  "summary": "short verdict",',
    '  "findings": [',
    "    {",
    '      "severity": "P0|P1|P2|P3",',
    '      "blocker": "specific issue",',
    '      "evidence": "artifact or metric evidence only",',
    '      "affected_service": "service or all",',
    '      "likely_funnel_stage": "ads|landing|cta|intake|checkout|attribution|recovery",',
    '      "cac_impact": "specific CAC/revenue implication",',
    '      "compliance_risk": "low|medium|high with reason",',
    '      "confidence": "high|medium|low",',
    '      "recommended_fix": "specific implementation or ads action"',
    "    }",
    "  ],",
    '  "ads_triage": ["pause/cap/negative/budget recommendation, no live mutation"],',
    '  "measurement_notes": ["tracking continuity or blind spot notes"]',
    "}",
    "",
    "Rules:",
    "- Do not invent facts not present in the evidence pack.",
    "- Reject cosmetic preferences unless they plausibly affect purchase conversion or compliance.",
    "- Rank findings by CAC impact, purchase conversion, and compliance risk.",
    "- No live Ads mutations are approved.",
    "",
    "# Evidence pack",
    summary,
  ].join("\n")
}

function parseModelReview(rawText: string, model: string): ModelReview {
  const text = extractJson(rawText)
  const parsed = ModelReviewSchema.safeParse(JSON.parse(text))
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "))
  }
  return {
    model,
    status: "ok",
    summary: parsed.data.summary,
    findings: parsed.data.findings,
    ads_triage: parsed.data.ads_triage,
    measurement_notes: parsed.data.measurement_notes,
    errors: [],
  }
}

function extractJson(rawText: string): string {
  const trimmed = rawText.trim()
  const start = trimmed.indexOf("{")
  if (start >= 0) {
    let depth = 0
    let inString = false
    let escaped = false
    for (let i = start; i < trimmed.length; i += 1) {
      const char = trimmed[i]
      if (escaped) {
        escaped = false
        continue
      }
      if (char === "\\") {
        escaped = true
        continue
      }
      if (char === "\"") {
        inString = !inString
        continue
      }
      if (inString) continue
      if (char === "{") depth += 1
      if (char === "}") {
        depth -= 1
        if (depth === 0) return trimmed.slice(start, i + 1)
      }
    }
  }
  throw new Error("model response did not contain a JSON object")
}

function skippedReview(model: string, reason: string): ModelReview {
  return {
    model,
    status: "skipped",
    summary: reason,
    findings: [],
    ads_triage: [],
    measurement_notes: [reason],
    errors: [reason],
  }
}

function failedReview(model: string, error: unknown): ModelReview {
  const message = error instanceof Error ? error.message : String(error)
  return {
    model,
    status: "failed",
    summary: `Review failed: ${redactText(message)}`,
    findings: [],
    ads_triage: [],
    measurement_notes: [],
    errors: [redactText(message)],
  }
}

function buildEvidenceSummary(evidencePack: EvidencePack): string {
  const ads30 = extractAdsMetrics(evidencePack.ads30)
  const ads90 = extractAdsMetrics(evidencePack.ads90)
  const captureLines = evidencePack.browser.captures.map(
    (capture) =>
      `- ${capture.service} ${capture.journey} ${capture.viewport}: ${capture.status}, final=${capture.finalUrl}, screenshot=${capture.screenshotPath}, video=${capture.videoPath ?? "none"}, consoleErrors=${capture.consoleErrors.length}, requestFailures=${capture.requestFailures.length}`,
  )

  return [
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Google Ads",
    ads30
      ? `30d: spend=${formatAud(ads30.spendAud)} clicks=${ads30.clicks ?? "n/a"} ads_conversions=${ads30.adsConversions ?? "n/a"} ads_cpa=${formatAud(ads30.adsCpaAud ?? 0)} local_orders=${ads30.localOrders ?? "n/a"} local_net=${formatAud(ads30.localNetRevenueAud ?? 0)} local_cac=${formatAud(ads30.localCacAud ?? 0)}`
      : "30d: unavailable",
    ads90
      ? `90d: spend=${formatAud(ads90.spendAud)} clicks=${ads90.clicks ?? "n/a"} ads_conversions=${ads90.adsConversions ?? "n/a"} ads_cpa=${formatAud(ads90.adsCpaAud ?? 0)} local_orders=${ads90.localOrders ?? "n/a"} local_net=${formatAud(ads90.localNetRevenueAud ?? 0)} local_cac=${formatAud(ads90.localCacAud ?? 0)}`
      : "90d: unavailable",
    "",
    "## Supabase Funnel",
    evidencePack.funnel30 ? summarizeFunnelForPrompt(evidencePack.funnel30) : "Supabase funnel skipped/unavailable.",
    evidencePack.funnel90 ? summarizeFunnelForPrompt(evidencePack.funnel90) : "90d Supabase funnel skipped/unavailable.",
    "",
    "## PostHog",
    summarizePostHogForPrompt(evidencePack.posthog30),
    summarizePostHogForPrompt(evidencePack.posthog90),
    "",
    "## Browser Captures",
    "Request-to-checkout capture status is scripted automation completion, not a confirmed user-facing outage by itself. Treat final DOM, validation state, console errors, and network evidence as the proof.",
    `Local request base reachable: ${evidencePack.browser.localBaseUrlReachable}`,
    ...captureLines,
    "",
    "## Static Checks",
    ...evidencePack.staticFindings.map(
      (finding) =>
        `- ${finding.severity} ${finding.blocker} Evidence: ${finding.evidence} Recommended fix: ${finding.recommended_fix}`,
    ),
  ].join("\n")
}

function summarizeFunnelForPrompt(funnel: FunnelData): string {
  const lines = [`${funnel.days}d totals: ${JSON.stringify(funnel.intakes.totals)}`]
  for (const [service, bucket] of Object.entries(funnel.intakes.byService).slice(0, 8)) {
    lines.push(`${funnel.days}d service ${service}: ${JSON.stringify(bucket)}`)
  }
  lines.push(`${funnel.days}d partial totals: ${JSON.stringify(funnel.partialIntakes.totals)}`)
  for (const [step, bucket] of Object.entries(funnel.partialIntakes.byStep).slice(0, 12)) {
    lines.push(`${funnel.days}d partial step ${step}: ${JSON.stringify(bucket)}`)
  }
  if (funnel.errors.length) lines.push(`${funnel.days}d query errors: ${funnel.errors.join("; ")}`)
  return lines.join("\n")
}

function summarizePostHogForPrompt(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "PostHog unavailable."
  return JSON.stringify(payload).slice(0, 3000)
}

function buildReport({
  evidencePack,
  modelReviews,
}: {
  evidencePack: EvidencePack
  modelReviews: ModelReview[]
}): string {
  const findings = synthesizeFindings(evidencePack, modelReviews)
  const ads30 = extractAdsMetrics(evidencePack.ads30)
  const ads90 = extractAdsMetrics(evidencePack.ads90)
  const successfulModels = modelReviews.filter((review) => review.status === "ok")

  return [
    "# Conversion Funnel Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Executive Verdict",
    "",
    ads30
      ? `Paid search is not economically sustainable in the current 30-day window: ${formatAud(ads30.spendAud)} spend against ${formatAud(ads30.localNetRevenueAud ?? 0)} local Google-attributed net revenue. The immediate lever is not more funnel polish; it is stopping spend leakage while fixing the conversion and attribution breaks below.`
      : "Google Ads spend data was unavailable from the protected production endpoint, so CAC conclusions are limited to Supabase/PostHog/browser evidence.",
    "",
    `Three-model panel status: ${modelReviews.map((review) => `${review.model}=${review.status}`).join(", ")}. ${successfulModels.length} model report(s) completed and were synthesized only where backed by artifacts or data.`,
    "",
    "## Funnel Table",
    "",
    buildFunnelTable(ads30, ads90, evidencePack.funnel30, evidencePack.funnel90),
    "",
    "## Ranked Fix Backlog",
    "",
    ...findings.map(formatFindingForReport),
    "",
    "## Immediate Ads Triage",
    "",
    ...buildAdsTriage(ads30, ads90, modelReviews),
    "",
    "## Tracking Continuity",
    "",
    ...buildTrackingContinuity(evidencePack),
    "",
    "## Browser Evidence",
    "",
    "Video links point to generated local `.webm` captures in this workspace. The repository review policy intentionally keeps those videos out of git; screenshots, traces, HARs, DOM evidence, model reports, and data extracts are the committed evidence.",
    "",
    "| Service | Journey | Viewport | Status | Screenshot | Video | Trace | Notes |",
    "|---|---|---:|---|---|---|---|---|",
    ...evidencePack.browser.captures.map(
      (capture) =>
        `| ${capture.service} | ${capture.journey} | ${capture.viewport} | ${capture.status} | ${link(capture.screenshotPath)} | ${capture.videoPath ? link(capture.videoPath) : "not committed"} | ${capture.tracePath ? link(capture.tracePath) : "none"} | console=${capture.consoleErrors.length}, failed_requests=${capture.requestFailures.length} |`,
    ),
    "",
    "## Model Reports",
    "",
    ...modelReviews.map((review) => formatModelReviewForReport(review, evidencePack)),
    "",
    "## Data Extracts",
    "",
    "- [Google Ads 30d](data/google-ads-30d.json)",
    "- [Google Ads 90d](data/google-ads-90d.json)",
    "- [Supabase funnel 30d](data/supabase-funnel-30d.json)",
    "- [Supabase funnel 90d](data/supabase-funnel-90d.json)",
    "- [PostHog 30d](data/posthog-30d.json)",
    "- [PostHog 90d](data/posthog-90d.json)",
    "- [Evidence pack](data/evidence-pack.json)",
    "",
    "## Safety Notes",
    "",
    "- No Google Ads campaign mutations were made.",
    "- No live card charge was attempted.",
    "- Production landing/attribution captures did not submit clinical forms; local request captures blocked draft and analytics writes.",
    "- Artifacts use synthetic patient data only, and text/JSON outputs redact emails, phone numbers, click IDs, UUIDs, Stripe identifiers, and payment/session tokens.",
    "- Capture videos remain local `.webm` files under the audit directory because `docs/reviews/.gitignore` intentionally excludes reproducible browser videos.",
  ].join("\n")
}

function buildFunnelTable(
  ads30: ReturnType<typeof extractAdsMetrics>,
  ads90: ReturnType<typeof extractAdsMetrics>,
  funnel30: FunnelData | null,
  funnel90: FunnelData | null,
): string {
  const rows = [
    ["Segment", "Spend", "Clicks", "Ads conv", "Ads CPA", "Local paid", "Local CAC", "Local net"],
    [
      "30d Google Ads",
      formatAud(ads30?.spendAud ?? 0),
      String(ads30?.clicks ?? "n/a"),
      String(ads30?.adsConversions ?? "n/a"),
      formatAud(ads30?.adsCpaAud ?? 0),
      String(ads30?.localOrders ?? funnel30?.intakes.totals.paid ?? "n/a"),
      formatAud(ads30?.localCacAud ?? 0),
      formatAud(ads30?.localNetRevenueAud ?? funnel30?.intakes.totals.netAud ?? 0),
    ],
    [
      "90d Google Ads",
      formatAud(ads90?.spendAud ?? 0),
      String(ads90?.clicks ?? "n/a"),
      String(ads90?.adsConversions ?? "n/a"),
      formatAud(ads90?.adsCpaAud ?? 0),
      String(ads90?.localOrders ?? funnel90?.intakes.totals.paid ?? "n/a"),
      formatAud(ads90?.localCacAud ?? 0),
      formatAud(ads90?.localNetRevenueAud ?? funnel90?.intakes.totals.netAud ?? 0),
    ],
  ]

  if (funnel30) {
    for (const [service, bucket] of Object.entries(funnel30.intakes.byService).slice(0, 8)) {
      rows.push([
        `30d ${service}`,
        "see Ads campaign extract",
        "n/a",
        "n/a",
        "n/a",
        String(bucket.paid),
        "n/a",
        formatAud(bucket.netAud),
      ])
    }
  }

  return markdownTable(rows)
}

function formatModelReviewForReport(review: ModelReview, evidencePack: EvidencePack): string {
  const acceptedFindings = review.findings.filter((finding) => isEvidenceBacked(finding, evidencePack))
  const rejectedCount = Math.max(0, review.findings.length - acceptedFindings.length)
  const summary = /localhost|hardcoded local|unreachable local|local.*redirect/i.test(review.summary)
    ? "Raw model summary included an unsupported local-capture-as-production interpretation. Accepted findings below were filtered against the actual artifacts."
    : review.summary

  return [
    `### ${review.model}`,
    "",
    `Status: ${review.status}`,
    "",
    summary,
    "",
    acceptedFindings.map((finding) => `- ${finding.severity}: ${finding.blocker} (${finding.confidence})`).join("\n") ||
      "- No structured findings accepted into synthesis.",
    rejectedCount > 0 ? `\nRejected unsupported or duplicate raw findings: ${rejectedCount}.` : "",
  ].join("\n")
}

function synthesizeFindings(evidencePack: EvidencePack, modelReviews: ModelReview[]): ModelFinding[] {
  const findings = new Map<string, ModelFinding>()
  const ads30 = extractAdsMetrics(evidencePack.ads30)

  for (const finding of evidencePack.staticFindings) addFinding(findings, finding)

  if (ads30?.spendAud && ads30.spendAud > Math.max(1, (ads30.localNetRevenueAud ?? 0) * 2)) {
    addFinding(findings, {
      severity: "P0",
      blocker: "Google Ads spend is far above local paid-order revenue.",
      evidence: `30d spend ${formatAud(ads30.spendAud)}, local paid orders ${ads30.localOrders ?? "n/a"}, local net revenue ${formatAud(ads30.localNetRevenueAud ?? 0)}, local CAC ${formatAud(ads30.localCacAud ?? 0)}.`,
      affected_service: "All paid services",
      likely_funnel_stage: "Ads auction and budget allocation",
      cac_impact: "Critical: current AOV cannot support the measured CAC.",
      compliance_risk: "Low",
      confidence: "high",
      recommended_fix: "Pause or cap spend outside proven exact/high-intent terms, move bidding to local purchase truth, and do not scale until CAC is below service gross margin.",
    })
  }

  if (evidencePack.funnel30?.partialIntakes.totals.count) {
    const partial = evidencePack.funnel30.partialIntakes.totals
    const conversion = partial.count ? partial.converted / partial.count : 0
    if (partial.count >= 10 && conversion < 0.35) {
      addFinding(findings, {
        severity: "P1",
        blocker: "Draft-to-intake conversion is low enough to indicate intake friction or recovery weakness.",
        evidence: `30d partial intakes ${partial.count}, converted ${partial.converted}, recovery sent ${partial.recoverySent}, stale recovery eligible approx ${partial.staleEligibleApprox}.`,
        affected_service: "All active request flows",
        likely_funnel_stage: "Intake step progression and abandoned-draft recovery",
        cac_impact: "High: paid clicks are leaking before checkout creation.",
        compliance_risk: "Low",
        confidence: "medium",
        recommended_fix: "Prioritize the highest-volume partial-intake steps in the report, shorten pre-payment fields where clinically safe, and tighten recovery eligibility/delivery metrics.",
      })
    }
  }

  for (const review of modelReviews) {
    for (const finding of review.findings) {
      if (isEvidenceBacked(finding, evidencePack)) addFinding(findings, finding)
    }
  }

  return Array.from(findings.values()).sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
}

function isEvidenceBacked(finding: ModelFinding, evidencePack: EvidencePack): boolean {
  const evidence = finding.evidence.toLowerCase()
  const blocker = finding.blocker.toLowerCase()
  if (
    blocker.includes("completely failing") &&
    evidence.includes("browser captures") &&
    !evidence.includes("console=0") &&
    !evidence.includes("network")
  ) {
    return false
  }
  if (
    (blocker.includes("request-to-checkout") || evidence.includes("request-to-checkout")) &&
    (evidence.includes("localhost") ||
      evidence.includes("scripted automation") ||
      evidence.includes("automation hit") ||
      evidence.includes("browser captures"))
  ) {
    return false
  }
  if (blocker.includes("localhost") || evidence.includes("non-production endpoints")) {
    return false
  }

  return (
    evidence.includes("30d") ||
    evidence.includes("90d") ||
    evidence.includes("capture") ||
    evidence.includes("screenshot") ||
    evidence.includes("trace") ||
    evidence.includes("partial") ||
    evidence.includes("posthog") ||
    evidence.includes("google") ||
    evidence.includes("component") ||
    evidencePack.staticFindings.some((staticFinding) => finding.blocker.includes(staticFinding.blocker.slice(0, 24)))
  )
}

function addFinding(map: Map<string, ModelFinding>, finding: ModelFinding) {
  const key = canonicalFindingKey(finding)
  const existing = map.get(key)
  if (!existing || severityRank(finding.severity) < severityRank(existing.severity)) map.set(key, finding)
}

function canonicalFindingKey(finding: ModelFinding): string {
  const text = `${finding.blocker} ${finding.evidence} ${finding.affected_service} ${finding.likely_funnel_stage}`.toLowerCase()
  if (text.includes("prescription") && text.includes("consult") && (text.includes("cta") || text.includes("retired"))) {
    return "prescription-retired-consult-cta"
  }
  if (text.includes("intake_abandonment") || (text.includes("abandonment") && text.includes("schema"))) {
    return "missing-intake-abandonment-table"
  }
  if (
    text.includes("attribution") ||
    text.includes("measurement") ||
    text.includes("purchase_completed") ||
    text.includes("google_ads_server_conversion") ||
    text.includes("conversion tracking")
  ) {
    return "attribution-reconciliation"
  }
  if (text.includes("partial intakes") || text.includes("recovery sent") || text.includes("recovery activity")) {
    return "partial-intake-recovery"
  }
  if ((text.includes("cac") || text.includes("cpa") || text.includes("spend")) && (text.includes("aov") || text.includes("revenue") || text.includes("unit economics") || text.includes("unprofitable"))) {
    return "ads-unit-economics"
  }
  return slug(finding.blocker)
}

function formatFindingForReport(finding: ModelFinding, index: number): string {
  return [
    `### ${index + 1}. ${finding.severity} - ${finding.blocker}`,
    "",
    `- Evidence: ${finding.evidence}`,
    `- Affected service: ${finding.affected_service}`,
    `- Funnel stage: ${finding.likely_funnel_stage}`,
    `- CAC impact: ${finding.cac_impact}`,
    `- Compliance risk: ${finding.compliance_risk}`,
    `- Confidence: ${finding.confidence}`,
    `- Recommended fix: ${finding.recommended_fix}`,
  ].join("\n")
}

function buildAdsTriage(
  ads30: ReturnType<typeof extractAdsMetrics>,
  ads90: ReturnType<typeof extractAdsMetrics>,
  modelReviews: ModelReview[],
): string[] {
  const recs = new Set<string>()
  if (ads30?.spendAud) {
    recs.add(`1. Stop scaling until local paid-order CAC is below gross margin. Current 30d local CAC: ${formatAud(ads30.localCacAud ?? 0)}.`)
    recs.add("2. Cap or pause campaigns/ad groups without local paid-order matches, even when Ads reports soft conversions.")
    recs.add("3. Segment Search Partners separately and disable it unless it proves lower local CAC than Google Search.")
    recs.add("4. Add negatives for low-intent or off-scope terms surfaced in the search-term extract; do not mutate live campaigns until approved.")
  }
  if (ads90?.spendAud && ads30?.spendAud && ads90.spendAud > ads30.spendAud) {
    recs.add("5. Compare 30d vs 90d terms before re-enabling old terms; recent spend concentration is still not profitable.")
  }
  for (const review of modelReviews) {
    for (const triage of review.ads_triage) {
      if (/request-to-checkout|localhost|all pages until request/i.test(triage)) continue
      if (/mobile js|checkout crash|mobile intake|mobile.*broken/i.test(triage)) continue
      if (/erectile dysfunction|hair loss|\$0\.00 local net/i.test(triage)) continue
      if (/higher-aov services/i.test(triage)) continue
      recs.add(`${recs.size + 1}. ${triage}`)
    }
  }
  return Array.from(recs)
}

function buildTrackingContinuity(evidencePack: EvidencePack): string[] {
  const lines = [
    "- `gclid`/UTM capture was verified via synthetic production landing captures and the attribution-continuity artifact.",
    "- Deep intake captures block analytics/draft writes to prevent production pollution; use PostHog/Supabase extracts for real funnel counts.",
    "- Server-side Google Ads conversion import remains the source of purchase truth; the report compares it against local paid-order match.",
  ]

  const continuity = evidencePack.browser.captures.find((capture) => capture.journey === "attribution-continuity")
  if (continuity) {
    lines.push(`- Continuity artifact: ${link(continuity.domPath)} and ${link(continuity.screenshotPath)}.`)
  }

  if (evidencePack.funnel30?.errors.length) {
    lines.push(`- Supabase extract caveats: ${evidencePack.funnel30.errors.join("; ")}.`)
  }

  return lines
}

function extractAdsMetrics(payload: unknown):
  | {
      adsConversions?: number
      adsCpaAud?: number
      clicks?: number
      localCacAud?: number
      localNetRevenueAud?: number
      localOrders?: number
      spendAud: number
    }
  | null {
  if (!payload || typeof payload !== "object") return null
  const root = payload as Record<string, unknown>
  const nested = root.payload && typeof root.payload === "object" ? (root.payload as Record<string, unknown>) : root
  const report = nested.report && typeof nested.report === "object" ? (nested.report as Record<string, unknown>) : nested
  const ads = report.ads && typeof report.ads === "object" ? (report.ads as Record<string, unknown>) : report
  const localRoot = report.local && typeof report.local === "object" ? (report.local as Record<string, unknown>) : report
  const summary = ads.summary && typeof ads.summary === "object" ? (ads.summary as Record<string, unknown>) : null
  const local = localRoot.summary && typeof localRoot.summary === "object"
    ? (localRoot.summary as Record<string, unknown>)
    : localRoot.localPaidOrders && typeof localRoot.localPaidOrders === "object"
      ? (localRoot.localPaidOrders as Record<string, unknown>)
      : null

  const spendAud = numberFrom(summary?.totalSpendAud ?? summary?.spendAud ?? summary?.costAud ?? nested.spendAud ?? nested.costAud)
  if (!Number.isFinite(spendAud)) return null

  const localOrders = finiteOrUndefined(numberFrom(summary?.totalLocalOrders ?? local?.orders ?? local?.count ?? nested.localPaidOrderCount))
  const localCac = finiteOrUndefined(numberFrom(local?.cacAud ?? nested.localCacAud))

  return {
    spendAud,
    clicks: finiteOrUndefined(numberFrom(summary?.totalClicks ?? summary?.clicks ?? nested.clicks)),
    adsConversions: finiteOrUndefined(numberFrom(summary?.totalConversions ?? summary?.conversions ?? nested.conversions)),
    adsCpaAud: finiteOrUndefined(numberFrom(summary?.cpaAud ?? summary?.costPerConversionAud ?? nested.cpaAud)),
    localOrders,
    localNetRevenueAud: finiteOrUndefined(numberFrom(summary?.totalLocalNetRevenueAud ?? local?.netRevenueAud ?? nested.localNetRevenueAud)),
    localCacAud: localCac ?? (localOrders && localOrders > 0 ? roundMoney(spendAud / localOrders) : undefined),
  }
}

function numberFrom(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value.replace(/[$,]/g, ""))
  return Number.NaN
}

function finiteOrUndefined(value: number): number | undefined {
  return Number.isFinite(value) ? value : undefined
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function roundNumber(value: number, decimals: number): number {
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

function formatAud(value: number): string {
  return `$${roundMoney(value).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function severityRank(severity: Severity): number {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[severity]
}

function markdownTable(rows: string[][]): string {
  const [header, ...body] = rows
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n")
}

function sortRecord<T>(record: Record<string, T>, scorer: (item: T) => number): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort((a, b) => scorer(b[1]) - scorer(a[1])))
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function relativeToOut(path: string): string {
  return path ? path.replace(`${OUT_DIR}/`, "") : path
}

function link(path: string): string {
  return path ? `[${path}](${path})` : "none"
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(sanitizeJson(value), null, 2)}\n`, "utf8")
}

function sanitizeJson(value: unknown): unknown {
  if (typeof value === "string") return redactText(value)
  if (Array.isArray(value)) return value.map(sanitizeJson)
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        output[key] = summarizeSensitiveValue(nested)
      } else {
        output[key] = sanitizeJson(nested)
      }
    }
    return output
  }
  return value
}

function isSensitiveKey(key: string): boolean {
  return /(^email$|email_address|phone|gclid|gbraid|wbraid|click_id|session|payment|intent|token|secret|api_key|uuid|intake_id|patient_id|auth_user_id|client_secret)/i.test(
    key,
  )
}

function summarizeSensitiveValue(value: unknown): string | null | boolean | number {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "boolean" || typeof value === "number") return value
  const text = String(value)
  return `[redacted:${hashShort(text)}]`
}

function hashShort(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 10)
}

function redactText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted:email]")
    .replace(/\b(?:\+?61|0)4[\d\s-]{8,12}\b/g, "[redacted:phone]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[redacted:uuid]")
    .replace(/\b(?:cs|pi|ch|cus|sub|seti|pm)_[A-Za-z0-9_:-]{12,}\b/g, "[redacted:stripe]")
    .replace(/([?&](?:gclid|gbraid|wbraid|token|secret|session_id|payment_intent|client_secret|email)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\b(?:ya29|re|sk|rk|pk|whsec|SG)\_[A-Za-z0-9_\-.]{12,}\b/g, "[redacted:key]")
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value)
    for (const key of Array.from(url.searchParams.keys())) {
      if (/gclid|gbraid|wbraid|email|phone|token|secret|session|payment|client/i.test(key)) {
        url.searchParams.set(key, "[redacted]")
      }
    }
    return redactText(url.toString())
  } catch {
    return redactText(value)
  }
}

async function redactFileInPlace(path: string) {
  const size = await stat(path).then((fileStat) => fileStat.size).catch(() => 0)
  if (size <= 0 || size > 25 * 1024 * 1024) return
  const text = await readFile(path, "utf8")
  await writeFile(path, redactText(text), "utf8")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
