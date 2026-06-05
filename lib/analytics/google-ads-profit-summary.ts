type GoogleAdsProfitCampaignInput = {
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
}

type LocalCampaignInput = {
  campaignId: string
  grossRevenueAud: number
  netRevenueAud: number
  orders: number
  refundedAud: number
  services: Record<string, number>
}

export type GoogleAdsProfitSnapshotInput = {
  ads: {
    campaigns: GoogleAdsProfitCampaignInput[]
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

export type GoogleAdsProfitStatus = "profitable" | "losing" | "no_local_orders" | "no_spend" | "unknown"

export type GoogleAdsProfitCampaign = {
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
  netProfitAud: number
  networks: string[]
  primaryService: string | null
  primaryServiceLabel: string
  purchaseCpaAud: number | null
  spendAud: number
}

export type GoogleAdsProfitSnapshot = {
  campaigns: GoogleAdsProfitCampaign[]
  generatedAt: string
  queryErrorCount: number
  range: GoogleAdsProfitSnapshotInput["range"]
  status: GoogleAdsProfitStatus
  summary: {
    avgCpcAud: number | null
    costPerLocalOrderAud: number | null
    localGrossRevenueAud: number
    localNetRevenueAud: number
    localOrders: number
    localRoas: number | null
    netProfitAud: number
    purchaseCpaAud: number | null
    purchaseRoas: number | null
    refundedAud: number
    spendAud: number
    totalClicks: number
  }
}

export const EMPTY_GOOGLE_ADS_PROFIT_SNAPSHOT: GoogleAdsProfitSnapshot = {
  campaigns: [],
  generatedAt: "",
  queryErrorCount: 0,
  range: {
    days: 30,
    endDate: "",
    startDate: "",
  },
  status: "unknown",
  summary: {
    avgCpcAud: null,
    costPerLocalOrderAud: null,
    localGrossRevenueAud: 0,
    localNetRevenueAud: 0,
    localOrders: 0,
    localRoas: null,
    netProfitAud: 0,
    purchaseCpaAud: null,
    purchaseRoas: null,
    refundedAud: 0,
    spendAud: 0,
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

function profitStatus({
  localNetRevenueAud,
  localOrders,
  spendAud,
}: {
  localNetRevenueAud: number
  localOrders: number
  spendAud: number
}): GoogleAdsProfitStatus {
  if (spendAud <= 0 && localOrders <= 0) return "no_spend"
  if (spendAud <= 0) return "profitable"
  if (localOrders <= 0) return "no_local_orders"
  return localNetRevenueAud >= spendAud ? "profitable" : "losing"
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

export function buildGoogleAdsProfitSnapshot(
  report: GoogleAdsProfitSnapshotInput,
  campaignLimit = 5,
): GoogleAdsProfitSnapshot {
  const localByCampaign = new Map(report.local.byCampaign.map((campaign) => [campaign.campaignId, campaign]))
  const spendAud = report.ads.summary.totalSpendAud
  const localNetRevenueAud = report.local.summary.netRevenueAud
  const localOrders = report.local.summary.orders

  return {
    campaigns: report.ads.campaigns
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
          netProfitAud: roundMoney(campaign.localNetRevenueAud - campaign.spendAud),
          networks: campaign.networks,
          primaryService,
          primaryServiceLabel: serviceLabel(primaryService),
          purchaseCpaAud: campaign.purchaseCpaAud,
          spendAud: campaign.spendAud,
        }
      }),
    generatedAt: report.generatedAt,
    queryErrorCount: report.queryErrors.length,
    range: report.range,
    status: profitStatus({ localNetRevenueAud, localOrders, spendAud }),
    summary: {
      avgCpcAud: report.ads.summary.avgCpcAud,
      costPerLocalOrderAud: divideMoney(spendAud, localOrders),
      localGrossRevenueAud: report.local.summary.grossRevenueAud,
      localNetRevenueAud,
      localOrders,
      localRoas: divideRatio(localNetRevenueAud, spendAud),
      netProfitAud: roundMoney(localNetRevenueAud - spendAud),
      purchaseCpaAud: report.ads.summary.purchaseCpaAud,
      purchaseRoas: report.ads.summary.purchaseRoas,
      refundedAud: report.local.summary.refundedAud,
      spendAud,
      totalClicks: report.ads.summary.totalClicks,
    },
  }
}
