type GoogleAdsReturnCampaignInput = {
  campaignId: string
  campaignName: string
  channel: string | null
  clicks: number
  costPerLocalOrderAud: number | null
  devices: string[]
  localGrossRevenueAud: number
  localNetRevenueAud: number
  localOrders: number
  localRefundedAud: number
  networks: string[]
  purchaseCpaAud: number | null
  purchaseRoas: number | null
  spendAud: number
  status: string | null
}

type LocalCampaignInput = {
  campaignId: string
  grossRevenueAud: number
  netRevenueAud: number
  orders: number
  refundedAud: number
  services: Record<string, number>
}

export type GoogleAdsReturnSnapshotInput = {
  ads: {
    campaigns: GoogleAdsReturnCampaignInput[]
    summary: {
      avgCpcAud: number | null
      purchaseCpaAud: number | null
      purchaseRoas: number | null
      totalClicks: number
      totalLocalGrossRevenueAud: number
      totalLocalNetRevenueAud: number
      totalLocalOrders: number
      totalSpendAud: number
    }
  }
  generatedAt: string
  local: {
    byCampaign: LocalCampaignInput[]
    summary: {
      grossRevenueAud: number
      netRevenueAud: number
      orders: number
      refundedAud: number
    }
  }
  queryErrors: Array<{ name: string; error: string }>
  range: {
    days: number
    endDate: string
    startDate: string
  }
}

export type GoogleAdsReturnStatus = "revenue_above_spend" | "revenue_below_spend" | "no_local_orders" | "no_spend" | "unknown"
export type GoogleAdsCampaignState = "enabled" | "paused" | "mixed" | "unknown"
export type GoogleAdsReturnMetricsAvailability = "available" | "unavailable"

export type GoogleAdsReturnCampaign = {
  campaignId: string
  campaignName: string
  channel: string | null
  clicks: number
  costPerLocalOrderAud: number | null
  devices: string[]
  localNetRevenueAud: number
  localOrders: number
  localRefundedAud: number
  localRoas: number | null
  revenueAfterAdSpendAud: number
  networks: string[]
  primaryService: string | null
  primaryServiceLabel: string
  purchaseCpaAud: number | null
  spendAud: number
  status: string | null
}

export type GoogleAdsReturnSnapshot = {
  campaigns: GoogleAdsReturnCampaign[]
  campaignState: GoogleAdsCampaignState
  generatedAt: string
  queryErrorCount: number
  queryErrorNames: string[]
  range: GoogleAdsReturnSnapshotInput["range"]
  returnMetricsAvailability: GoogleAdsReturnMetricsAvailability
  status: GoogleAdsReturnStatus
  summary: {
    avgCpcAud: number | null
    costPerLocalOrderAud: number | null
    localGrossRevenueAud: number
    localNetRevenueAud: number
    localOrders: number
    localRoas: number | null
    revenueAfterAdSpendAud: number | null
    purchaseCpaAud: number | null
    purchaseRoas: number | null
    refundedAud: number
    spendAud: number | null
    totalClicks: number
  }
}

export const EMPTY_GOOGLE_ADS_RETURN_SNAPSHOT: GoogleAdsReturnSnapshot = {
  campaigns: [],
  campaignState: "unknown",
  generatedAt: "",
  queryErrorCount: 0,
  queryErrorNames: [],
  range: {
    days: 30,
    endDate: "",
    startDate: "",
  },
  returnMetricsAvailability: "unavailable",
  status: "unknown",
  summary: {
    avgCpcAud: null,
    costPerLocalOrderAud: null,
    localGrossRevenueAud: 0,
    localNetRevenueAud: 0,
    localOrders: 0,
    localRoas: null,
    revenueAfterAdSpendAud: null,
    purchaseCpaAud: null,
    purchaseRoas: null,
    refundedAud: 0,
    spendAud: null,
    totalClicks: 0,
  },
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundRatio(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000
}

function divideMoney(numerator: number, denominator: number): number | null {
  return denominator > 0 ? roundMoney(numerator / denominator) : null
}

function divideRatio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? roundRatio(numerator / denominator) : null
}

function returnStatus({
  localNetRevenueAud,
  localOrders,
  spendAud,
}: {
  localNetRevenueAud: number
  localOrders: number
  spendAud: number
}): GoogleAdsReturnStatus {
  if (spendAud <= 0 && localOrders <= 0) return "no_spend"
  if (spendAud <= 0) return "revenue_above_spend"
  if (localOrders <= 0) return "no_local_orders"
  return localNetRevenueAud >= spendAud ? "revenue_above_spend" : "revenue_below_spend"
}

function primaryServiceForCampaign(localCampaign?: LocalCampaignInput): string | null {
  if (!localCampaign) return null
  const [service] = Object.entries(localCampaign.services)
    .sort((a, b) => b[1] - a[1])[0] ?? []
  return service || null
}

function serviceLabel(service: string | null): string {
  if (service === "medical-certificate" || service === "med_cert") return "Medical certificate"
  if (service === "repeat-script" || service === "prescription") return "Repeat prescription"
  if (service === "consult") return "Consult"
  if (service === "ed") return "ED assessment"
  if (service === "hair_loss" || service === "hair-loss") return "Hair loss"
  return service || "No local order"
}

function campaignState(campaigns: GoogleAdsReturnCampaignInput[]): GoogleAdsCampaignState {
  const statuses = new Set(campaigns.map((campaign) => campaign.status?.toUpperCase()).filter(Boolean))
  const hasEnabled = statuses.has("ENABLED")
  const hasPaused = statuses.has("PAUSED")
  if (hasEnabled && hasPaused) return "mixed"
  if (hasEnabled) return "enabled"
  if (hasPaused) return "paused"
  return "unknown"
}

export function buildGoogleAdsReturnSnapshot(
  report: GoogleAdsReturnSnapshotInput,
  campaignLimit = 5,
): GoogleAdsReturnSnapshot {
  const localByCampaign = new Map(report.local.byCampaign.map((campaign) => [campaign.campaignId, campaign]))
  const queryErrorNames = Array.from(new Set(report.queryErrors.map((error) => error.name))).sort()
  const returnMetricsAvailability: GoogleAdsReturnMetricsAvailability = queryErrorNames.includes("campaign_performance")
    ? "unavailable"
    : "available"
  const spendAud = returnMetricsAvailability === "available"
    ? report.ads.summary.totalSpendAud
    : null
  const localNetRevenueAud = report.local.summary.netRevenueAud
  const localOrders = report.local.summary.orders

  return {
    campaigns: (returnMetricsAvailability === "available" ? report.ads.campaigns : [])
      .slice(0, campaignLimit)
      .map((campaign) => {
        const primaryService = primaryServiceForCampaign(localByCampaign.get(campaign.campaignId))

        return {
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          channel: campaign.channel,
          clicks: campaign.clicks,
          costPerLocalOrderAud: campaign.costPerLocalOrderAud,
          devices: campaign.devices,
          localNetRevenueAud: campaign.localNetRevenueAud,
          localOrders: campaign.localOrders,
          localRefundedAud: campaign.localRefundedAud,
          localRoas: divideRatio(campaign.localNetRevenueAud, campaign.spendAud),
          revenueAfterAdSpendAud: roundMoney(campaign.localNetRevenueAud - campaign.spendAud),
          networks: campaign.networks,
          primaryService,
          primaryServiceLabel: serviceLabel(primaryService),
          purchaseCpaAud: campaign.purchaseCpaAud,
          spendAud: campaign.spendAud,
          status: campaign.status,
        }
      }),
    campaignState: returnMetricsAvailability === "available"
      ? campaignState(report.ads.campaigns)
      : "unknown",
    generatedAt: report.generatedAt,
    queryErrorCount: report.queryErrors.length,
    queryErrorNames,
    range: report.range,
    returnMetricsAvailability,
    status: spendAud === null
      ? "unknown"
      : returnStatus({ localNetRevenueAud, localOrders, spendAud }),
    summary: {
      avgCpcAud: report.ads.summary.avgCpcAud,
      costPerLocalOrderAud: spendAud === null ? null : divideMoney(spendAud, localOrders),
      localGrossRevenueAud: report.local.summary.grossRevenueAud,
      localNetRevenueAud,
      localOrders,
      localRoas: spendAud === null ? null : divideRatio(localNetRevenueAud, spendAud),
      revenueAfterAdSpendAud: spendAud === null ? null : roundMoney(localNetRevenueAud - spendAud),
      purchaseCpaAud: report.ads.summary.purchaseCpaAud,
      purchaseRoas: report.ads.summary.purchaseRoas,
      refundedAud: report.local.summary.refundedAud,
      spendAud,
      totalClicks: report.ads.summary.totalClicks,
    },
  }
}
