import type {
  AdsAgentSnapshot,
  AdsOperationalHold,
  AdsOperationalHoldReason,
  AdsOperationalQueueEvidence,
  AdsOperationalService,
  AdsRecommendation,
  AdsService,
  CampaignEconomics,
  ManualGrowthHealthEvidence,
} from "@/lib/ads-agent/types"

const SPECIALTY_SERVICES = [
  "ed",
  "hair_loss",
  "womens_health",
] as const satisfies readonly AdsService[]

const SERVICE_ORDER = [
  "med_certs",
  "scripts",
  ...SPECIALTY_SERVICES,
] as const satisfies readonly AdsService[]

export const POLICY = {
  attribution: {
    minimumExpectedServiceOrderShare: 0.90,
  },
  ed: {
    dailyBudgetCents: 1_200,
    pilot: {
      initialCpcCeilingCents: 300,
      investigateClicks: 10,
      maximumDays: 30,
      maximumDaysStatus: "inactive_requires_campaign_scoped_start",
      maximumLossCents: 15_000,
      pauseProposalClicks: 30,
    },
  },
  hairLoss: {
    dailyBudgetCents: 1_000,
    pilot: {
      futureRelaunch: {
        maximumIncrementalLossCents: 6_000,
        maximumIncrementalLossStatus:
          "inactive_requires_campaign_scoped_baseline",
        persistedCheckoutProgressionClicks: 10,
        persistedCheckoutProgressionStatus:
          "inactive_requires_campaign_scoped_progression",
        stopPrecedence: [
          "campaign_scoped_incremental_loss",
          "zero_retained_order_clicks",
          "campaign_scoped_duration",
        ],
      },
      initialCpcCeilingCents: 300,
      investigateClicks: 10,
      maximumDays: 30,
      maximumDaysStatus: "inactive_requires_campaign_scoped_start",
      maximumLossCents: 15_000,
      pauseProposalClicks: 20,
    },
  },
  keywords: {
    broadMatchPositivesAllowed: false,
    medicineNamesAllowed: false,
  },
  operations: {
    manualEvidenceFreshDays: 7,
    queueReviewHours: 6,
    queueOldestReviewHours: 20,
    queueTargetHours: 2,
    supportContactsPer100Review: 5,
  },
  medCerts: {
    dailyBudgetCents: 2_000,
    targetCpaCents: 2_200,
  },
  scripts: {
    dailyBudgetCents: 4_000,
    scale: {
      budgetStepTiers: [
        { maximumBudgetStep: 0.50, name: "positive" },
      ],
      initialTargetRoas: 1.35,
      maximumBudgetStep: 0.50,
      refundRateReviewThreshold: 0.10,
      smallSampleOrderThreshold: 10,
    },
  },
  womensHealth: {
    dailyBudgetCents: 2_000,
    pilot: {
      initialCpcCeilingCents: 300,
      investigateClicks: 10,
      maximumDays: 30,
      maximumDaysStatus: "inactive_requires_campaign_scoped_start",
      maximumLossCents: 15_000,
      pauseProposalClicks: 30,
    },
  },
} as const

const DAY_MS = 24 * 60 * 60 * 1000

interface ResolveAdsOperationalHoldInput {
  affectedService: AdsOperationalService
  clinicalIncident: boolean
  explicitServiceHold: boolean
  fulfilmentHealthy: boolean
  manualEvidence: ManualGrowthHealthEvidence
  now: Date
  queue: AdsOperationalQueueEvidence
}

function isFreshManualEvidence(
  asOf: string | undefined,
  now: Date,
): boolean {
  const asOfMs = Date.parse(asOf ?? "")
  const nowMs = now.getTime()
  const ageMs = nowMs - asOfMs
  return (
    Number.isFinite(nowMs)
    && Number.isFinite(asOfMs)
    && ageMs >= 0
    && ageMs <= POLICY.operations.manualEvidenceFreshDays * DAY_MS
  )
}

function isNonNegativeFinite(value: number | null): boolean {
  return value === null || Number.isFinite(value) && value >= 0
}

/**
 * Converts aggregate queue and manually verified operating facts into one
 * service-level gate. Optional manual facts create a hold only when fresh,
 * verified evidence crosses a stop boundary. Missing optional facts are not
 * evidence of harm. Queue and workload signals are advisory, never commercial vetoes.
 */
export function resolveAdsOperationalHold(
  input: ResolveAdsOperationalHoldInput,
): AdsOperationalHold {
  const reasons: AdsOperationalHoldReason[] = []
  let hasHardHold = false
  let hasUnavailableEvidence = input.queue.availability === "unavailable"
  let hasWatch = false

  const addHardHold = (reason: AdsOperationalHoldReason) => {
    hasHardHold = true
    reasons.push(reason)
  }

  if (input.clinicalIncident) addHardHold("clinical_incident")
  if (input.explicitServiceHold) addHardHold("explicit_service_hold")
  if (!input.fulfilmentHealthy) addHardHold("fulfilment_unhealthy")

  const queueValuesValid = [
    input.queue.oldestUnresolvedHours,
    input.queue.p95ReviewHours,
    input.queue.review24hBreaches,
  ].every(isNonNegativeFinite)
  if (!queueValuesValid) hasUnavailableEvidence = true

  if (
    queueValuesValid
    && input.queue.p95ReviewHours !== null
    && input.queue.p95ReviewHours >= POLICY.operations.queueReviewHours
  ) {
    hasWatch = true
    reasons.push("queue_p95_at_or_over_6h")
  }
  if (
    queueValuesValid
    && input.queue.oldestUnresolvedHours !== null
    && input.queue.oldestUnresolvedHours
      >= POLICY.operations.queueOldestReviewHours
  ) {
    hasWatch = true
    reasons.push("queue_oldest_at_or_over_20h")
  }
  if (
    queueValuesValid
    && input.queue.review24hBreaches !== null
    && input.queue.review24hBreaches > 0
  ) {
    hasWatch = true
    reasons.push("queue_24h_breach")
  }

  const support = input.manualEvidence.support
  const supportFresh = support !== null
    && support.source === "verified_gmail_aggregate"
    && Number.isFinite(support.contactsPer100Paid)
    && support.contactsPer100Paid >= 0
    && isFreshManualEvidence(support.asOf, input.now)
  if (
    supportFresh
    && support.contactsPer100Paid
      > POLICY.operations.supportContactsPer100Review
  ) {
    hasWatch = true
    reasons.push("support_over_5_per_100")
  }

  const clinicalQa = input.manualEvidence.clinicalQa
  const clinicalQaFresh = clinicalQa !== null
    && clinicalQa.source === "medical_director_completed_review"
    && isFreshManualEvidence(clinicalQa.asOf, input.now)
  if (clinicalQaFresh && clinicalQa.state === "behind") {
    hasWatch = true
    reasons.push("clinical_qa_lag")
  }

  if (
    queueValuesValid
    && input.queue.p95ReviewHours !== null
    && input.queue.p95ReviewHours > POLICY.operations.queueTargetHours
    && input.queue.p95ReviewHours < POLICY.operations.queueReviewHours
  ) {
    hasWatch = true
    reasons.push("queue_p95_over_2h_watch")
  }

  return {
    affectedService: input.affectedService,
    reasons,
    state: hasHardHold
      ? "hold"
      : hasUnavailableEvidence
        ? "unavailable"
        : hasWatch
          ? "watch"
          : "clear",
  }
}

export type ScriptsScaleTier =
  (typeof POLICY.scripts.scale.budgetStepTiers)[number]

export interface ScriptsBudgetScaleAuthorization {
  maximumNextMicros: number
  tier: ScriptsScaleTier["name"]
  advisoryReasonCodes: string[]
}

function firstOrderEconomicsAvailable(campaign: CampaignEconomics): boolean {
  const first = campaign.firstOrder
  return !!first
    && [first.contributionCents, first.netRetainedRevenueCents, first.stripeFeeCents, first.orders]
      .every((value) => value != null && Number.isSafeInteger(value))
    && first.stripeFeeCents! >= 0 && first.orders! >= 0
    && campaign.spendCents != null && Number.isSafeInteger(campaign.spendCents) && campaign.spendCents >= 0
    && first.contributionCents === first.netRetainedRevenueCents! - first.stripeFeeCents! - campaign.spendCents
}

export function authorizeScriptsScaleEligibility(campaign: CampaignEconomics): ScriptsScaleTier {
  if (economicsUnavailable(campaign) || !firstOrderEconomicsAvailable(campaign)) {
    throw new Error("scripts_scale_economics_unavailable")
  }
  if (campaign.firstOrder!.contributionCents! <= 0 || campaign.firstOrder!.orders! <= 0) {
    throw new Error("scripts_first_order_contribution_not_positive")
  }
  return POLICY.scripts.scale.budgetStepTiers[0]
}

export function authorizeScriptsBudgetScale(args: {
  campaign: CampaignEconomics
  closedDaysAfterPreviousChange?: number | null
  expectedMicros: number
  nextMicros: number
  ordersAfterPreviousChange?: number | null
}): ScriptsBudgetScaleAuthorization {
  const { campaign } = args
  if (
    campaign.budgetAmountMicros == null
    || campaign.budgetResourceName == null
    || campaign.budgetAmountMicros !== args.expectedMicros
  ) {
    throw new Error("scripts_budget_evidence_mismatch")
  }
  if (
    campaign.biddingStrategyType !== "MAXIMIZE_CONVERSION_VALUE"
    || campaign.targetRoas == null
    || campaign.targetRoas < POLICY.scripts.scale.initialTargetRoas
  ) {
    throw new Error("scripts_troas_floor_missing")
  }
  if (
    campaign.netRetainedRevenueCents == null
    || campaign.spendCents == null
    || campaign.stripeFeeCents == null
  ) {
    throw new Error("scripts_scale_economics_unavailable")
  }
  const tier = authorizeScriptsScaleEligibility(campaign)

  // Preserve at least one cent of measured first-order cash contribution.
  const maximumWindowSpendCents = campaign.firstOrder!.netRetainedRevenueCents!
    - campaign.firstOrder!.stripeFeeCents! - 1
  if (campaign.spendCents <= 0 || maximumWindowSpendCents <= 0) {
    throw new Error("scripts_scale_economic_ceiling_unavailable")
  }
  const tierMaximumMicros = Math.floor(
    args.expectedMicros * (1 + tier.maximumBudgetStep),
  )
  const economicMaximumMicros = Math.floor(
    args.expectedMicros * maximumWindowSpendCents / campaign.spendCents,
  )
  const maximumNextMicros = Math.min(
    tierMaximumMicros,
    economicMaximumMicros,
  )
  if (args.nextMicros > maximumNextMicros) {
    throw new Error("scripts_budget_authorization_exceeded")
  }

  const advisoryReasonCodes = [
    ...(campaign.firstOrder!.orders! < POLICY.scripts.scale.smallSampleOrderThreshold ? ["SMALL_SAMPLE_UNCERTAINTY"] : []),
    ...(args.closedDaysAfterPreviousChange != null || args.ordersAfterPreviousChange != null
      ? ["RECENT_CHANGE_MONITORING"] : []),
  ]
  return { maximumNextMicros, tier: tier.name, advisoryReasonCodes }
}

export const PROHIBITED_PAID_MEDICINE_TERMS = [
  "amlodipine",
  "atorvastatin",
  "cialis",
  "duromine",
  "dutasteride",
  "finasteride",
  "minoxidil",
  "mounjaro",
  "nitrofurantoin",
  "ozempic",
  "perindopril",
  "phentermine",
  "ramipril",
  "rosuvastatin",
  "semaglutide",
  "seretide",
  "sildenafil",
  "symbicort",
  "tadalafil",
  "tirzepatide",
  "trimethoprim",
  "valium",
  "ventolin",
  "viagra",
  "wegovy",
  "xanax",
] as const

const PROHIBITED_PAID_MEDICINE_TERM_PATTERN = new RegExp(
  `\\b(?:${PROHIBITED_PAID_MEDICINE_TERMS.join("|")})\\b`,
  "i",
)

export function containsProhibitedPaidMedicineTerm(value: string): boolean {
  return PROHIBITED_PAID_MEDICINE_TERM_PATTERN.test(value)
}

function hold(
  service: AdsService,
  ...reasonCodes: string[]
): AdsRecommendation {
  return {
    kind: "HOLD",
    proposedMutationFamily: null,
    reasonCodes,
    service,
  }
}

function investigate(
  service: AdsService,
  ...reasonCodes: string[]
): AdsRecommendation {
  return {
    kind: "INVESTIGATE",
    proposedMutationFamily: null,
    reasonCodes,
    service,
  }
}

type CampaignServiceIdentity = Pick<CampaignEconomics, "campaignName">
  & Partial<Pick<CampaignEconomics, "serviceOrders">>

function normalizedCampaignName(campaign: CampaignServiceIdentity): string {
  return campaign.campaignName
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .toLowerCase()
}

export function resolveAdsCampaignService(
  campaign: CampaignServiceIdentity,
): AdsService | null {
  const name = normalizedCampaignName(campaign)

  if (name.includes("med cert") || name.includes("medical cert")) {
    return "med_certs"
  }
  if (name.includes("script") || name.includes("prescription")) {
    return "scripts"
  }
  if (name.includes("hair loss")) {
    return "hair_loss"
  }
  if (
    name.includes("womens health")
    || name.includes("women health")
    || name.includes("contraception")
    || /(?:^|\W)uti(?:\W|$)/.test(name)
  ) {
    return "womens_health"
  }
  if (/(?:^|\W)ed(?:\W|$)/.test(name)) {
    return "ed"
  }

  const attributedServices = Object.entries(campaign.serviceOrders ?? {})
    .filter(([, orders]) => orders > 0)
    .map(([service]) => service)
    .filter((service): service is AdsService =>
      SERVICE_ORDER.includes(service as (typeof SERVICE_ORDER)[number]),
    )

  return attributedServices.length === 1 ? attributedServices[0] : null
}

function groupedCampaigns(
  snapshot: AdsAgentSnapshot,
): Map<AdsService, CampaignEconomics[]> {
  const campaigns = new Map<AdsService, CampaignEconomics[]>()

  for (const campaign of snapshot.rolling30) {
    if (campaign.channel !== "SEARCH" || campaign.campaignStatus === "REMOVED") {
      continue
    }
    const service = resolveAdsCampaignService(campaign)
    if (!service || service === "account") continue
    const existing = campaigns.get(service) ?? []
    existing.push(campaign)
    campaigns.set(service, existing)
  }

  return campaigns
}

export function hasBlockingAdsOperationalEvidence(hold: AdsOperationalHold): boolean {
  return hold.reasons.some((reason) => ["clinical_incident", "explicit_service_hold", "fulfilment_unhealthy"].includes(reason))
}

function operationalReasonCodes(hold: AdsOperationalHold): string[] {
  const reasonCodes = hold.reasons.map((reason) => reason.toUpperCase())
  return reasonCodes.length > 0
    ? reasonCodes
    : ["OPERATIONAL_EVIDENCE_UNAVAILABLE"]
}

function operationalHoldForService(
  snapshot: AdsAgentSnapshot,
  service: AdsOperationalService,
): AdsOperationalHold | null {
  return snapshot.operational?.holds.find(
    (candidate) => candidate.affectedService === service,
  ) ?? null
}

function campaignHasMaterialCrossServiceOrders(
  campaign: CampaignEconomics,
  expectedService: AdsService,
): boolean {
  let expectedServiceOrders = 0
  let recognizedServiceOrders = 0

  for (const [service, orders] of Object.entries(campaign.serviceOrders)) {
    if (
      orders <= 0
      || !SERVICE_ORDER.includes(service as (typeof SERVICE_ORDER)[number])
    ) {
      continue
    }
    recognizedServiceOrders += orders
    if (service === expectedService) expectedServiceOrders += orders
  }

  if (recognizedServiceOrders === expectedServiceOrders) return false
  return expectedServiceOrders / recognizedServiceOrders
    < POLICY.attribution.minimumExpectedServiceOrderShare
}

function economicsUnavailable(campaign: CampaignEconomics): boolean {
  return (
    campaign.contributionCents == null
    || campaign.orders == null
    || campaign.refundRate == null && campaign.orders > 0
    || campaign.spendCents == null
    || campaign.stripeFeeCents == null
    || campaign.unavailableReasonCodes.length > 0
  )
}

function profitRecommendation(service: AdsService, campaign: CampaignEconomics): AdsRecommendation | null {
  if (campaign.campaignStatus !== "ENABLED") return hold(service, inactiveCampaignReason(campaign.campaignStatus))
  if (!firstOrderEconomicsAvailable(campaign)) return investigate(service, "ECONOMICS_UNAVAILABLE")
  if (campaign.firstOrder!.contributionCents! <= 0 || campaign.firstOrder!.orders! <= 0) return null
  return {
    kind: "APPROVAL_NEEDED",
    proposedMutationFamily: service === "scripts" && !(
      campaign.biddingStrategyType === "MAXIMIZE_CONVERSION_VALUE"
      && campaign.targetRoas != null && campaign.targetRoas >= POLICY.scripts.scale.initialTargetRoas
    ) ? "campaign_bidding" : "campaign_budget",
    reasonCodes: [
      "FIRST_ORDER_CONTRIBUTION_POSITIVE",
      ...(campaign.firstOrder!.orders! < POLICY.scripts.scale.smallSampleOrderThreshold ? ["SMALL_SAMPLE_UNCERTAINTY"] : []),
    ],
    service,
  }
}

function evaluateScripts(campaign: CampaignEconomics): AdsRecommendation {
  if (economicsUnavailable(campaign)) return investigate("scripts", "ECONOMICS_UNAVAILABLE")
  return profitRecommendation("scripts", campaign) ?? hold("scripts", "FIRST_ORDER_CONTRIBUTION_NOT_POSITIVE")
}

function evaluateMedCerts(campaign: CampaignEconomics): AdsRecommendation {
  if (economicsUnavailable(campaign)) {
    return investigate("med_certs", "ECONOMICS_UNAVAILABLE")
  }
  if (campaign.contributionCents! < 0) {
    return hold("med_certs", "MEDCERT_NEGATIVE_CONTRIBUTION")
  }
  return profitRecommendation("med_certs", campaign) ?? hold("med_certs", "FIRST_ORDER_CONTRIBUTION_NOT_POSITIVE")
}

function specialtyPilot(
  service: (typeof SPECIALTY_SERVICES)[number],
) {
  if (service === "hair_loss") return POLICY.hairLoss.pilot
  if (service === "womens_health") return POLICY.womensHealth.pilot
  return POLICY.ed.pilot
}

function inactiveCampaignReason(
  campaignStatus: CampaignEconomics["campaignStatus"],
): "CAMPAIGN_ALREADY_PAUSED" | "CAMPAIGN_NOT_ENABLED" {
  return campaignStatus === "PAUSED"
    ? "CAMPAIGN_ALREADY_PAUSED"
    : "CAMPAIGN_NOT_ENABLED"
}

function evaluateSpecialty(
  service: (typeof SPECIALTY_SERVICES)[number],
  campaign: CampaignEconomics,
): AdsRecommendation {
  if (economicsUnavailable(campaign)) {
    return investigate(service, "ECONOMICS_UNAVAILABLE")
  }

  const pilot = specialtyPilot(service)
  const lossCents = Math.max(0, -(campaign.contributionCents ?? 0))
  if (lossCents >= pilot.maximumLossCents) {
    if (campaign.campaignStatus !== "ENABLED") {
      return hold(
        service,
        "SPECIALTY_LOSS_CAP",
        inactiveCampaignReason(campaign.campaignStatus),
      )
    }
    return {
      kind: "APPROVAL_NEEDED",
      proposedMutationFamily: "campaign_status",
      reasonCodes: ["SPECIALTY_LOSS_CAP"],
      service,
    }
  }

  // Click gates apply only when the campaign has no measured retained order.
  // Historical snapshots may omit clicks; unknown is not zero. The rolling
  // evaluator has no campaign-scoped start, progression, or relaunch baseline,
  // so it deliberately does not enforce maximumDays, persisted-checkout
  // progression, or Hair's future A$60 incremental-loss stop.
  if (campaign.orders === 0) {
    if (
      campaign.clicks == null
      || !Number.isInteger(campaign.clicks)
      || campaign.clicks < 0
    ) {
      return investigate(service, "SPECIALTY_CLICK_EVIDENCE_UNAVAILABLE")
    }
    if (campaign.clicks >= pilot.pauseProposalClicks) {
      if (campaign.campaignStatus !== "ENABLED") {
        return hold(
          service,
          "SPECIALTY_ZERO_ORDER_CLICK_CAP",
          inactiveCampaignReason(campaign.campaignStatus),
        )
      }
      return {
        kind: "APPROVAL_NEEDED",
        proposedMutationFamily: "campaign_status",
        reasonCodes: ["SPECIALTY_ZERO_ORDER_CLICK_CAP"],
        service,
      }
    }
    if (campaign.clicks >= pilot.investigateClicks) {
      if (campaign.campaignStatus !== "ENABLED") {
        return hold(
          service,
          "PILOT_WITHIN_LOSS_CAP",
          inactiveCampaignReason(campaign.campaignStatus),
        )
      }
      return investigate(
        service,
        "SPECIALTY_ZERO_ORDER_CLICK_INVESTIGATION",
      )
    }
  }

  return (campaign.firstOrder ? profitRecommendation(service, campaign) : null) ?? hold(service, "PILOT_WITHIN_LOSS_CAP")
}

/**
 * Attribution Investigation Holds — code-owned enforcement of the durable
 * operator boundary in CONTEXT.md ("Attribution Investigation Hold") and
 * docs/ROADMAP.md §Google Ads attribution-hold clearance.
 *
 * The per-run CROSS_SERVICE_ATTRIBUTION check inside the loop is a single-day
 * signal: once the daily share recovers, that branch stops firing and nothing
 * carries the investigation forward — a later GREEN day could emit
 * SCRIPTS_SCALE_GATES_PASSED while the cause was never established. This set
 * is the durable memory: a listed service always evaluates to
 * INVESTIGATE / ATTRIBUTION_INVESTIGATION_HOLD, whatever today's share,
 * campaign mapping, or tracking state says.
 *
 * Clearing is an Attribution Investigation Resolution (CONTEXT.md): recorded
 * cause, completed correction, and trustworthy campaign attribution evidence — then remove
 * the service here in a reviewed code change (the same code-owned governance
 * pattern as lib/clinical/auto-approval-governance.ts). Threshold recovery
 * alone never clears it.
 *
 * Resolved holds:
 * - scripts (resolved 2026-08-15): ED and hair-loss purchases had surfaced
 *   through the $29.95 Scripts lane. The dedicated-service hard routing
 *   shipped 2026-08-05/06. A fresh closed 30-day window ending 2026-08-14
 *   then showed 70 expected Scripts orders out of 72 recognised orders
 *   (97.2%), above the >= 90% / >= 10-order clearance gate. The Operator
 *   recorded the Attribution Investigation Resolution on 2026-08-15.
 */
const OPEN_ATTRIBUTION_HOLDS: ReadonlySet<Exclude<AdsService, "account">> =
  new Set()

interface EvaluateAdsPolicyOptions {
  /** Test seam only — production callers use the code-owned default. */
  openAttributionHolds?: ReadonlySet<Exclude<AdsService, "account">>
}

/**
 * Evaluates campaign-level economics only. Portfolio totals are intentionally
 * not used for service decisions so a profitable Scripts campaign can never
 * subsidise or conceal a losing specialty pilot.
 */
export function evaluateAdsPolicy(
  snapshot: AdsAgentSnapshot,
  options?: EvaluateAdsPolicyOptions,
): AdsRecommendation[] {
  const openAttributionHolds = options?.openAttributionHolds ?? OPEN_ATTRIBUTION_HOLDS
  const recommendations: AdsRecommendation[] = []
  if (snapshot.account.dailyBudgetTotalCents == null) {
    recommendations.push(investigate("account", "BUDGET_ENVELOPE_UNAVAILABLE"))
  }

  const campaigns = groupedCampaigns(snapshot)

  for (const service of SERVICE_ORDER) {
    const serviceCampaigns = campaigns.get(service) ?? []
    const operational = operationalHoldForService(snapshot, service)

    // Concrete harm wins over attribution or other evidence investigations.
    // This still emits only an approval-ready proposal; it never mutates Ads.
    if (operational && hasBlockingAdsOperationalEvidence(operational)) {
      const enabledCampaigns = serviceCampaigns.filter(
        (campaign) => campaign.campaignStatus === "ENABLED",
      )
      recommendations.push(
        enabledCampaigns.length === 1
          ? {
              kind: "APPROVAL_NEEDED",
              proposedMutationFamily: "campaign_status",
              reasonCodes: operationalReasonCodes(operational),
              service,
            }
          : hold(service, ...operationalReasonCodes(operational)),
      )
      continue
    }

    // Durable hold wins over EVERYTHING for the service — including a missing
    // or multiple campaign mapping and a recovered daily share — so it stays
    // visible until an explicit recorded resolution removes it.
    if (openAttributionHolds.has(service)) {
      recommendations.push(investigate(service, "ATTRIBUTION_INVESTIGATION_HOLD"))
      continue
    }

    if (serviceCampaigns.length === 0) continue
    if (serviceCampaigns.length > 1) {
      recommendations.push(
        investigate(service, "MULTIPLE_SERVICE_CAMPAIGNS"),
      )
      continue
    }

    const campaign = serviceCampaigns[0]
    if (snapshot.tracking.state === "RED" || !snapshot.tracking.scaleAllowed) {
      recommendations.push(hold(service, "TRACKING_NOT_GREEN"))
      continue
    }
    if (campaign.campaignStatus !== "ENABLED" && service === "scripts") {
      recommendations.push(hold(service, inactiveCampaignReason(campaign.campaignStatus)))
      continue
    }

    const recommendation = service === "scripts"
      ? evaluateScripts(campaign)
      : service === "med_certs"
        ? evaluateMedCerts(campaign)
        : evaluateSpecialty(service, campaign)

    const advisory = [
      ...(campaignHasMaterialCrossServiceOrders(campaign, service) ? ["CROSS_SERVICE_ATTRIBUTION"] : []),
      ...(campaign.refundRate != null && campaign.refundRate >= POLICY.scripts.scale.refundRateReviewThreshold ? ["REFUND_RATE_REVIEW"] : []),
      ...(operational && operational.state !== "clear" ? operationalReasonCodes(operational) : []),
      ...(snapshot.tracking.state === "AMBER" ? snapshot.tracking.reasonCodes : []),
    ]
    recommendations.push({ ...recommendation, reasonCodes: [...recommendation.reasonCodes, ...advisory] })
  }

  const hasUnmappedEnabledCampaign = snapshot.rolling30.some(
    (campaign) =>
      campaign.channel === "SEARCH"
      && campaign.campaignStatus === "ENABLED"
      && resolveAdsCampaignService(campaign) == null,
  )
  if (hasUnmappedEnabledCampaign) {
    recommendations.unshift(
      investigate("account", "UNMAPPED_ENABLED_SEARCH_CAMPAIGN"),
    )
  }

  return recommendations
}
