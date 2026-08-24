export type TrackingState = "GREEN" | "AMBER" | "RED"
export type RecommendationKind =
  | "HOLD"
  | "INVESTIGATE"
  | "APPROVAL_NEEDED"

export type AdsMutationFamily =
  | "campaign_create"
  | "campaign_status"
  | "campaign_budget"
  | "campaign_bidding"
  | "ad_group_cpc_bid"
  | "ad_status"
  | "keyword_status"
  | "negative_keyword"
  | "shared_negative_list"
  | "asset_link_status"
  | "schedule_replace"
  | "responsive_search_ad_create"
  | "positive_keyword_create"

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
  /** Optional on historical snapshots created before campaign configuration was bound. */
  biddingStrategyType?: string | null
  /** Optional on historical snapshots; exact micros from the campaign budget resource. */
  budgetAmountMicros?: number | null
  /** Optional on historical snapshots; binds economic evidence to one live budget. */
  budgetResourceName?: string | null
  campaignId: string
  campaignName: string
  campaignResourceName: string | null
  campaignStatus: string | null
  channel: string | null
  /** Absent on runs delivered before 2026-08-05; readers must treat missing as null. */
  clicks?: number | null
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
  /** Campaign-native target ROAS; null means the strategy has no explicit floor. */
  targetRoas?: number | null
  unavailableReasonCodes: CampaignAvailabilityReason[]
}

export interface CampaignPortfolioEconomics {
  campaignCount: number
  /** Absent on runs delivered before 2026-08-05; readers must treat missing as null. */
  clicks?: number | null
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
  /**
   * Why a `failed` input failed, bounded and PHI-free (these are Google Ads /
   * Supabase API errors). Persisted with the run so a silently degraded input
   * is diagnosable from the stored evidence instead of being invisible.
   */
  reason?: string
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
