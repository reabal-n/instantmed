import type {
  AdsAgentSnapshot,
  AdsMutationFamily,
  AdsRecommendation,
  AdsService,
  CampaignPortfolioEconomics,
  RecommendationKind,
} from "@/lib/ads-agent/types"

const REPORT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const guardrailCopy: Record<string, string> = {
  ATTRIBUTION_INVESTIGATION_HOLD:
    "Attribution investigation remains open — scaling stays blocked until the recorded resolution",
  BUDGET_ENVELOPE_UNAVAILABLE: "Daily budget data is unavailable",
  BUDGET_ENVELOPE_EXCEEDED: "Daily budget envelope exceeded",
  CROSS_SERVICE_ATTRIBUTION:
    "Material cross-service attribution needs investigation",
  CLINICAL_INCIDENT: "A clinical incident is open for this service",
  CLINICAL_QA_LAG: "Completed clinical QA is behind",
  CLINICAL_QA_EVIDENCE_UNAVAILABLE:
    "Fresh completed clinical-QA evidence is unavailable",
  ECONOMICS_UNAVAILABLE: "Fee-aware economics unavailable",
  ENABLED_CAMPAIGN_SPEND_UNAVAILABLE: "Enabled campaign spend unavailable",
  EXPLICIT_SERVICE_HOLD: "The service has an explicit operating hold",
  FULFILMENT_UNHEALTHY: "Fulfilment is unhealthy for this service",
  MEDCERT_NEGATIVE_CONTRIBUTION:
    "Medical certificates remain below first-order break-even",
  MULTIPLE_SERVICE_CAMPAIGNS: "More than one campaign owns a service",
  POST_CHANGE_SAMPLE_IMMATURE: "Scripts refund data still immature",
  SCRIPTS_REFUND_GATE: "Scripts refund data still immature",
  QUEUE_24H_BREACH: "At least one manual-review wait breached 24 hours",
  OPERATIONAL_EVIDENCE_UNAVAILABLE:
    "Fresh operating evidence is unavailable",
  QUEUE_OLDEST_AT_OR_OVER_20H:
    "The oldest unreviewed manual request is at least 20 hours old",
  QUEUE_P95_AT_OR_OVER_6H: "Manual-review P95 is at least 6 hours",
  QUEUE_P95_OVER_2H_WATCH:
    "Manual-review P95 is above the 2-hour operating target",
  SPECIALTY_CLICK_EVIDENCE_UNAVAILABLE:
    "Paid click evidence is unavailable for a zero-order specialty",
  SPECIALTY_LOSS_CAP: "Specialty pilot reached its approved loss cap",
  SPECIALTY_ZERO_ORDER_CLICK_INVESTIGATION:
    "Zero retained orders after the specialty click checkpoint",
  SUPPORT_EVIDENCE_UNAVAILABLE:
    "Fresh verified support-rate evidence is unavailable",
  SUPPORT_OVER_5_PER_100: "Support contacts exceed 5 per 100 paid orders",
  UNMAPPED_ENABLED_SEARCH_CAMPAIGN:
    "An enabled Search campaign is outside the service constitution",
}

const serviceCopy: Record<AdsService, string> = {
  account: "Account",
  ed: "ED",
  hair_loss: "Hair",
  med_certs: "Med certs",
  scripts: "Scripts",
  womens_health: "Women",
}

const mutationFamilyCopy: Record<AdsMutationFamily, string> = {
  ad_group_cpc_bid: "CPC bid change",
  ad_status: "ad change",
  asset_link_status: "asset/sitelink change",
  campaign_create: "new Search campaign",
  campaign_bidding: "scaling/bid change",
  campaign_budget: "budget change",
  campaign_status: "campaign pause/enable",
  keyword_status: "keyword change",
  negative_keyword: "negative keyword change",
  shared_negative_list: "shared exclusion-list attachment",
  positive_keyword_create: "new exact/phrase keyword",
  responsive_search_ad_create: "new responsive search ad",
  schedule_replace: "schedule change",
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

function formatPeriodLine(
  label: string,
  economics: CampaignPortfolioEconomics,
): string {
  const orders = economics.orders
  const orderCopy = orders == null
    ? "orders unavailable"
    : `${orders} ${orders === 1 ? "order" : "orders"}`

  return `${label}: ${formatAud(economics.contributionCents, { signed: true })} · ${orderCopy}`
}

function recommendationReason(recommendation: AdsRecommendation): string {
  for (const reasonCode of recommendation.reasonCodes) {
    const copy = guardrailCopy[reasonCode]
    if (copy) return copy
  }
  return "Review needed"
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
  if (decision === "APPROVAL_NEEDED") {
    return `ACTION · ${snapshot.tracking.state} tracking · Approval required`
  }
  if (decision === "INVESTIGATE") {
    return `CHECK · ${snapshot.tracking.state} tracking · No Ads change yet`
  }
  return `HOLD · ${snapshot.tracking.state} tracking · No changes`
}

function recommendationLines(
  recommendations: AdsRecommendation[],
): string[] {
  return recommendations.flatMap((recommendation) => {
    const service = serviceCopy[recommendation.service]
    if (recommendation.kind === "APPROVAL_NEEDED") {
      const action = recommendation.proposedMutationFamily
        ? mutationFamilyCopy[recommendation.proposedMutationFamily]
        : "exact proposal review"
      const reason = recommendation.reasonCodes
        .map((reasonCode) => guardrailCopy[reasonCode])
        .find(Boolean)
      return [`Action: ${service} · ${action}${reason ? ` · ${reason}` : ""}`]
    }
    if (recommendation.kind === "INVESTIGATE") {
      return [`Check: ${service} · ${recommendationReason(recommendation)}`]
    }
    return []
  })
}

/**
 * Essential aggregate-only Telegram report. It deliberately excludes routine
 * platform metrics and raw attribution/search-term detail.
 */
export function formatDailyAdsBrief(
  snapshot: AdsAgentSnapshot,
  recommendations: AdsRecommendation[],
): string {
  const lines = [
    `Ads · ${formatReportDate(snapshot.reportDate)} · after Ads + fees`,
    decisionLine(snapshot, recommendations),
    ...recommendationLines(recommendations),
    formatPeriodLine("Yesterday", snapshot.totals.daily.enabled),
    formatPeriodLine("30 days", snapshot.totals.rolling30.enabled),
  ]

  return lines.join("\n")
}
