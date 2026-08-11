import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getAdsAccountState,
  type GoogleAdsAccountState,
  hashGoogleAdsAccountState,
} from "@/lib/ads-agent/account-state"
import {
  getStripeFeeMap,
  type StripeFeeResult,
} from "@/lib/ads-agent/stripe-fees"
import {
  resolveSydneyClosedDay,
  resolveSydneyDateWindow,
} from "@/lib/ads-agent/time"
import type {
  AdsAccountState,
  AdsAgentSnapshot,
  AdsEconomicsTotals,
  AdsSnapshotInput,
  AdsSnapshotWindow,
  CampaignAvailabilityReason,
  CampaignEconomics,
  CampaignPortfolioEconomics,
} from "@/lib/ads-agent/types"
import { isLikelyGoogleAttributed } from "@/lib/analytics/google-ads-post-payment"
import {
  getGoogleAdsCampaignRowsForRange,
  getLocalGoogleAdsPurchasesForRange,
  getLocalGoogleAdsWindowValue,
  type GoogleAdsCampaignRow,
  type LocalGoogleAdsPurchaseRow,
} from "@/lib/analytics/google-ads-report"

const UNMAPPED_CAMPAIGN_ID = "google_ads_unmapped"
const UNMAPPED_CAMPAIGN_NAME = "Unmapped Google Ads"

interface AccountCampaign {
  budgetAmountMicros: number | null
  budgetResourceName: string | null
  campaignId: string
  campaignName: string
  campaignResourceName: string | null
  campaignStatus: string | null
  channel: string | null
}

interface LocalCampaignRollup {
  grossRevenueCents: number
  netRetainedRevenueCents: number
  orders: number
  refundCents: number
  refundedOrders: number
  rows: LocalGoogleAdsPurchaseRow[]
  serviceOrders: Record<string, number>
}

interface SpendCampaignRollup {
  campaignId: string
  campaignName: string
  campaignStatus: string | null
  channel: string | null
  clicks: number
  spendCents: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function microsToCents(value: unknown): number | null {
  const micros = asFiniteNumber(value)
  return micros == null ? null : Math.max(0, Math.round(micros / 10_000))
}

function roundRatio(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000
}

function normalizeCampaignId(value: unknown): string | null {
  const candidate = asString(value)?.replace(/-/g, "")
  return candidate && /^\d+$/.test(candidate) ? candidate : null
}

function localCampaignId(row: LocalGoogleAdsPurchaseRow): string {
  return (
    normalizeCampaignId(row.campaignid) ||
    normalizeCampaignId(row.utm_id) ||
    UNMAPPED_CAMPAIGN_ID
  )
}

function localService(row: LocalGoogleAdsPurchaseRow): string {
  const category = asString(row.category)?.toLowerCase() || ""
  const subtype = asString(row.subtype)?.toLowerCase() || ""

  if (category === "medical_certificate") return "med_certs"
  if (category === "prescription") return "scripts"
  if (category === "consult") {
    if (subtype.includes("erectile") || subtype === "ed") return "ed"
    if (subtype.includes("hair")) return "hair_loss"
    if (
      subtype.includes("women") ||
      subtype.includes("uti") ||
      subtype.includes("contracept")
    ) {
      return "womens_health"
    }
  }

  return [category, subtype].filter(Boolean).join(":") || "unknown"
}

function getAccountCampaigns(
  state: GoogleAdsAccountState | null,
): AccountCampaign[] {
  if (!state) return []

  return state.campaigns
    .map((resource): AccountCampaign | null => {
      const campaign = asRecord(resource.values.campaign)
      const budget = asRecord(resource.values.campaignBudget)
      const campaignId = normalizeCampaignId(campaign?.id)
      if (!campaignId) return null

      return {
        budgetAmountMicros: asFiniteNumber(budget?.amountMicros),
        budgetResourceName: asString(budget?.resourceName),
        campaignId,
        campaignName: asString(campaign?.name) || campaignId,
        campaignResourceName:
          asString(campaign?.resourceName) || resource.resourceName,
        campaignStatus: asString(campaign?.status),
        channel: asString(campaign?.advertisingChannelType),
      }
    })
    .filter((campaign): campaign is AccountCampaign => campaign != null)
}

function buildAccountSummary(
  state: GoogleAdsAccountState | null,
  generatedAt: string,
): AdsAccountState {
  if (!state) {
    return {
      accountHash: null,
      asOf: generatedAt,
      autoTaggingEnabled: null,
      dailyBudgetTotalCents: null,
      finalUrlSuffix: null,
      lastChangeActor: null,
      lastChangeAt: null,
    }
  }

  const enabledSearchCampaigns = getAccountCampaigns(state).filter(
    (campaign) =>
      campaign.channel === "SEARCH" && campaign.campaignStatus === "ENABLED",
  )
  const budgets = new Map<string, number>()
  let budgetsComplete = true

  for (const campaign of enabledSearchCampaigns) {
    const amountCents = microsToCents(campaign.budgetAmountMicros)
    if (!campaign.budgetResourceName || amountCents == null) {
      budgetsComplete = false
      continue
    }
    budgets.set(campaign.budgetResourceName, amountCents)
  }

  return {
    accountHash: hashGoogleAdsAccountState(state),
    asOf: state.readAt,
    autoTaggingEnabled: state.customer?.autoTaggingEnabled ?? null,
    dailyBudgetTotalCents: budgetsComplete
      ? Array.from(budgets.values()).reduce((sum, value) => sum + value, 0)
      : null,
    finalUrlSuffix: state.customer?.finalUrlSuffix ?? null,
    lastChangeActor: state.changeEvents[0]?.actorHash ?? null,
    lastChangeAt: state.changeEvents[0]?.changeDateTime ?? null,
  }
}

function aggregateSpendRows(
  rows: GoogleAdsCampaignRow[],
): Map<string, SpendCampaignRollup> {
  const spendMicros = new Map<string, number>()
  const clicksTotals = new Map<string, number>()
  const metadata = new Map<
    string,
    Omit<SpendCampaignRollup, "clicks" | "spendCents">
  >()

  for (const row of rows) {
    if (asString(row.campaign?.advertisingChannelType) !== "SEARCH") continue
    const campaignId = normalizeCampaignId(row.campaign?.id)
    if (!campaignId) continue

    spendMicros.set(
      campaignId,
      (spendMicros.get(campaignId) ?? 0) +
        (asFiniteNumber(row.metrics?.costMicros) ?? 0),
    )
    clicksTotals.set(
      campaignId,
      (clicksTotals.get(campaignId) ?? 0) +
        Math.max(0, Math.round(asFiniteNumber(row.metrics?.clicks) ?? 0)),
    )
    metadata.set(campaignId, {
      campaignId,
      campaignName: asString(row.campaign?.name) || campaignId,
      campaignStatus: asString(row.campaign?.status),
      channel: asString(row.campaign?.advertisingChannelType),
    })
  }

  return new Map(
    Array.from(spendMicros.entries()).map(([campaignId, micros]) => {
      const campaign = metadata.get(campaignId)!
      return [
        campaignId,
        {
          ...campaign,
          clicks: clicksTotals.get(campaignId) ?? 0,
          spendCents: Math.max(0, Math.round(micros / 10_000)),
        },
      ]
    }),
  )
}

function aggregateLocalRows(
  rows: LocalGoogleAdsPurchaseRow[],
  range: AdsSnapshotWindow,
): Map<string, LocalCampaignRollup> {
  const campaigns = new Map<string, LocalCampaignRollup>()

  for (const row of rows) {
    if (!isLikelyGoogleAttributed(row)) continue

    const campaignId = localCampaignId(row)
    const {
      grossRevenueCents,
      purchaseInWindow,
      refundCents,
    } = getLocalGoogleAdsWindowValue(row, range)
    if (!purchaseInWindow && refundCents === 0) continue
    const current = campaigns.get(campaignId) ?? {
      grossRevenueCents: 0,
      netRetainedRevenueCents: 0,
      orders: 0,
      refundCents: 0,
      refundedOrders: 0,
      rows: [],
      serviceOrders: {},
    }

    current.grossRevenueCents += grossRevenueCents
    current.refundCents += refundCents
    current.netRetainedRevenueCents += grossRevenueCents - refundCents
    current.orders += purchaseInWindow ? 1 : 0
    if (refundCents > 0) current.refundedOrders += 1
    if (purchaseInWindow) {
      current.rows.push(row)
      const service = localService(row)
      current.serviceOrders[service] =
        (current.serviceOrders[service] ?? 0) + 1
    }
    campaigns.set(campaignId, current)
  }

  return campaigns
}

function campaignStripeFees(args: {
  feeMap: Map<string, StripeFeeResult> | null
  local: LocalCampaignRollup
}): number | null {
  if (args.local.orders === 0) return 0
  if (!args.feeMap) return null

  let total = 0
  for (const row of args.local.rows) {
    const intakeId = asString(row.id)
    const fee = intakeId ? args.feeMap.get(intakeId) : undefined
    if (!fee || fee.status !== "available") return null
    total += fee.feeCents
  }
  return total
}

function unavailableReasons(args: {
  feesAvailable: boolean
  revenueAvailable: boolean
  spendAvailable: boolean
}): CampaignAvailabilityReason[] {
  const reasons: CampaignAvailabilityReason[] = []
  if (!args.spendAvailable) reasons.push("SPEND_UNAVAILABLE")
  if (!args.revenueAvailable) reasons.push("REVENUE_UNAVAILABLE")
  if (!args.feesAvailable) reasons.push("STRIPE_FEES_UNAVAILABLE")
  return reasons
}

function buildCampaignEconomics(args: {
  accountCampaigns: AccountCampaign[]
  feeMap: Map<string, StripeFeeResult> | null
  localRows: LocalGoogleAdsPurchaseRow[] | null
  range: AdsSnapshotWindow
  spendRows: GoogleAdsCampaignRow[] | null
}): CampaignEconomics[] {
  const account = new Map(
    args.accountCampaigns
      .filter(
        (campaign) =>
          campaign.channel === "SEARCH" &&
          campaign.campaignStatus !== "REMOVED",
      )
      .map((campaign) => [campaign.campaignId, campaign]),
  )
  const spend = args.spendRows ? aggregateSpendRows(args.spendRows) : null
  const local = args.localRows
    ? aggregateLocalRows(args.localRows, args.range)
    : null
  const campaignIds = new Set<string>([
    ...account.keys(),
    ...(spend ? spend.keys() : []),
    ...(local ? local.keys() : []),
  ])

  return Array.from(campaignIds)
    .map((campaignId): CampaignEconomics => {
      const accountCampaign = account.get(campaignId)
      const spendCampaign = spend?.get(campaignId)
      const localCampaign = local?.get(campaignId)
      const revenueAvailable = local != null
      const spendAvailable = spend != null
      const normalizedLocal = localCampaign ?? {
        grossRevenueCents: 0,
        netRetainedRevenueCents: 0,
        orders: 0,
        refundCents: 0,
        refundedOrders: 0,
        rows: [],
        serviceOrders: {},
      }
      const stripeFeeCents = revenueAvailable
        ? campaignStripeFees({
            feeMap: args.feeMap,
            local: normalizedLocal,
          })
        : null
      const feesAvailable = revenueAvailable && stripeFeeCents != null
      const spendCents = spendAvailable
        ? spendCampaign?.spendCents ?? 0
        : null
      const contributionCents =
        spendCents != null &&
        revenueAvailable &&
        stripeFeeCents != null
          ? normalizedLocal.netRetainedRevenueCents -
            stripeFeeCents -
            spendCents
          : null
      const contributionMargin =
        contributionCents != null &&
        normalizedLocal.netRetainedRevenueCents > 0
          ? roundRatio(
              contributionCents / normalizedLocal.netRetainedRevenueCents,
            )
          : null

      return {
        campaignId,
        campaignName:
          accountCampaign?.campaignName ||
          spendCampaign?.campaignName ||
          (campaignId === UNMAPPED_CAMPAIGN_ID
            ? UNMAPPED_CAMPAIGN_NAME
            : campaignId),
        campaignResourceName:
          accountCampaign?.campaignResourceName ?? null,
        campaignStatus:
          accountCampaign?.campaignStatus ??
          spendCampaign?.campaignStatus ??
          null,
        channel:
          accountCampaign?.channel ?? spendCampaign?.channel ?? null,
        clicks: spendAvailable ? spendCampaign?.clicks ?? 0 : null,
        contributionCents,
        contributionMargin,
        grossRevenueCents: revenueAvailable
          ? normalizedLocal.grossRevenueCents
          : null,
        netRetainedRevenueCents: revenueAvailable
          ? normalizedLocal.netRetainedRevenueCents
          : null,
        orders: revenueAvailable ? normalizedLocal.orders : null,
        refundCents: revenueAvailable
          ? normalizedLocal.refundCents
          : null,
        refundedOrders: revenueAvailable
          ? normalizedLocal.refundedOrders
          : null,
        refundRate:
          revenueAvailable && normalizedLocal.orders > 0
            ? roundRatio(
                normalizedLocal.refundedOrders / normalizedLocal.orders,
              )
            : null,
        serviceOrders: revenueAvailable
          ? normalizedLocal.serviceOrders
          : {},
        spendCents,
        stripeFeeCents,
        unavailableReasonCodes: unavailableReasons({
          feesAvailable,
          revenueAvailable,
          spendAvailable,
        }),
      }
    })
    .sort((left, right) => {
      if (left.spendCents == null && right.spendCents != null) return 1
      if (left.spendCents != null && right.spendCents == null) return -1
      const spendOrder = (right.spendCents ?? 0) - (left.spendCents ?? 0)
      return spendOrder || left.campaignId.localeCompare(right.campaignId)
    })
}

function sumNullable(
  campaigns: CampaignEconomics[],
  field:
    | "clicks"
    | "contributionCents"
    | "grossRevenueCents"
    | "netRetainedRevenueCents"
    | "orders"
    | "refundCents"
    | "refundedOrders"
    | "spendCents"
    | "stripeFeeCents",
): number | null {
  const values = campaigns.map((campaign) => campaign[field])
  if (values.some((value) => value == null)) return null
  return (values as number[]).reduce((sum, value) => sum + value, 0)
}

function portfolio(
  campaigns: CampaignEconomics[],
): CampaignPortfolioEconomics {
  const contributionCents = sumNullable(campaigns, "contributionCents")
  const grossRevenueCents = sumNullable(campaigns, "grossRevenueCents")
  const netRetainedRevenueCents = sumNullable(
    campaigns,
    "netRetainedRevenueCents",
  )
  const orders = sumNullable(campaigns, "orders")
  const refundCents = sumNullable(campaigns, "refundCents")
  const refundedOrders = sumNullable(campaigns, "refundedOrders")
  const spendCents = sumNullable(campaigns, "spendCents")
  const stripeFeeCents = sumNullable(campaigns, "stripeFeeCents")
  const unavailableReasonCodes = Array.from(
    new Set(campaigns.flatMap((campaign) => campaign.unavailableReasonCodes)),
  )

  return {
    campaignCount: campaigns.length,
    clicks: sumNullable(campaigns, "clicks"),
    contributionCents,
    contributionMargin:
      contributionCents != null &&
      netRetainedRevenueCents != null &&
      netRetainedRevenueCents > 0
        ? roundRatio(contributionCents / netRetainedRevenueCents)
        : null,
    grossRevenueCents,
    netRetainedRevenueCents,
    orders,
    refundCents,
    refundedOrders,
    refundRate:
      refundedOrders != null && orders != null && orders > 0
        ? roundRatio(refundedOrders / orders)
        : null,
    spendCents,
    stripeFeeCents,
    unavailableReasonCodes,
  }
}

function buildTotals(campaigns: CampaignEconomics[]): AdsEconomicsTotals {
  return {
    enabled: portfolio(
      campaigns.filter((campaign) => campaign.campaignStatus === "ENABLED"),
    ),
    paused: portfolio(
      campaigns.filter((campaign) => campaign.campaignStatus === "PAUSED"),
    ),
    other: portfolio(
      campaigns.filter(
        (campaign) =>
          campaign.campaignStatus !== "ENABLED" &&
          campaign.campaignStatus !== "PAUSED",
      ),
    ),
  }
}

const MAX_INPUT_REASON_LENGTH = 300

function input(
  result: PromiseSettledResult<unknown>,
  asOf: string,
): AdsSnapshotInput {
  if (result.status === "fulfilled") {
    return { asOf, status: "fresh" }
  }

  // Keep the rejection reason. Discarding it let a critical input (the Google
  // Ads account-state read) fail for six days with the cause recorded nowhere.
  const reason = result.reason instanceof Error
    ? result.reason.message
    : String(result.reason ?? "unknown")

  return {
    asOf,
    reason: reason.slice(0, MAX_INPUT_REASON_LENGTH),
    status: "failed",
  }
}

function fulfilledValue<T>(
  result: PromiseSettledResult<T>,
): T | null {
  return result.status === "fulfilled" ? result.value : null
}

function uniqueFeeIntakes(
  rows: LocalGoogleAdsPurchaseRow[],
  range: AdsSnapshotWindow,
): Array<{ id: string; stripePaymentIntentId: string | null }> {
  const intakes = new Map<
    string,
    { id: string; stripePaymentIntentId: string | null }
  >()

  for (const row of rows) {
    if (!isLikelyGoogleAttributed(row)) continue
    if (!getLocalGoogleAdsWindowValue(row, range).purchaseInWindow) continue
    const id = asString(row.id)
    if (!id) continue
    intakes.set(id, {
      id,
      stripePaymentIntentId: asString(row.stripe_payment_intent_id),
    })
  }

  return Array.from(intakes.values())
}

function allFeesAvailable(
  rows: LocalGoogleAdsPurchaseRow[],
  feeMap: Map<string, StripeFeeResult> | null,
  range: AdsSnapshotWindow,
): boolean {
  const attributedRows = rows.filter(
    (row) =>
      isLikelyGoogleAttributed(row) &&
      getLocalGoogleAdsWindowValue(row, range).purchaseInWindow,
  )
  if (attributedRows.length === 0) return true
  if (!feeMap) return false

  return attributedRows.every((row) => {
    const id = asString(row.id)
    return id ? feeMap.get(id)?.status === "available" : false
  })
}

export async function buildAdsAgentSnapshot(args: {
  now?: Date
  supabase: SupabaseClient
}): Promise<AdsAgentSnapshot> {
  const now = args.now ?? new Date()
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Cannot build an Ads Agent snapshot at an invalid time")
  }

  const generatedAt = now.toISOString()
  const { reportDate } = resolveSydneyClosedDay(now)
  const dailyWindow: AdsSnapshotWindow = resolveSydneyDateWindow(reportDate, 1)
  const rolling30Window: AdsSnapshotWindow = resolveSydneyDateWindow(
    reportDate,
    30,
  )

  const [
    accountResult,
    dailySpendResult,
    rollingSpendResult,
    dailyLocalResult,
    rollingLocalResult,
  ] = await Promise.allSettled([
    getAdsAccountState({ now }),
    getGoogleAdsCampaignRowsForRange(dailyWindow),
    getGoogleAdsCampaignRowsForRange(rolling30Window),
    getLocalGoogleAdsPurchasesForRange(args.supabase, dailyWindow),
    getLocalGoogleAdsPurchasesForRange(args.supabase, rolling30Window),
  ])

  const accountState = fulfilledValue(accountResult)
  const dailySpendRows = fulfilledValue(dailySpendResult)
  const rollingSpendRows = fulfilledValue(rollingSpendResult)
  const dailyLocalRows = fulfilledValue(dailyLocalResult)
  const rollingLocalRows = fulfilledValue(rollingLocalResult)
  const knownLocalRows = [
    ...(dailyLocalRows ?? []),
    ...(rollingLocalRows ?? []),
  ]
  let feeResult: PromiseSettledResult<Map<string, StripeFeeResult>>
  if (dailyLocalRows == null && rollingLocalRows == null) {
    feeResult = {
      status: "rejected",
      reason: new Error("local_revenue_unavailable"),
    }
  } else {
    const [settledFeeResult] = await Promise.allSettled([
      getStripeFeeMap({
        intakes: uniqueFeeIntakes(knownLocalRows, rolling30Window),
        supabase: args.supabase,
      }),
    ])
    feeResult = settledFeeResult
  }
  const feeMap = fulfilledValue(feeResult)
  const accountCampaigns = getAccountCampaigns(accountState)
  const daily = buildCampaignEconomics({
    accountCampaigns,
    feeMap,
    localRows: dailyLocalRows,
    range: dailyWindow,
    spendRows: dailySpendRows,
  })
  const rolling30 = buildCampaignEconomics({
    accountCampaigns,
    feeMap,
    localRows: rollingLocalRows,
    range: rolling30Window,
    spendRows: rollingSpendRows,
  })
  const feeTruthComplete =
    feeResult.status === "fulfilled" &&
    allFeesAvailable(knownLocalRows, feeMap, rolling30Window)

  return {
    reportDate,
    generatedAt,
    daily,
    rolling30,
    tracking: {
      evidenceAsOf: generatedAt,
      reasonCodes: ["TRACKING_HEALTH_NOT_CLASSIFIED"],
      scaleAllowed: false,
      state: "RED",
    },
    account: buildAccountSummary(accountState, generatedAt),
    inputs: {
      accountState: input(accountResult, accountState?.readAt ?? generatedAt),
      googleAdsDaily: input(dailySpendResult, generatedAt),
      googleAdsRolling30: input(rollingSpendResult, generatedAt),
      localDaily: input(dailyLocalResult, generatedAt),
      localRolling30: input(rollingLocalResult, generatedAt),
      stripeFees: {
        asOf: generatedAt,
        status: feeTruthComplete ? "fresh" : "failed",
      },
    },
    totals: {
      daily: buildTotals(daily),
      rolling30: buildTotals(rolling30),
    },
    windows: {
      daily: dailyWindow,
      rolling30: rolling30Window,
    },
  }
}
