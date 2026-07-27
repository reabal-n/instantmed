export type TrackingState = "GREEN" | "AMBER" | "RED"
export type RecommendationKind =
  | "HOLD"
  | "INVESTIGATE"
  | "APPROVAL_NEEDED"

export type AdsMutationFamily =
  | "campaign_status"
  | "campaign_budget"
  | "campaign_bidding"
  | "ad_group_cpc_bid"
  | "ad_status"
  | "keyword_status"
  | "negative_keyword"
  | "asset_link_status"
  | "schedule_replace"

export type AdsService =
  | "med_certs"
  | "scripts"
  | "ed"
  | "hair_loss"
  | "womens_health"
  | "account"

export interface TrackingHealth {
  evidenceAsOf: string
  reasonCodes: string[]
  scaleAllowed: boolean
  state: TrackingState
}

export interface AdsAccountState {
  accountHash: string | null
  asOf: string
  autoTaggingEnabled: boolean | null
  dailyBudgetTotalCents: number | null
  finalUrlSuffix: string | null
  lastChangeActor: string | null
  lastChangeAt: string | null
}

export type CampaignAvailabilityReason =
  | "SPEND_UNAVAILABLE"
  | "REVENUE_UNAVAILABLE"
  | "STRIPE_FEES_UNAVAILABLE"

export interface CampaignEconomics {
  campaignId: string
  campaignName: string
  campaignResourceName: string | null
  campaignStatus: string | null
  channel: string | null
  contributionCents: number | null
  contributionMargin: number | null
  grossRevenueCents: number | null
  netRetainedRevenueCents: number | null
  orders: number | null
  refundCents: number | null
  refundedOrders: number | null
  refundRate: number | null
  serviceOrders: Record<string, number>
  spendCents: number | null
  stripeFeeCents: number | null
  unavailableReasonCodes: CampaignAvailabilityReason[]
}

export interface CampaignPortfolioEconomics {
  campaignCount: number
  contributionCents: number | null
  contributionMargin: number | null
  grossRevenueCents: number | null
  netRetainedRevenueCents: number | null
  orders: number | null
  refundCents: number | null
  refundedOrders: number | null
  refundRate: number | null
  spendCents: number | null
  stripeFeeCents: number | null
  unavailableReasonCodes: CampaignAvailabilityReason[]
}

export interface AdsEconomicsTotals {
  enabled: CampaignPortfolioEconomics
  other: CampaignPortfolioEconomics
  paused: CampaignPortfolioEconomics
}

export interface AdsSnapshotWindow {
  endDate: string
  endUtcExclusive: string
  startDate: string
  startUtc: string
}

export interface AdsSnapshotInput {
  asOf: string
  status: "fresh" | "stale" | "failed"
}

export interface AdsAgentSnapshot {
  account: AdsAccountState
  daily: CampaignEconomics[]
  generatedAt: string
  inputs: Record<string, AdsSnapshotInput>
  reportDate: string
  rolling30: CampaignEconomics[]
  totals: {
    daily: AdsEconomicsTotals
    rolling30: AdsEconomicsTotals
  }
  tracking: TrackingHealth
  windows: {
    daily: AdsSnapshotWindow
    rolling30: AdsSnapshotWindow
  }
}

export interface AdsRecommendation {
  kind: RecommendationKind
  proposedMutationFamily: AdsMutationFamily | null
  reasonCodes: string[]
  service: AdsService
}
