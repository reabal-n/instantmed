import type {
  DeliveredAdsAgentRunEvidence,
  LatestDeliveredAdsAgentRunRead,
} from "@/lib/ads-agent/runs"
import type {
  AdsMutationFamily,
  AdsRecommendation,
  AdsService,
  CampaignEconomics,
} from "@/lib/ads-agent/types"
import {
  buildRevenueMilestoneProgress,
  type RevenueMilestoneProgress,
} from "@/lib/business/revenue-milestones"

const ADS_EVIDENCE_STALE_HOURS = 36
const HOUR_MS = 60 * 60 * 1000

type BusinessScaleDecision = "ACTION" | "CHECK" | "HOLD"

export type BusinessAdsActionEvidence =
  | {
      kind: "none" | "unavailable"
    }
  | {
      attributedOrders: number
      closedDays: number
      currentBudgetCents: number
      kind: "observation"
      mutationFamily: AdsMutationFamily
      requiredAttributedOrders: number
      requiredClosedDays: number
      service: AdsService
    }
  | {
      currentBudgetCents: number
      kind: "proposal_required"
      mutationFamily: AdsMutationFamily
      service: AdsService
    }
  | {
      currentValue: string
      kind: "approval_ready"
      mutationFamily: AdsMutationFamily
      proposalKey: string
      requestedValue: string
      service: AdsService
    }

export interface BusinessRevenueEvidence {
  availability: "available" | "unavailable"
  generatedAt: string | null
  netRetainedCents: number | null
  paidOrders: number | null
}

interface BusinessEconomics {
  adsNetRetainedCents: number | null
  clicksTotal: number | null
  cpaCents: number | null
  cpcCents: number | null
  firstOrderContributionCents: number | null
  netRetainedRoas: number | null
  spendCents: number | null
  stripeFeeCents: number | null
}

/**
 * One campaign's rolling-30 economics, kept per row rather than only summed.
 *
 * The aggregate alone supports exactly one decision — all ads on, or all ads
 * off — while the account's real question is which lane earns its spend. It
 * also degrades per row: `aggregateCampaignEconomics` returns null for the
 * whole account when a single campaign is incomplete, so one gap used to blank
 * every economics figure on the page.
 */
export interface BusinessCampaignRow {
  averageOrderCents: number | null
  campaignId: string
  campaignName: string
  contributionCents: number | null
  cpaCents: number | null
  isEnabled: boolean
  netRetainedCents: number | null
  orders: number | null
  spendCents: number | null
  topServiceLabel: string | null
  unavailableReasonCodes: string[]
}

export interface BusinessReadModel {
  adsAction: BusinessAdsActionEvidence
  campaigns: BusinessCampaignRow[]
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

/**
 * Clicks entered the persisted snapshot on 2026-08-05. Older delivered runs
 * simply lack the field, so clicks aggregate softly: any campaign without a
 * finite click count yields null CPC without invalidating the rest of the
 * economics aggregate the way the required fields below do.
 */
function softClicksTotal(campaigns: CampaignEconomics[]): number | null {
  let total = 0
  for (const campaign of campaigns) {
    const clicks = finiteNumber(campaign.clicks)
    if (clicks === null) return null
    total += clicks
  }
  return total
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

  const clicksTotal = softClicksTotal(campaigns)

  return {
    adsNetRetainedCents,
    clicksTotal,
    cpaCents: orders > 0 ? Math.round(spendCents / orders) : null,
    cpcCents:
      clicksTotal !== null && clicksTotal > 0
        ? Math.round(spendCents / clicksTotal)
        : null,
    firstOrderContributionCents:
      adsNetRetainedCents - stripeFeeCents - spendCents,
    netRetainedRoas: roundRatio(adsNetRetainedCents, spendCents),
    orders,
    spendCents,
    stripeFeeCents,
  }
}

const CAMPAIGN_SERVICE_LABELS: Record<string, string> = {
  account: "Account",
  ed: "ED",
  hair_loss: "Hair loss",
  med_certs: "Med certs",
  scripts: "Scripts",
  womens_health: "Women's health",
}

/** The service the campaign actually sold most of, for reading the lane's mix. */
function topServiceLabel(serviceOrders: unknown): string | null {
  if (!serviceOrders || typeof serviceOrders !== "object") return null
  let bestKey: string | null = null
  let bestCount = 0
  for (const [key, value] of Object.entries(serviceOrders as Record<string, unknown>)) {
    const count = finiteNumber(value)
    if (count === null || count <= bestCount) continue
    bestKey = key
    bestCount = count
  }
  if (bestKey === null) return null
  return CAMPAIGN_SERVICE_LABELS[bestKey] ?? bestKey
}

function buildCampaignRows(campaigns: CampaignEconomics[]): BusinessCampaignRow[] {
  return campaigns
    .filter((campaign) => campaign && typeof campaign === "object")
    .map((campaign): BusinessCampaignRow => {
      const orders = finiteNumber(campaign.orders)
      const spendCents = finiteNumber(campaign.spendCents)
      const netRetainedCents = finiteNumber(campaign.netRetainedRevenueCents)

      return {
        averageOrderCents:
          orders !== null && orders > 0 && netRetainedCents !== null
            ? Math.round(netRetainedCents / orders)
            : null,
        campaignId: String(campaign.campaignId ?? ""),
        campaignName: campaign.campaignName || String(campaign.campaignId ?? "Unknown campaign"),
        contributionCents: finiteNumber(campaign.contributionCents),
        cpaCents:
          orders !== null && orders > 0 && spendCents !== null
            ? Math.round(spendCents / orders)
            : null,
        isEnabled: campaign.campaignStatus === "ENABLED",
        netRetainedCents,
        orders,
        spendCents,
        topServiceLabel: topServiceLabel(campaign.serviceOrders),
        unavailableReasonCodes: Array.isArray(campaign.unavailableReasonCodes)
          ? campaign.unavailableReasonCodes.map(String)
          : [],
      }
    })
    // Biggest spender first: that is where a correction is worth the most.
    .sort((left, right) => (right.spendCents ?? -1) - (left.spendCents ?? -1))
}

function evidenceAgeHours(run: DeliveredAdsAgentRunEvidence, now: Date): number | null {
  const timestamp = Date.parse(run.deliveredAt)
  if (!Number.isFinite(timestamp)) return null
  return Math.max(0, Math.round(((now.getTime() - timestamp) / HOUR_MS) * 10) / 10)
}

function uniqueReasons(reasons: string[]): string[] {
  return Array.from(new Set(reasons))
}

function matchesApprovalRecommendation(
  action: BusinessAdsActionEvidence,
  recommendations: AdsRecommendation[],
): boolean {
  if (action.kind !== "approval_ready") return false
  const approvalRecommendations = recommendations.filter(
    ({ kind }) => kind === "APPROVAL_NEEDED",
  )
  return (
    approvalRecommendations.length === 1
    && approvalRecommendations[0].service === action.service
    && approvalRecommendations[0].proposedMutationFamily
      === action.mutationFamily
  )
}

export function buildBusinessReadModel(args: {
  adsAction?: BusinessAdsActionEvidence
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
  const adsAction = args.adsAction ?? { kind: "unavailable" as const }
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
    for (const recommendation of run.recommendations) {
      if (recommendation.kind !== "APPROVAL_NEEDED") {
        reasons.push(...recommendation.reasonCodes)
        continue
      }
      if (
        adsAction.kind === "observation"
        && adsAction.service === recommendation.service
        && adsAction.mutationFamily === recommendation.proposedMutationFamily
      ) {
        reasons.push("SCRIPTS_POST_CHANGE_EVIDENCE_IMMATURE")
      } else if (
        adsAction.kind === "proposal_required"
        && adsAction.service === recommendation.service
        && adsAction.mutationFamily === recommendation.proposedMutationFamily
      ) {
        reasons.push("ADS_EXACT_PROPOSAL_REQUIRED")
      } else if (matchesApprovalRecommendation(adsAction, run.recommendations)) {
        reasons.push("ADS_EXACT_PROPOSAL_READY")
      } else {
        reasons.push("ADS_ACTION_EVIDENCE_UNAVAILABLE")
      }
    }
  }

  const truthGatePassed = revenueAvailable && Boolean(run) && !stale && Boolean(aggregate) && trackingState === "GREEN"
  const economics = revenueAvailable && !stale ? aggregate : null
  const scaleDecision: BusinessScaleDecision = !truthGatePassed
    ? "HOLD"
    : matchesApprovalRecommendation(adsAction, run!.recommendations)
      ? "ACTION"
      : run!.recommendations.some(({ kind }) => kind === "INVESTIGATE")
        ? "CHECK"
        : "HOLD"

  return {
    adsAction,
    // Per-campaign rows survive staleness and partial availability: they are
    // the evidence the operator reads to decide WHICH lane to change, and the
    // page labels their age rather than hiding them.
    campaigns: run ? buildCampaignRows(run.snapshot.rolling30) : [],
    economics: economics
      ? {
          adsNetRetainedCents: economics.adsNetRetainedCents,
          clicksTotal: economics.clicksTotal,
          cpaCents: economics.cpaCents,
          cpcCents: economics.cpcCents,
          firstOrderContributionCents: economics.firstOrderContributionCents,
          netRetainedRoas: economics.netRetainedRoas,
          spendCents: economics.spendCents,
          stripeFeeCents: economics.stripeFeeCents,
        }
      : {
          adsNetRetainedCents: null,
          clicksTotal: null,
          cpaCents: null,
          cpcCents: null,
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
