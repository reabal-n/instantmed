import { resolveAdsCampaignService } from "@/lib/ads-agent/policy"
import type {
  AdsAgentSnapshot,
  AdsRecommendation,
  AdsService,
  CampaignEconomics,
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
  POST_CHANGE_SAMPLE_IMMATURE: "Scripts refund cohort still immature",
  SCRIPTS_REFUND_GATE: "Scripts refund cohort still immature",
  SPECIALTY_LOSS_CAP: "Specialty pilot reached its approved loss cap",
  TRACKING_NOT_GREEN: "Tracking is not GREEN",
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

function serviceRecommendation(
  recommendations: AdsRecommendation[],
  service: AdsService,
): AdsRecommendation | null {
  return recommendations.find(
    (recommendation) => recommendation.service === service,
  ) ?? null
}

function formatPrimaryServiceLine(args: {
  daily: CampaignEconomics | null
  label: string
  recommendation?: AdsRecommendation | null
  rolling30: CampaignEconomics | null
}): string {
  if (!args.rolling30) return `${args.label}: unavailable`
  if (args.rolling30.campaignStatus === "PAUSED") {
    return `${args.label}: paused`
  }

  const orders = args.daily?.orders
  const orderCopy = orders == null
    ? "orders unavailable"
    : `${orders} ${orders === 1 ? "order" : "orders"}`
  const recommendation = args.recommendation
    ? ` · ${args.recommendation.kind}`
    : ""

  return (
    `${args.label}: ${formatAud(args.daily?.spendCents ?? null)} / ` +
    `${orderCopy} / ${formatAud(
      args.daily?.contributionCents ?? null,
      { signed: true },
    )} · 30d ${formatAud(
      args.rolling30.contributionCents,
      { signed: true },
    )}${recommendation}`
  )
}

function formatSpecialty(args: {
  daily: CampaignEconomics | null
  label: string
  rolling30: CampaignEconomics | null
}): string {
  if (!args.rolling30) return `${args.label}: unavailable`
  if (args.rolling30.campaignStatus === "PAUSED") {
    return `${args.label}: paused`
  }
  return (
    `${args.label}: ${formatAud(args.daily?.spendCents ?? null)} · ` +
    `30d ${formatAud(args.rolling30.contributionCents, { signed: true })}`
  )
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

function decisionLine(recommendations: AdsRecommendation[]): string {
  if (recommendations.some(({ kind }) => kind === "APPROVAL_NEEDED")) {
    return "Decision: APPROVAL_NEEDED — exact proposal required"
  }
  if (recommendations.some(({ kind }) => kind === "INVESTIGATE")) {
    return "Decision: INVESTIGATE — no changes requested"
  }
  return "Decision: HOLD — no changes requested"
}

/**
 * Essential aggregate-only Telegram report. It deliberately excludes routine
 * platform metrics and raw attribution/search-term detail.
 */
export function formatDailyAdsBrief(
  snapshot: AdsAgentSnapshot,
  recommendations: AdsRecommendation[],
): string {
  const daily = {
    ed: serviceCampaign(snapshot.daily, "ed"),
    hairLoss: serviceCampaign(snapshot.daily, "hair_loss"),
    medCerts: serviceCampaign(snapshot.daily, "med_certs"),
    scripts: serviceCampaign(snapshot.daily, "scripts"),
    womensHealth: serviceCampaign(snapshot.daily, "womens_health"),
  }
  const rolling30 = {
    ed: serviceCampaign(snapshot.rolling30, "ed"),
    hairLoss: serviceCampaign(snapshot.rolling30, "hair_loss"),
    medCerts: serviceCampaign(snapshot.rolling30, "med_certs"),
    scripts: serviceCampaign(snapshot.rolling30, "scripts"),
    womensHealth: serviceCampaign(snapshot.rolling30, "womens_health"),
  }
  const lines = [
    `Ads · ${formatReportDate(snapshot.reportDate)} · yesterday / 30d`,
    `Tracking ${snapshot.tracking.state}`,
    formatPrimaryServiceLine({
      daily: daily.scripts,
      label: "Scripts",
      recommendation: serviceRecommendation(recommendations, "scripts"),
      rolling30: rolling30.scripts,
    }),
    formatPrimaryServiceLine({
      daily: daily.medCerts,
      label: "Med",
      rolling30: rolling30.medCerts,
    }),
    [
      formatSpecialty({
        daily: daily.hairLoss,
        label: "Hair",
        rolling30: rolling30.hairLoss,
      }),
      formatSpecialty({
        daily: daily.ed,
        label: "ED",
        rolling30: rolling30.ed,
      }),
      formatSpecialty({
        daily: daily.womensHealth,
        label: "Women",
        rolling30: rolling30.womensHealth,
      }),
    ].join(" | "),
  ]
  const guardrail = firstGuardrail(snapshot, recommendations)
  if (guardrail) lines.push(`Guardrail: ${guardrail}`)
  lines.push(decisionLine(recommendations))

  return lines.slice(0, 8).join("\n")
}
