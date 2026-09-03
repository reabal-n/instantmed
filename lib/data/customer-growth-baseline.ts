import {
  type AttributionClassificationInput,
  type AttributionSourceGroup,
  classifyAttributionSource,
} from "@/lib/analytics/source-classification"
import { isExternalAnalyticsExcludedPathname } from "@/lib/browser/sensitive-capability-path"

export type CustomerGrowthServiceBaseline = {
  createdIntakes: number
  grossRevenueAud: number
  paidAtOrders: number
  service: string
}

export type FreeChannelLandingRow = {
  group: AttributionSourceGroup
  landingPage: string
  orders: number
}

export type CustomerGrowthSupabaseBaseline = {
  dateFrom: string
  dateTo: string
  days: number
  freeChannelLandingPages: FreeChannelLandingRow[]
  intakes: {
    averageOrderValueAud: number | null
    byService: CustomerGrowthServiceBaseline[]
    createdIntakes: number
    grossRevenueAud: number
    netRevenueAud: number
    paidAtOrders: number
    refundedAud: number
  }
  recovery: {
    abandonedCheckoutSent: number
    convertedPartials: number
    emailCaptured: number
    emailCaptureRate: number | null
    partialRecoverySent: number
    partialsCaptured: number
    recoveredGrossRevenueAud: number
    recoveredNetRevenueAud: number
    recoveredPaidCount: number
    recoveryEmailCoverageRate: number | null
  }
}

const FREE_ACQUISITION_GROUPS = new Set<AttributionSourceGroup>([
  "organic_nonbrand",
  "organic_brand",
  "ai_referral",
  "referral",
])
const PUBLIC_LANDING_HOSTS = new Set(["instantmed.com.au", "www.instantmed.com.au"])

function publicLandingPath(value?: string | null): string {
  const landingPage = value?.trim()
  if (!landingPage) return "/unknown"

  try {
    const url = new URL(landingPage, "https://instantmed.com.au")
    if (url.protocol !== "http:" && url.protocol !== "https:") return "/unknown"
    if (!PUBLIC_LANDING_HOSTS.has(url.hostname)) return "/unknown"
    const pathname = url.pathname.replace(/\/+$/, "") || "/"
    if (isExternalAnalyticsExcludedPathname(pathname)) return "/unknown"
    return pathname === "/verify" || pathname.startsWith("/verify/") ? "/verify" : pathname
  } catch {
    return "/unknown"
  }
}

export function buildFreeChannelLandingBreakdown(
  rows: AttributionClassificationInput[],
): FreeChannelLandingRow[] {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const group = classifyAttributionSource(row).group
    if (!FREE_ACQUISITION_GROUPS.has(group)) continue

    const landingPage = publicLandingPath(row.landing_page)
    const key = `${group}\t${landingPage}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return Array.from(counts, ([key, orders]) => {
    const [group, landingPage] = key.split("\t")
    return { group: group as AttributionSourceGroup, landingPage, orders }
  }).sort(
    (a, b) =>
      b.orders - a.orders ||
      a.group.localeCompare(b.group) ||
      a.landingPage.localeCompare(b.landingPage),
  )
}

export type CustomerGrowthPostHogBaseline = {
  dateFrom?: string
  dateTo?: string
  days: number
  events?: Array<{
    count: number
    event: string
  }>
  ok?: boolean
  reason?: string
  skipped?: boolean
  status?: number
}

export type CustomerGrowthGoogleAdsBaseline = {
  ok: boolean
  reason?: string
  skipped?: boolean
  source: "protected-endpoint"
  status?: number
  summary?: {
    clicks: number
    localCacAud: number | null
    localNetRevenueAud: number
    localOrders: number
    localRoas: number | null
    spendAud: number | null
  }
}

export type CustomerGrowthBaselineSummaryInput = {
  generatedAt: string
  googleAds30d: CustomerGrowthGoogleAdsBaseline
  posthog30d: CustomerGrowthPostHogBaseline
  supabase30d: CustomerGrowthSupabaseBaseline
}

const SENSITIVE_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\b(?:\+?61|0)[2-478](?:[ -]?\d){8}\b/,
  /\b(?:pi|cs|cus|ch|pm|in|sub|price|prod)_[A-Za-z0-9]{8,}\b/,
  /\b(?:gclid|gbraid|wbraid)\b\s*[:="' ]+\s*[A-Za-z0-9_-]{8,}/i,
  /\bIM-(?:WORK|STUDY|CARER)-\d{8}-\d{8}\b/i,
] as const

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/a"
  return `$${value.toFixed(2)}`
}

function formatRate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/a"
  return `${value.toFixed(1)}%`
}

function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/a"
  return value.toFixed(3)
}

function eventCount(posthog: CustomerGrowthPostHogBaseline, event: string): number {
  return posthog.events?.find((row) => row.event === event)?.count ?? 0
}

function phaseOneGate(input: CustomerGrowthBaselineSummaryInput): string {
  const recovery = input.supabase30d.recovery
  if (recovery.convertedPartials === 0 && recovery.partialRecoverySent > 0) {
    return "blocked - partial-intake converted marker is zero despite recovery sends"
  }
  if (recovery.emailCaptured > 0 && recovery.partialRecoverySent === 0) {
    return "blocked - recovery email coverage is zero"
  }
  return "watch - recovery marker is measurable"
}

function phaseFourGate(input: CustomerGrowthBaselineSummaryInput): string {
  const summary = input.googleAds30d.summary
  if (!summary) return "blocked - Google Ads report unavailable"
  const spendAud = summary.spendAud ?? 0
  if (spendAud > 0 && (summary.localRoas ?? 0) < 1) {
    return "blocked - Google Ads local ROAS below 1"
  }
  if (spendAud > 0 && summary.localOrders === 0) {
    return "blocked - Google Ads spend has no local paid orders"
  }
  return "watch - Ads economics need weekly review"
}

export function buildCustomerGrowthBaselineSummary(input: CustomerGrowthBaselineSummaryInput): string {
  const { googleAds30d, posthog30d, supabase30d } = input
  const ads = googleAds30d.summary

  const lines = [
    "# Customer Growth Baseline",
    "",
    `Generated: ${input.generatedAt}`,
    `Window: ${supabase30d.days} days (${supabase30d.dateFrom} to ${supabase30d.dateTo})`,
    "",
    "## Supabase Payment Truth",
    "",
    `- 30-day reportable intakes created: ${supabase30d.intakes.createdIntakes}`,
    `- 30-day orders paid in window: ${supabase30d.intakes.paidAtOrders}`,
    `- 30-day gross revenue: ${formatMoney(supabase30d.intakes.grossRevenueAud)}`,
    `- 30-day net revenue: ${formatMoney(supabase30d.intakes.netRevenueAud)}`,
    `- 30-day net AOV: ${formatMoney(supabase30d.intakes.averageOrderValueAud)}`,
    "",
    "## Free-Channel Paid-Order Landings",
    "",
    "These order counts are acquisition evidence; total net-retained revenue is the economic result.",
    "",
    "| Source group | Public pathname | Paid orders |",
    "| --- | --- | ---: |",
    ...supabase30d.freeChannelLandingPages.map(
      (row) => `| ${row.group} | ${row.landingPage} | ${row.orders} |`,
    ),
    "",
    "## Recovery",
    "",
    `- 30-day partial intakes: ${supabase30d.recovery.partialsCaptured}`,
    `- 30-day partial-intake email capture: ${supabase30d.recovery.emailCaptured}`,
    `- 30-day partial-intake email capture rate: ${formatRate(supabase30d.recovery.emailCaptureRate)}`,
    `- 30-day partial-intake recovery sends: ${supabase30d.recovery.partialRecoverySent}`,
    `- 30-day partial-intake converted marker: ${supabase30d.recovery.convertedPartials}`,
    `- 30-day recovered paid count: ${supabase30d.recovery.recoveredPaidCount}`,
    `- 30-day recovered net revenue: ${formatMoney(supabase30d.recovery.recoveredNetRevenueAud)}`,
    "",
    "## Google Ads",
    "",
    ads
      ? `- 30-day Google Ads spend: ${formatMoney(ads.spendAud)}`
      : `- 30-day Google Ads spend: unavailable (${googleAds30d.reason ?? "no report"})`,
    ads ? `- 30-day Google Ads clicks: ${ads.clicks}` : "- 30-day Google Ads clicks: unavailable",
    ads ? `- 30-day Google Ads local orders: ${ads.localOrders}` : "- 30-day Google Ads local orders: unavailable",
    ads ? `- 30-day Google Ads local CAC: ${formatMoney(ads.localCacAud)}` : "- 30-day Google Ads local CAC: unavailable",
    ads ? `- 30-day Google Ads local ROAS: ${formatRatio(ads.localRoas)}` : "- 30-day Google Ads local ROAS: unavailable",
    "",
    "## PostHog Events",
    "",
    `- intake_started: ${eventCount(posthog30d, "intake_started")}`,
    `- checkout_viewed: ${eventCount(posthog30d, "checkout_viewed")}`,
    `- purchase_completed_server: ${eventCount(posthog30d, "purchase_completed_server")}`,
    "",
    "## Phase Gates",
    "",
    `- Phase 1 gate: ${phaseOneGate(input)}`,
    `- Phase 4 gate: ${phaseFourGate(input)}`,
    "",
  ]

  return lines.join("\n")
}

export function assertNoSensitiveBaselineText(text: string): void {
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new Error("Customer growth baseline contains sensitive identifiers")
  }
}
