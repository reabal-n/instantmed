import type {
  DeliveredAdsAgentRunEvidence,
  LatestDeliveredAdsAgentRunRead,
} from "@/lib/ads-agent/runs"
import type { CampaignEconomics } from "@/lib/ads-agent/types"
import {
  buildRevenueMilestoneProgress,
  type RevenueMilestoneProgress,
} from "@/lib/business/revenue-milestones"

const ADS_EVIDENCE_STALE_HOURS = 36
const HOUR_MS = 60 * 60 * 1000

export type BusinessScaleDecision = "ACTION" | "CHECK" | "HOLD"

export interface BusinessRevenueEvidence {
  availability: "available" | "unavailable"
  generatedAt: string | null
  netRetainedCents: number | null
  paidOrders: number | null
}

export interface BusinessEconomics {
  adsNetRetainedCents: number | null
  cpaCents: number | null
  firstOrderContributionCents: number | null
  netRetainedRoas: number | null
  spendCents: number | null
  stripeFeeCents: number | null
}

export interface BusinessReadModel {
  economics: BusinessEconomics
  evidenceAgeHours: number | null
  evidenceAsOf: string | null
  milestone: RevenueMilestoneProgress | null
  paidOrders: number | null
  reasonCodes: string[]
  revenueGeneratedAt: string | null
  rolling30NetRetainedCents: number | null
  scaleDecision: BusinessScaleDecision
  trackingState: "AMBER" | "GREEN" | "RED" | null
}

interface AggregatedEconomics extends BusinessEconomics {
  orders: number
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function roundRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 100) / 100
}

function aggregateCampaignEconomics(
  campaigns: CampaignEconomics[],
): AggregatedEconomics | null {
  if (campaigns.length === 0) return null

  let adsNetRetainedCents = 0
  let orders = 0
  let spendCents = 0
  let stripeFeeCents = 0

  for (const campaign of campaigns) {
    if (!campaign || typeof campaign !== "object") return null
    const campaignRevenue = finiteNumber(campaign.netRetainedRevenueCents)
    const campaignOrders = finiteNumber(campaign.orders)
    const campaignSpend = finiteNumber(campaign.spendCents)
    const campaignFees = finiteNumber(campaign.stripeFeeCents)
    if (
      !Array.isArray(campaign.unavailableReasonCodes) ||
      campaign.unavailableReasonCodes.length > 0 ||
      campaignRevenue === null ||
      campaignOrders === null ||
      campaignSpend === null ||
      campaignFees === null
    ) {
      return null
    }
    adsNetRetainedCents += campaignRevenue
    orders += campaignOrders
    spendCents += campaignSpend
    stripeFeeCents += campaignFees
  }

  return {
    adsNetRetainedCents,
    cpaCents: orders > 0 ? Math.round(spendCents / orders) : null,
    firstOrderContributionCents:
      adsNetRetainedCents - stripeFeeCents - spendCents,
    netRetainedRoas: roundRatio(adsNetRetainedCents, spendCents),
    orders,
    spendCents,
    stripeFeeCents,
  }
}

function evidenceAgeHours(run: DeliveredAdsAgentRunEvidence, now: Date): number | null {
  const timestamp = Date.parse(run.deliveredAt)
  if (!Number.isFinite(timestamp)) return null
  return Math.max(0, Math.round(((now.getTime() - timestamp) / HOUR_MS) * 10) / 10)
}

function uniqueReasons(reasons: string[]): string[] {
  return Array.from(new Set(reasons))
}

export function buildBusinessReadModel(args: {
  adsRun: LatestDeliveredAdsAgentRunRead
  now?: Date
  revenue: BusinessRevenueEvidence
}): BusinessReadModel {
  const now = args.now ?? new Date()
  const revenueAvailable =
    args.revenue.availability === "available" &&
    finiteNumber(args.revenue.netRetainedCents) !== null &&
    finiteNumber(args.revenue.paidOrders) !== null
  const milestone = revenueAvailable
    ? buildRevenueMilestoneProgress(args.revenue.netRetainedCents!)
    : null
  const run = args.adsRun.run
  const ageHours = run ? evidenceAgeHours(run, now) : null
  const stale = ageHours === null || ageHours > ADS_EVIDENCE_STALE_HOURS
  const aggregate = run ? aggregateCampaignEconomics(run.snapshot.rolling30) : null
  const trackingState = run?.snapshot.tracking.state ?? null
  const reasons: string[] = []

  if (!revenueAvailable) reasons.push("REVENUE_UNAVAILABLE")
  if (!run) reasons.push(`ADS_EVIDENCE_${args.adsRun.reason?.toUpperCase() ?? "UNAVAILABLE"}`)
  if (run && stale) reasons.push("ADS_EVIDENCE_STALE")
  if (run && !aggregate) reasons.push("ECONOMICS_UNAVAILABLE")
  if (run && trackingState !== "GREEN") reasons.push("TRACKING_NOT_GREEN")
  if (run) {
    reasons.push(...run.snapshot.tracking.reasonCodes)
    reasons.push(...run.recommendations.flatMap((recommendation) => recommendation.reasonCodes))
  }

  const truthGatePassed = revenueAvailable && Boolean(run) && !stale && Boolean(aggregate) && trackingState === "GREEN"
  const economics = revenueAvailable && !stale ? aggregate : null
  const scaleDecision: BusinessScaleDecision = !truthGatePassed
    ? "HOLD"
    : run!.recommendations.some(({ kind }) => kind === "APPROVAL_NEEDED")
      ? "ACTION"
      : run!.recommendations.some(({ kind }) => kind === "INVESTIGATE")
        ? "CHECK"
        : "HOLD"

  return {
    economics: economics
      ? {
          adsNetRetainedCents: economics.adsNetRetainedCents,
          cpaCents: economics.cpaCents,
          firstOrderContributionCents: economics.firstOrderContributionCents,
          netRetainedRoas: economics.netRetainedRoas,
          spendCents: economics.spendCents,
          stripeFeeCents: economics.stripeFeeCents,
        }
      : {
          adsNetRetainedCents: null,
          cpaCents: null,
          firstOrderContributionCents: null,
          netRetainedRoas: null,
          spendCents: null,
          stripeFeeCents: null,
        },
    evidenceAgeHours: ageHours,
    evidenceAsOf: run?.deliveredAt ?? null,
    milestone,
    paidOrders: revenueAvailable ? args.revenue.paidOrders : null,
    reasonCodes: uniqueReasons(reasons),
    revenueGeneratedAt: args.revenue.generatedAt,
    rolling30NetRetainedCents: revenueAvailable ? args.revenue.netRetainedCents : null,
    scaleDecision,
    trackingState,
  }
}
