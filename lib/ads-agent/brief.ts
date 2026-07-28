import { resolveAdsCampaignService } from "@/lib/ads-agent/policy"
import type {
  AdsAgentSnapshot,
  AdsRecommendation,
  AdsService,
  CampaignEconomics,
  CampaignPortfolioEconomics,
  RecommendationKind,
} from "@/lib/ads-agent/types"

const REPORT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const guardrailCopy: Record<string, string> = {
  BUDGET_ENVELOPE_EXCEEDED: "Daily budget envelope exceeded",
  CROSS_SERVICE_ATTRIBUTION: "Cross-service attribution needs investigation",
  ECONOMICS_UNAVAILABLE: "Fee-aware economics unavailable",
  ENABLED_CAMPAIGN_SPEND_UNAVAILABLE: "Enabled campaign spend unavailable",
  MEDCERT_NEGATIVE_CONTRIBUTION:
    "Medical certificates remain below first-order break-even",
  MULTIPLE_SERVICE_CAMPAIGNS: "More than one campaign owns a service",
  POST_CHANGE_SAMPLE_IMMATURE: "Scripts refund data still immature",
  SCRIPTS_REFUND_GATE: "Scripts refund data still immature",
  SPECIALTY_LOSS_CAP: "Specialty pilot reached its approved loss cap",
  UNMAPPED_ENABLED_SEARCH_CAMPAIGN:
    "An enabled Search campaign is outside the service constitution",
}

function formatReportDate(reportDate: string): string {
  const match = REPORT_DATE_PATTERN.exec(reportDate)
  if (!match) return reportDate
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(Number(match[1]), monthIndex, day))
  if (!Number.isFinite(date.getTime())) return reportDate

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  return `${weekdays[date.getUTCDay()]} ${day} ${months[monthIndex]}`
}

function formatAud(
  cents: number | null,
  options: { signed?: boolean } = {},
): string {
  if (cents == null) return "unavailable"
  const dollars = Math.round(Math.abs(cents) / 100).toLocaleString("en-AU")
  if (cents < 0) return `−A$${dollars}`
  if (options.signed && cents > 0) return `+A$${dollars}`
  return `A$${dollars}`
}

function serviceCampaign(
  campaigns: CampaignEconomics[],
  service: AdsService,
): CampaignEconomics | null {
  return campaigns.find(
    (campaign) => resolveAdsCampaignService(campaign) === service,
  ) ?? null
}

function formatPeriodLine(
  label: string,
  economics: CampaignPortfolioEconomics,
): string {
  const orders = economics.orders
  const orderCopy = orders == null
    ? "orders unavailable"
    : `${orders} ${orders === 1 ? "order" : "orders"}`

  return (
    `${label}: ${formatAud(economics.contributionCents, { signed: true })}` +
    ` · ${orderCopy} · ${formatAud(economics.spendCents)} spent`
  )
}

function formatServiceContribution(
  label: string,
  economics: CampaignEconomics | null,
): string {
  if (!economics) return `${label} unavailable`
  if (economics.campaignStatus === "PAUSED") {
    return `${label} paused`
  }
  return `${label} ${formatAud(economics.contributionCents, { signed: true })}`
}

function firstGuardrail(
  snapshot: AdsAgentSnapshot,
  recommendations: AdsRecommendation[],
): string | null {
  const reasonCodes = [
    ...snapshot.tracking.reasonCodes,
    ...recommendations.flatMap(
      (recommendation) => recommendation.reasonCodes,
    ),
  ]
  for (const reasonCode of reasonCodes) {
    const copy = guardrailCopy[reasonCode]
    if (copy) return copy
  }
  return null
}

function decisionKind(
  recommendations: AdsRecommendation[],
): RecommendationKind {
  if (recommendations.some(({ kind }) => kind === "APPROVAL_NEEDED")) {
    return "APPROVAL_NEEDED"
  }
  if (recommendations.some(({ kind }) => kind === "INVESTIGATE")) {
    return "INVESTIGATE"
  }
  return "HOLD"
}

function decisionLine(
  snapshot: AdsAgentSnapshot,
  recommendations: AdsRecommendation[],
): string {
  const decision = decisionKind(recommendations)
  const parts = [`${snapshot.tracking.state} tracking`, decision]
  const guardrail = firstGuardrail(snapshot, recommendations)
  if (guardrail) parts.push(guardrail)
  parts.push(decision === "APPROVAL_NEEDED" ? "Exact proposal required" : "No changes")
  return parts.join(" · ")
}

/**
 * Essential aggregate-only Telegram report. It deliberately excludes routine
 * platform metrics and raw attribution/search-term detail.
 */
export function formatDailyAdsBrief(
  snapshot: AdsAgentSnapshot,
  recommendations: AdsRecommendation[],
): string {
  const rolling30 = {
    ed: serviceCampaign(snapshot.rolling30, "ed"),
    hairLoss: serviceCampaign(snapshot.rolling30, "hair_loss"),
    medCerts: serviceCampaign(snapshot.rolling30, "med_certs"),
    scripts: serviceCampaign(snapshot.rolling30, "scripts"),
    womensHealth: serviceCampaign(snapshot.rolling30, "womens_health"),
  }
  const lines = [
    `Ads · ${formatReportDate(snapshot.reportDate)} · after ad spend + Stripe fees`,
    formatPeriodLine("Yesterday", snapshot.totals.daily.enabled),
    formatPeriodLine("30 days", snapshot.totals.rolling30.enabled),
    `Services, 30 days: ${[
      formatServiceContribution("Scripts", rolling30.scripts),
      formatServiceContribution("Med", rolling30.medCerts),
    ].join(" · ")}`,
    `Pilots, 30 days: ${[
      formatServiceContribution("Hair", rolling30.hairLoss),
      formatServiceContribution("ED", rolling30.ed),
      formatServiceContribution("Women", rolling30.womensHealth),
    ].join(" · ")}`,
    decisionLine(snapshot, recommendations),
  ]

  return lines.join("\n")
}
