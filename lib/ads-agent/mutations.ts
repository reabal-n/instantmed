import "server-only"

import { createHash } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getAdsAccountState,
  type GoogleAdsAccountState,
  hashGoogleAdsAccountState,
  type NormalizedGoogleAdsResource,
} from "@/lib/ads-agent/account-state"
import {
  authorizeScriptsBudgetScale,
  authorizeScriptsScaleEligibility,
  containsProhibitedPaidMedicineTerm,
  POLICY,
  resolveAdsCampaignService,
} from "@/lib/ads-agent/policy"
import {
  type AdsChangeProposal,
  type AdSchedule,
  type AdsMutationOperation,
  type AdsProposalApplyReceipt,
  type AdsProposalValidationReceipt,
  type AdsProposalVerificationReceipt,
  type BiddingConfig,
  createAdsProposalDraft,
  getAdsProposalApplyEligibility,
  getAdsProposalByKey,
  hashAdsMutationOperations,
  isAdsProposalExpired,
  isCodexAdsApprovalReference,
  normalizeAdsMutationOperations,
  recordAdsProposalValidation,
} from "@/lib/ads-agent/proposals"
import { isAdsAgentSnapshot } from "@/lib/ads-agent/runs"
import type { AdsAgentSnapshot, AdsService } from "@/lib/ads-agent/types"
import {
  type GoogleAdsMutateOperation,
  type GoogleAdsMutateResponse,
  mutateGoogleAds,
} from "@/lib/google-ads/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type ValidationReceipt = AdsProposalValidationReceipt
export type ApplyReceipt = AdsProposalApplyReceipt
export type VerificationReceipt = AdsProposalVerificationReceipt

export interface AdsMutationAuditReceipt {
  errorCode: string | null
  googleOperationsHash: string
  outcome: string
  proposalKey: string
  requestId: string | null
  stage: "validate" | "apply_started" | "apply" | "verify" | "rollback"
  timestamp: string
}

export interface AdsTrackingGateReceipt {
  checkedAt: string
  fresh: boolean
  state: "GREEN" | "AMBER" | "RED"
}

export interface AdsScaleAuthorizationEvidence {
  previousMaterialChange: {
    attributedOrders: number
    closedDays: number
  } | null
  snapshot: AdsAgentSnapshot
}

export interface AdsMutationGatewayRepository {
  appendAudit(receipt: AdsMutationAuditReceipt): Promise<void>
  claimApply(args: {
    proposalId: string
  }): Promise<boolean>
  createRollbackDraft(args: {
    baselineHash: string
    liveState: GoogleAdsAccountState
    operations: AdsMutationOperation[]
    original: AdsChangeProposal
  }): Promise<AdsChangeProposal>
  getLatestTrackingGate(args: {
    now: Date
    runId: string | null
  }): Promise<AdsTrackingGateReceipt>
  getMaterialExperimentLock(args: {
    campaign: string
  }): Promise<{
    launchProposalKey: string
    stopProposalKey: string | null
  } | null>
  getProposalByKey(proposalKey: string): Promise<AdsChangeProposal | null>
  getScaleAuthorizationEvidence(args: {
    budgetResourceName: string
    campaignResourceName: string
    liveMaterialChangeAt: string | null
    runId: string | null
    service: AdsService
  }): Promise<AdsScaleAuthorizationEvidence | null>
  recordApplyOutcome(args: {
    expectedStatus: "approved" | "applying"
    proposalId: string
    receipt: ApplyReceipt
    status: "aborted" | "applied" | "failed"
    verificationReceipt?: VerificationReceipt
  }): Promise<boolean>
  recordValidation(args: {
    proposal: AdsChangeProposal
    receipt: ValidationReceipt
  }): Promise<AdsChangeProposal>
  recordVerification(args: {
    expectedStatus: "applied"
    proposalId: string
    receipt: VerificationReceipt
    status: "failed" | "verified"
  }): Promise<boolean>
}

export interface AdsMutationGateway {
  applyProposal(proposalKey: string): Promise<ApplyReceipt>
  buildRollbackProposal(proposalKey: string): Promise<AdsChangeProposal>
  reconcileProposal(proposalKey: string): Promise<VerificationReceipt>
  validateProposal(proposalKey: string): Promise<ValidationReceipt>
  verifyProposal(proposalKey: string): Promise<VerificationReceipt>
}

interface AdsMutationGatewayDependencies {
  getAccountState(args?: { now?: Date }): Promise<GoogleAdsAccountState>
  mutateGoogleAds(args: {
    operations: GoogleAdsMutateOperation[]
    validateOnly: boolean
  }): Promise<GoogleAdsMutateResponse>
  mutationsEnabled(): boolean
  now(): Date
  repository: AdsMutationGatewayRepository
}

type UnknownRecord = Record<string, unknown>

const AUDIT_ACTION = "google_ads_agent_mutation"
const TRACKING_GATE_MAX_AGE_MS = 26 * 60 * 60 * 1000
const PROHIBITED_POSITIVE_MATCH_TYPES = new Set(["BROAD"])
const HEALTH_AUDIENCE_TYPES = new Set([
  "AUDIENCE",
  "COMBINED_AUDIENCE",
  "CUSTOM_AUDIENCE",
  "CUSTOM_INTEREST",
  "USER_INTEREST",
  "USER_LIST",
])

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

function normalizedCampaignLabel(value: unknown): string | null {
  const label = asString(value)
  return label
    ? label.normalize("NFKC").replace(/\s+/g, " ").toLowerCase()
    : null
}

function asNumber(value: unknown): number | null {
  const normalized = asString(value)
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function hashValue(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex")
}

export function hashGoogleAdsMutateOperations(
  operations: GoogleAdsMutateOperation[],
): string {
  return hashValue(operations)
}

function resourceValues(
  resources: NormalizedGoogleAdsResource[],
  resourceName: string,
  key: string,
): UnknownRecord | null {
  const resource = resources.find(
    (candidate) => candidate.resourceName === resourceName,
  )
  return asRecord(resource?.values[key])
}

function campaignValue(
  state: GoogleAdsAccountState,
  resourceName: string,
): UnknownRecord | null {
  return resourceValues(state.campaigns, resourceName, "campaign")
}

function budgetValue(
  state: GoogleAdsAccountState,
  resourceName: string,
): UnknownRecord | null {
  return resourceValues(
    state.campaignBudgets,
    resourceName,
    "campaignBudget",
  )
}

function adGroupValue(
  state: GoogleAdsAccountState,
  resourceName: string,
): UnknownRecord | null {
  return resourceValues(state.adGroups, resourceName, "adGroup")
}

function adGroupAdValue(
  state: GoogleAdsAccountState,
  resourceName: string,
): UnknownRecord | null {
  return resourceValues(
    state.responsiveSearchAds,
    resourceName,
    "adGroupAd",
  )
}

function criterionValue(
  state: GoogleAdsAccountState,
  resourceName: string,
): UnknownRecord | null {
  if (resourceName.includes("/campaignCriteria/")) {
    return resourceValues(
      state.campaignCriteria,
      resourceName,
      "campaignCriterion",
    )
  }
  return resourceValues(
    state.adGroupCriteria,
    resourceName,
    "adGroupCriterion",
  )
}

function campaignAssetValue(
  state: GoogleAdsAccountState,
  resourceName: string,
): UnknownRecord | null {
  return resourceValues(
    state.campaignAssets,
    resourceName,
    "campaignAsset",
  )
}

function normalizeSchedules(value: AdSchedule[]): AdSchedule[] {
  return [...value].sort((left, right) =>
    [
      left.dayOfWeek,
      left.startHour,
      left.startMinute,
      left.endHour,
      left.endMinute,
    ].join(":").localeCompare([
      right.dayOfWeek,
      right.startHour,
      right.startMinute,
      right.endHour,
      right.endMinute,
    ].join(":")),
  )
}

function campaignSchedules(
  state: GoogleAdsAccountState,
  campaignResourceName: string,
): Array<{ resourceName: string; schedule: AdSchedule }> {
  return state.campaignCriteria
    .map((resource) => {
      const criterion = asRecord(resource.values.campaignCriterion)
      const schedule = asRecord(criterion?.adSchedule)
      if (
        !resource.resourceName
        || criterion?.campaign !== campaignResourceName
        || !schedule
      ) {
        return null
      }
      return {
        resourceName: resource.resourceName,
        schedule: {
          dayOfWeek: asString(schedule.dayOfWeek),
          endHour: asNumber(schedule.endHour),
          endMinute: asString(schedule.endMinute),
          startHour: asNumber(schedule.startHour),
          startMinute: asString(schedule.startMinute),
        } as AdSchedule,
      }
    })
    .filter((entry): entry is { resourceName: string; schedule: AdSchedule } =>
      entry != null)
    .sort((left, right) => left.resourceName.localeCompare(right.resourceName))
}

function readBiddingConfig(campaign: UnknownRecord | null): BiddingConfig | null {
  const strategy = asString(campaign?.biddingStrategyType)
  if (strategy === "MANUAL_CPC") return { strategy }
  if (strategy === "MAXIMIZE_CONVERSIONS") {
    const targetCpaMicros = asNumber(
      asRecord(campaign?.maximizeConversions)?.targetCpaMicros,
    )
    return {
      strategy,
      ...(targetCpaMicros != null ? { targetCpaMicros } : {}),
    }
  }
  if (strategy === "MAXIMIZE_CONVERSION_VALUE") {
    const targetRoas = asNumber(
      asRecord(campaign?.maximizeConversionValue)?.targetRoas,
    )
    return {
      strategy,
      ...(targetRoas != null ? { targetRoas } : {}),
    }
  }
  return null
}

function biddingEquals(
  left: BiddingConfig | null,
  right: BiddingConfig,
): boolean {
  return left != null && JSON.stringify(left) === JSON.stringify(right)
}

function negativeKeywordExists(
  state: GoogleAdsAccountState,
  operation: Extract<AdsMutationOperation, { kind: "negative_keyword" }>,
): boolean {
  return state.campaignCriteria.some((resource) => {
    const criterion = asRecord(resource.values.campaignCriterion)
    const keyword = asRecord(criterion?.keyword)
    return (
      criterion?.campaign === operation.campaignResourceName
      && criterion?.negative === true
      && asString(criterion.status) !== "REMOVED"
      && asString(keyword?.text)?.toLowerCase()
        === operation.text.toLowerCase()
      && asString(keyword?.matchType) === operation.matchType
    )
  })
}

function adTextValues(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => asString(asRecord(entry)?.text))
    .filter((entry): entry is string => entry != null)
    .sort((left, right) => left.localeCompare(right))
}

function normalizedTexts(value: string[]): string[] {
  return [...value].sort((left, right) => left.localeCompare(right))
}

function matchingResponsiveSearchAds(
  state: GoogleAdsAccountState,
  operation: Extract<
    AdsMutationOperation,
    { kind: "responsive_search_ad_create" }
  >,
): Array<{ resourceName: string; status: string | null }> {
  return state.responsiveSearchAds.flatMap((resource) => {
    const adGroupAd = asRecord(resource.values.adGroupAd)
    const ad = asRecord(adGroupAd?.ad)
    const rsa = asRecord(ad?.responsiveSearchAd)
    const finalUrls = Array.isArray(ad?.finalUrls)
      ? ad.finalUrls.map(asString).filter((url): url is string => url != null)
      : []
    if (
      !resource.resourceName
      || adGroupAd?.adGroup !== operation.adGroupResourceName
      || asString(adGroupAd?.status) === "REMOVED"
      || finalUrls.length !== 1
      || finalUrls[0] !== operation.finalUrl
      || asString(rsa?.path1) !== (operation.path1 || null)
      || asString(rsa?.path2) !== (operation.path2 || null)
      || JSON.stringify(adTextValues(rsa?.headlines))
        !== JSON.stringify(normalizedTexts(operation.headlines))
      || JSON.stringify(adTextValues(rsa?.descriptions))
        !== JSON.stringify(normalizedTexts(operation.descriptions))
    ) {
      return []
    }
    return [{
      resourceName: resource.resourceName,
      status: asString(adGroupAd.status),
    }]
  }).sort((left, right) => left.resourceName.localeCompare(right.resourceName))
}

function matchingPositiveKeywords(
  state: GoogleAdsAccountState,
  operation: Extract<
    AdsMutationOperation,
    { kind: "positive_keyword_create" }
  >,
): Array<{ resourceName: string; status: string | null }> {
  return state.adGroupCriteria.flatMap((resource) => {
    const criterion = asRecord(resource.values.adGroupCriterion)
    const keyword = asRecord(criterion?.keyword)
    if (
      !resource.resourceName
      || criterion?.adGroup !== operation.adGroupResourceName
      || criterion?.negative === true
      || asString(criterion?.status) === "REMOVED"
      || asString(keyword?.text)?.toLowerCase()
        !== operation.text.toLowerCase()
      || asString(keyword?.matchType) !== operation.matchType
    ) {
      return []
    }
    return [{
      resourceName: resource.resourceName,
      status: asString(criterion.status),
    }]
  }).sort((left, right) => left.resourceName.localeCompare(right.resourceName))
}

function operationProjection(
  operation: AdsMutationOperation,
  state: GoogleAdsAccountState,
): unknown {
  if (operation.kind === "campaign_status") {
    return { status: asString(campaignValue(state, operation.resourceName)?.status) }
  }
  if (operation.kind === "campaign_budget") {
    return {
      amountMicros: asNumber(
        budgetValue(state, operation.resourceName)?.amountMicros,
      ),
    }
  }
  if (operation.kind === "campaign_bidding") {
    return {
      bidding: readBiddingConfig(
        campaignValue(state, operation.resourceName),
      ),
    }
  }
  if (operation.kind === "ad_group_cpc_bid") {
    return {
      cpcBidMicros: asNumber(
        adGroupValue(state, operation.resourceName)?.cpcBidMicros,
      ),
    }
  }
  if (operation.kind === "ad_status") {
    return { status: asString(adGroupAdValue(state, operation.resourceName)?.status) }
  }
  if (operation.kind === "keyword_status") {
    return { status: asString(criterionValue(state, operation.resourceName)?.status) }
  }
  if (operation.kind === "negative_keyword") {
    return { exists: negativeKeywordExists(state, operation) }
  }
  if (operation.kind === "asset_link_status") {
    return {
      status: asString(
        campaignAssetValue(state, operation.resourceName)?.status,
      ),
    }
  }
  if (operation.kind === "responsive_search_ad_create") {
    return { matches: matchingResponsiveSearchAds(state, operation) }
  }
  if (operation.kind === "positive_keyword_create") {
    return { matches: matchingPositiveKeywords(state, operation) }
  }
  return {
    schedules: normalizeSchedules(
      campaignSchedules(state, operation.campaignResourceName)
        .map(({ schedule }) => schedule),
    ),
  }
}

function operationMatches(
  operation: AdsMutationOperation,
  state: GoogleAdsAccountState,
  target: "expected" | "next",
): boolean {
  const projection = operationProjection(operation, state) as UnknownRecord
  if (operation.kind === "campaign_status") {
    return projection.status === operation[target]
  }
  if (operation.kind === "campaign_budget") {
    return projection.amountMicros === (
      target === "expected"
        ? operation.expectedMicros
        : operation.nextMicros
    )
  }
  if (operation.kind === "campaign_bidding") {
    return biddingEquals(
      projection.bidding as BiddingConfig | null,
      operation[target],
    )
  }
  if (operation.kind === "ad_group_cpc_bid") {
    return projection.cpcBidMicros === (
      target === "expected"
        ? operation.expectedMicros
        : operation.nextMicros
    )
  }
  if (
    operation.kind === "ad_status"
    || operation.kind === "keyword_status"
    || operation.kind === "asset_link_status"
  ) {
    const wanted = operation[target]
    return projection.status === wanted
      || wanted === "REMOVED" && projection.status == null
  }
  if (operation.kind === "negative_keyword") {
    return projection.exists === (target === "next")
  }
  if (
    operation.kind === "responsive_search_ad_create"
    || operation.kind === "positive_keyword_create"
  ) {
    const matches = projection.matches as Array<{ status: string | null }>
    return target === "expected"
      ? matches.length === 0
      : matches.some(({ status }) => status === operation.status)
  }
  return JSON.stringify(projection.schedules) === JSON.stringify(
    normalizeSchedules(operation[target]),
  )
}

function assertExpectedOperationState(
  operations: AdsMutationOperation[],
  state: GoogleAdsAccountState,
): void {
  if (!operations.every((operation) =>
    operationMatches(operation, state, "expected"))) {
    throw new Error("operation_expected_state_drift")
  }
}

function verifyOperationState(
  proposalKey: string,
  operations: AdsMutationOperation[],
  state: GoogleAdsAccountState,
  now: Date,
): VerificationReceipt {
  const matches = operations.map((operation) =>
    operationMatches(operation, state, "next"))
  return {
    outcome: matches.every(Boolean) ? "verified" : "mismatch",
    proposalKey,
    resourceHashes: Object.fromEntries(
      operations.map((operation, index) => [
        `op-${String(index + 1).padStart(2, "0")}`,
        hashValue(operationProjection(operation, state)),
      ]),
    ),
    verifiedAt: now.toISOString(),
  }
}

function biddingMutate(
  operation: Extract<AdsMutationOperation, { kind: "campaign_bidding" }>,
): GoogleAdsMutateOperation {
  const update: UnknownRecord = { resourceName: operation.resourceName }
  let updateMask: string
  if (operation.next.strategy === "MANUAL_CPC") {
    update.manualCpc = { enhancedCpcEnabled: false }
    updateMask = "manualCpc.enhancedCpcEnabled"
  } else if (operation.next.strategy === "MAXIMIZE_CONVERSIONS") {
    update.maximizeConversions = {
      ...(operation.next.targetCpaMicros != null
        ? { targetCpaMicros: String(operation.next.targetCpaMicros) }
        : {}),
    }
    updateMask = "maximizeConversions.targetCpaMicros"
  } else {
    update.maximizeConversionValue = {
      ...(operation.next.targetRoas != null
        ? { targetRoas: operation.next.targetRoas }
        : {}),
    }
    updateMask = "maximizeConversionValue.targetRoas"
  }
  return {
    campaignOperation: {
      update,
      updateMask,
    },
  }
}

export function buildGoogleAdsMutateOperations(
  value: unknown,
  state: GoogleAdsAccountState,
): GoogleAdsMutateOperation[] {
  const operations = normalizeAdsMutationOperations(value)
  return operations.flatMap((operation): GoogleAdsMutateOperation[] => {
    if (operation.kind === "campaign_status") {
      return [{
        campaignOperation: {
          update: {
            resourceName: operation.resourceName,
            status: operation.next,
          },
          updateMask: "status",
        },
      }]
    }
    if (operation.kind === "campaign_budget") {
      return [{
        campaignBudgetOperation: {
          update: {
            amountMicros: String(operation.nextMicros),
            resourceName: operation.resourceName,
          },
          updateMask: "amountMicros",
        },
      }]
    }
    if (operation.kind === "campaign_bidding") {
      return [biddingMutate(operation)]
    }
    if (operation.kind === "ad_group_cpc_bid") {
      return [{
        adGroupOperation: {
          update: {
            cpcBidMicros: String(operation.nextMicros),
            resourceName: operation.resourceName,
          },
          updateMask: "cpcBidMicros",
        },
      }]
    }
    if (operation.kind === "ad_status") {
      if (operation.next === "REMOVED") {
        return [{
          adGroupAdOperation: { remove: operation.resourceName },
        }]
      }
      return [{
        adGroupAdOperation: {
          update: {
            resourceName: operation.resourceName,
            status: operation.next,
          },
          updateMask: "status",
        },
      }]
    }
    if (operation.kind === "keyword_status") {
      const operationKey = operation.resourceName.includes(
        "/campaignCriteria/",
      )
        ? "campaignCriterionOperation"
        : "adGroupCriterionOperation"
      return [{
        [operationKey]: operation.next === "REMOVED"
          ? { remove: operation.resourceName }
          : {
          update: {
            resourceName: operation.resourceName,
            status: operation.next,
          },
          updateMask: "status",
        },
      }]
    }
    if (operation.kind === "negative_keyword") {
      return [{
        campaignCriterionOperation: {
          create: {
            campaign: operation.campaignResourceName,
            keyword: {
              matchType: operation.matchType,
              text: operation.text,
            },
            negative: true,
            status: "ENABLED",
          },
        },
      }]
    }
    if (operation.kind === "asset_link_status") {
      if (operation.next === "REMOVED") {
        return [{
          campaignAssetOperation: { remove: operation.resourceName },
        }]
      }
      return [{
        campaignAssetOperation: {
          update: {
            resourceName: operation.resourceName,
            status: operation.next,
          },
          updateMask: "status",
        },
      }]
    }
    if (operation.kind === "responsive_search_ad_create") {
      return [{
        adGroupAdOperation: {
          create: {
            ad: {
              finalUrls: [operation.finalUrl],
              responsiveSearchAd: {
                descriptions: operation.descriptions.map((text) => ({ text })),
                headlines: operation.headlines.map((text) => ({ text })),
                path1: operation.path1,
                path2: operation.path2,
              },
            },
            adGroup: operation.adGroupResourceName,
            status: operation.status,
          },
        },
      }]
    }
    if (operation.kind === "positive_keyword_create") {
      return [{
        adGroupCriterionOperation: {
          create: {
            adGroup: operation.adGroupResourceName,
            keyword: {
              matchType: operation.matchType,
              text: operation.text,
            },
            negative: false,
            status: operation.status,
          },
        },
      }]
    }

    const removals = campaignSchedules(
      state,
      operation.campaignResourceName,
    ).map(({ resourceName }) => ({
      campaignCriterionOperation: { remove: resourceName },
    }))
    const creates = normalizeSchedules(operation.next).map((schedule) => ({
      campaignCriterionOperation: {
        create: {
          adSchedule: schedule,
          campaign: operation.campaignResourceName,
          negative: false,
          status: "ENABLED",
        },
      },
    }))
    return [...removals, ...creates]
  })
}

function campaignNameService(name: string | null):
  | "med_certs"
  | "scripts"
  | "ed"
  | "hair_loss"
  | "womens_health"
  | null {
  const normalized = name?.normalize("NFKD")
    .replace(/[’']/g, "")
    .toLowerCase() ?? ""
  if (normalized.includes("med cert") || normalized.includes("medical cert")) {
    return "med_certs"
  }
  if (normalized.includes("script") || normalized.includes("prescription")) {
    return "scripts"
  }
  if (normalized.includes("hair loss")) return "hair_loss"
  if (
    normalized.includes("womens health")
    || normalized.includes("women health")
    || normalized.includes("contraception")
    || /(?:^|\W)uti(?:\W|$)/.test(normalized)
  ) {
    return "womens_health"
  }
  if (/(?:^|\W)ed(?:\W|$)/.test(normalized)) return "ed"
  return null
}

function campaignForAdGroup(
  state: GoogleAdsAccountState,
  adGroupResourceName: string | null,
): string | null {
  if (!adGroupResourceName) return null
  return asString(
    adGroupValue(state, adGroupResourceName)?.campaign,
  )
}

const PAID_DESTINATION_BY_SERVICE = {
  ed: "/erectile-dysfunction",
  hair_loss: "/hair-loss",
  med_certs: "/medical-certificate",
  scripts: "/prescriptions",
  womens_health: "/womens-health",
} as const

const ALLOWED_PAID_PRICE_CENTS = {
  ed: new Set([4_995]),
  hair_loss: new Set([4_995]),
  med_certs: new Set([2_495, 2_995, 3_995]),
  scripts: new Set([2_995]),
  womens_health: new Set([4_995]),
} as const

function assertCreateOperationsSafe(
  operations: AdsMutationOperation[],
  state: GoogleAdsAccountState,
): void {
  const packetTargets = new Set<string>()
  for (const operation of operations) {
    if (
      operation.kind !== "responsive_search_ad_create"
      && operation.kind !== "positive_keyword_create"
    ) continue

    const adGroup = adGroupValue(state, operation.adGroupResourceName)
    const campaignResourceName = asString(adGroup?.campaign)
    const campaign = campaignResourceName
      ? campaignValue(state, campaignResourceName)
      : null
    if (
      !adGroup
      || asString(adGroup.status) === "REMOVED"
      || !campaign
      || asString(campaign.advertisingChannelType) !== "SEARCH"
    ) {
      throw new Error("create_target_parent_unavailable")
    }
    const service = campaignNameService(asString(campaign.name))
    if (!service) throw new Error("ungoverned_campaign_service")

    const packetTarget = operation.kind === "responsive_search_ad_create"
      ? `rsa:${operation.adGroupResourceName}:${[
          operation.finalUrl,
          ...normalizedTexts(operation.headlines),
          ...normalizedTexts(operation.descriptions),
          operation.path1,
          operation.path2,
        ].join("|").toLowerCase()}`
      : `keyword:${operation.adGroupResourceName}:${operation.matchType}:${operation.text.toLowerCase()}`
    if (packetTargets.has(packetTarget)) {
      throw new Error("duplicate_create_target")
    }
    packetTargets.add(packetTarget)

    const existing = operation.kind === "responsive_search_ad_create"
      ? matchingResponsiveSearchAds(state, operation)
      : matchingPositiveKeywords(state, operation)
    if (existing.length > 0) throw new Error("create_target_already_exists")

    if (operation.kind === "positive_keyword_create") continue

    const destination = new URL(operation.finalUrl)
    if (destination.pathname !== PAID_DESTINATION_BY_SERVICE[service]) {
      throw new Error("paid_destination_service_mismatch")
    }
    if (
      service !== "med_certs"
      && !operation.descriptions.some((description) =>
        /\bmay call\b/i.test(description))
    ) {
      throw new Error("prescribing_ad_missing_possible_call")
    }
    const prices = [...operation.headlines, ...operation.descriptions]
      .flatMap((text) => Array.from(text.matchAll(/A?\$(\d+(?:\.\d{1,2})?)/g)))
      .map((match) => Math.round(Number(match[1]) * 100))
    if (prices.some((price) => !ALLOWED_PAID_PRICE_CENTS[service].has(price))) {
      throw new Error("paid_copy_price_mismatch")
    }
  }
}

function isSpecialtyCampaign(
  state: GoogleAdsAccountState,
  campaignResourceName: string | null,
): boolean {
  if (!campaignResourceName) return false
  const service = campaignNameService(
    asString(campaignValue(state, campaignResourceName)?.name),
  )
  return service === "ed" || service === "hair_loss"
    || service === "womens_health"
}

function assertSpecialtyCpcCeiling(
  operations: AdsMutationOperation[],
  state: GoogleAdsAccountState,
): void {
  const ceilingMicros = POLICY.ed.pilot.initialCpcCeilingCents * 10_000

  for (const operation of operations) {
    if (operation.kind === "ad_group_cpc_bid") {
      const campaign = campaignForAdGroup(
        state,
        operation.resourceName,
      )
      if (
        isSpecialtyCampaign(state, campaign)
        && operation.nextMicros > ceilingMicros
        && operation.nextMicros > operation.expectedMicros
      ) {
        throw new Error("specialty_cpc_ceiling_exceeded")
      }
    }
    if (
      operation.kind === "campaign_bidding"
      && operation.next.strategy === "MANUAL_CPC"
      && isSpecialtyCampaign(state, operation.resourceName)
    ) {
      const adGroupNames = new Set(
        state.adGroups
          .filter((resource) =>
            asString(asRecord(resource.values.adGroup)?.campaign)
              === operation.resourceName)
          .map((resource) => resource.resourceName)
          .filter((name): name is string => Boolean(name)),
      )
      const adGroupBidTooHigh = state.adGroups.some((resource) => {
        const adGroup = asRecord(resource.values.adGroup)
        return (
          adGroup?.campaign === operation.resourceName
          && (asNumber(adGroup.cpcBidMicros) ?? 0) > ceilingMicros
        )
      })
      const keywordBidTooHigh = state.adGroupCriteria.some((resource) => {
        const criterion = asRecord(resource.values.adGroupCriterion)
        return (
          adGroupNames.has(asString(criterion?.adGroup) ?? "")
          && criterion?.negative !== true
          && (asNumber(criterion?.cpcBidMicros) ?? 0) > ceilingMicros
        )
      })
      if (adGroupBidTooHigh || keywordBidTooHigh) {
        throw new Error("specialty_cpc_ceiling_exceeded")
      }
    }
  }
}

function assertKeywordAndAudienceSafety(
  operations: AdsMutationOperation[],
  state: GoogleAdsAccountState,
): void {
  const affectedScalingCampaigns = new Set<string>()
  for (const operation of operations) {
    if (!isScalingOperation(operation)) continue
    if (
      operation.kind === "campaign_status"
      || operation.kind === "campaign_bidding"
    ) {
      affectedScalingCampaigns.add(operation.resourceName)
    } else if (operation.kind === "campaign_budget") {
      for (const resource of state.campaigns) {
        const campaign = asRecord(resource.values.campaign)
        if (
          resource.resourceName
          && campaign?.campaignBudget === operation.resourceName
        ) {
          affectedScalingCampaigns.add(resource.resourceName)
        }
      }
    } else if (operation.kind === "ad_group_cpc_bid") {
      const campaign = campaignForAdGroup(state, operation.resourceName)
      if (campaign) affectedScalingCampaigns.add(campaign)
    } else if (operation.kind === "ad_status") {
      const adGroup = asString(
        adGroupAdValue(state, operation.resourceName)?.adGroup,
      )
      const campaign = campaignForAdGroup(state, adGroup)
      if (campaign) affectedScalingCampaigns.add(campaign)
    } else if (operation.kind === "keyword_status") {
      const criterion = criterionValue(state, operation.resourceName)
      const campaign = operation.resourceName.includes("/campaignCriteria/")
        ? asString(criterion?.campaign)
        : campaignForAdGroup(state, asString(criterion?.adGroup))
      if (campaign) affectedScalingCampaigns.add(campaign)
    } else if (operation.kind === "asset_link_status") {
      const campaign = asString(
        campaignAssetValue(state, operation.resourceName)?.campaign,
      )
      if (campaign) affectedScalingCampaigns.add(campaign)
    } else if (operation.kind === "schedule_replace") {
      affectedScalingCampaigns.add(operation.campaignResourceName)
    } else if (
      operation.kind === "responsive_search_ad_create"
      || operation.kind === "positive_keyword_create"
    ) {
      const campaign = campaignForAdGroup(
        state,
        operation.adGroupResourceName,
      )
      if (campaign) affectedScalingCampaigns.add(campaign)
    }
  }

  const campaignsBeingEnabled = new Set(
    operations
      .filter(
        (
          operation,
        ): operation is Extract<
          AdsMutationOperation,
          { kind: "campaign_status" }
        > =>
          operation.kind === "campaign_status"
          && operation.next === "ENABLED",
      )
      .map((operation) => operation.resourceName),
  )

  const criteriaBeingEnabled = new Set(
    operations
      .filter(
        (
          operation,
        ): operation is Extract<
          AdsMutationOperation,
          { kind: "keyword_status" }
        > =>
          operation.kind === "keyword_status"
          && operation.next === "ENABLED",
      )
      .map((operation) => operation.resourceName),
  )

  for (const resource of state.adGroupCriteria) {
    const criterion = asRecord(resource.values.adGroupCriterion)
    const campaign = campaignForAdGroup(
      state,
      asString(criterion?.adGroup),
    )
    const becomesActive =
      criteriaBeingEnabled.has(resource.resourceName ?? "")
      || campaignsBeingEnabled.has(campaign ?? "")
      || affectedScalingCampaigns.has(campaign ?? "")
    if (!becomesActive || criterion?.negative === true) continue

    const keyword = asRecord(criterion?.keyword)
    const text = asString(keyword?.text) ?? ""
    const matchType = asString(keyword?.matchType) ?? ""
    if (containsProhibitedPaidMedicineTerm(text)) {
      throw new Error("medicine_name_keyword")
    }
    if (PROHIBITED_POSITIVE_MATCH_TYPES.has(matchType)) {
      throw new Error("broad_match_positive")
    }
  }

  for (const resource of state.campaignCriteria) {
    const criterion = asRecord(resource.values.campaignCriterion)
    const campaignIsAffected =
      campaignsBeingEnabled.has(asString(criterion?.campaign) ?? "")
      || affectedScalingCampaigns.has(
        asString(criterion?.campaign) ?? "",
      )
    if (
      campaignIsAffected
      && criterion?.negative !== true
      && HEALTH_AUDIENCE_TYPES.has(asString(criterion?.type) ?? "")
      && asString(criterion?.status) !== "REMOVED"
    ) {
      throw new Error("health_audience_operation_rejected")
    }
  }
}

function assertGovernedCampaignConstitution(
  operations: AdsMutationOperation[],
  state: GoogleAdsAccountState,
): void {
  for (const operation of operations) {
    if (operation.kind !== "campaign_budget") continue
    const campaigns = state.campaigns
      .map((resource) => asRecord(resource.values.campaign))
      .filter((campaign) =>
        campaign?.campaignBudget === operation.resourceName)
    if (campaigns.length === 0) {
      throw new Error("campaign_budget_owner_unavailable")
    }
    for (const campaign of campaigns) {
      const service = campaignNameService(asString(campaign?.name))
      if (!service) throw new Error("ungoverned_campaign_service")
      if (
        service === "scripts"
        && operation.nextMicros > operation.expectedMicros
          * (1 + POLICY.scripts.scale.maximumBudgetStep)
      ) {
        throw new Error("scripts_budget_step_exceeded")
      }
      const serviceLimitMicros =
        service === "med_certs"
          ? POLICY.medCerts.dailyBudgetCents * 10_000
          : service === "ed"
            ? POLICY.ed.dailyBudgetCents * 10_000
            : service === "hair_loss"
              ? POLICY.hairLoss.dailyBudgetCents * 10_000
              : service === "womens_health"
                ? POLICY.womensHealth.dailyBudgetCents * 10_000
                : null
      if (
        serviceLimitMicros != null
        && operation.nextMicros > serviceLimitMicros
        && operation.nextMicros > operation.expectedMicros
      ) {
        throw new Error("service_budget_ceiling_exceeded")
      }
    }
  }

  if (!isScalingProposal(operations)) return

  const nextStatuses = new Map<string, string>()
  for (const resource of state.campaigns) {
    if (!resource.resourceName) continue
    const campaign = asRecord(resource.values.campaign)
    const status = asString(campaign?.status)
    if (status) nextStatuses.set(resource.resourceName, status)
  }
  for (const operation of operations) {
    if (operation.kind === "campaign_status") {
      nextStatuses.set(operation.resourceName, operation.next)
    }
  }

  const enabledByService = new Map<string, number>()
  for (const resource of state.campaigns) {
    if (
      !resource.resourceName
      || nextStatuses.get(resource.resourceName) !== "ENABLED"
    ) {
      continue
    }
    const campaign = asRecord(resource.values.campaign)
    if (asString(campaign?.advertisingChannelType) !== "SEARCH") {
      throw new Error("non_search_campaign_operation")
    }
    const service = campaignNameService(asString(campaign?.name))
    if (!service) throw new Error("ungoverned_campaign_service")
    enabledByService.set(service, (enabledByService.get(service) ?? 0) + 1)
  }
  if (Array.from(enabledByService.values()).some((count) => count > 1)) {
    throw new Error("multiple_enabled_service_campaigns")
  }
}

export function validateAdsMutationPolicy(args: {
  operations: unknown
  state: GoogleAdsAccountState
}): AdsMutationOperation[] {
  const operations = normalizeAdsMutationOperations(args.operations)
  assertGovernedCampaignConstitution(operations, args.state)
  assertSpecialtyCpcCeiling(operations, args.state)
  assertCreateOperationsSafe(operations, args.state)
  assertKeywordAndAudienceSafety(operations, args.state)
  return operations
}

function isScalingOperation(operation: AdsMutationOperation): boolean {
  if (operation.kind === "campaign_status") return operation.next === "ENABLED"
  if (operation.kind === "campaign_budget") {
    return operation.nextMicros > operation.expectedMicros
  }
  if (operation.kind === "campaign_bidding") return true
  if (operation.kind === "ad_group_cpc_bid") {
    return operation.nextMicros > operation.expectedMicros
  }
  if (
    operation.kind === "ad_status"
    || operation.kind === "keyword_status"
    || operation.kind === "asset_link_status"
  ) {
    return operation.next === "ENABLED" && operation.expected !== "ENABLED"
  }
  if (operation.kind === "schedule_replace") {
    const minute = (value: AdSchedule["startMinute"]) =>
      value === "ZERO" ? 0
        : value === "FIFTEEN" ? 15
          : value === "THIRTY" ? 30
            : 45
    const totalMinutes = (schedules: AdSchedule[]) =>
      schedules.reduce(
        (sum, entry) =>
          sum + entry.endHour * 60 + minute(entry.endMinute)
            - entry.startHour * 60 - minute(entry.startMinute),
        0,
      )
    return totalMinutes(operation.next) > totalMinutes(operation.expected)
  }
  if (
    operation.kind === "responsive_search_ad_create"
    || operation.kind === "positive_keyword_create"
  ) {
    return operation.status === "ENABLED"
  }
  return false
}

function isScalingProposal(operations: AdsMutationOperation[]): boolean {
  return operations.some(isScalingOperation)
}

function verifiedDecisionReceipt(proposal: AdsChangeProposal): boolean {
  if (
    !proposal.approvedAt
    || !Number.isFinite(Date.parse(proposal.approvedAt))
    || !proposal.approvalActorHash?.match(/^[a-f0-9]{64}$/)
  ) {
    return false
  }
  if (proposal.approvalChannel === "telegram") {
    return (
      proposal.approvalReference === "telegram-button"
      && Number.isSafeInteger(proposal.telegramMessageId)
      && Number.isSafeInteger(proposal.telegramUpdateId)
      && proposal.telegramCallbackQueryHash?.match(/^[a-f0-9]{64}$/)
        != null
    )
  }
  return (
    proposal.approvalChannel === "codex"
    && proposal.approvalReference != null
    && isCodexAdsApprovalReference(proposal.approvalReference)
  )
}

async function assertExperimentChangeUnlocked(args: {
  proposal: AdsChangeProposal
  repository: AdsMutationGatewayRepository
}): Promise<void> {
  const lock = await args.repository.getMaterialExperimentLock({
    campaign: args.proposal.rationale.campaign,
  })
  if (
    lock
    && args.proposal.proposalKey !== lock.launchProposalKey
    && args.proposal.proposalKey !== lock.stopProposalKey
  ) {
    throw new Error("experiment_material_change_locked")
  }
}

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "unknown_error"
  const normalized = message
    .replace(/[^a-zA-Z0-9_:-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96)
  return normalized || "unknown_error"
}

function sydneyDateKey(value: string): string | null {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Australia/Sydney",
    year: "numeric",
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

function previousSydneyDateKey(value: string): string | null {
  const key = sydneyDateKey(value)
  if (!key) return null
  const [year, month, day] = key.split("-").map(Number)
  const previous = new Date(Date.UTC(year, month - 1, day - 1))
  return previous.toISOString().slice(0, 10)
}

interface StoredScaleProposalEvidence {
  apply_receipt: unknown
  operations: unknown
  status: unknown
  verification_receipt: unknown
}

interface StoredScaleRunEvidence {
  report_date: unknown
  snapshot: unknown
  status: unknown
}

export function deriveScriptsScaleAuthorizationEvidence(args: {
  budgetResourceName: string
  campaignResourceName: string
  historyComplete: boolean
  latestReportDate: string
  latestSnapshot: unknown
  liveMaterialChangeAt: string | null
  proposals: StoredScaleProposalEvidence[]
  runs: StoredScaleRunEvidence[]
}): AdsScaleAuthorizationEvidence | null {
  if (
    !args.historyComplete
    || !isAdsAgentSnapshot(args.latestSnapshot)
    || args.latestSnapshot.reportDate !== args.latestReportDate
  ) {
    return null
  }
  const touchesTarget = (value: unknown): boolean => {
    if (!Array.isArray(value)) return false
    return value.some((operation) => {
      const record = asRecord(operation)
      const kind = asString(record?.kind)
      const resourceName = asString(record?.resourceName)
      return (
        kind === "campaign_budget"
        && resourceName === args.budgetResourceName
      ) || (
        kind === "campaign_bidding"
        && resourceName === args.campaignResourceName
      )
    })
  }

  const appliedAt: string[] = []
  for (const row of args.proposals.filter((proposal) =>
    touchesTarget(proposal.operations))) {
    const status = asString(row.status)
    const receipt = asRecord(row.apply_receipt)
    const verification = asRecord(row.verification_receipt)
    const outcome = asString(receipt?.outcome)
    const verificationOutcome = asString(verification?.outcome)
    if (status === "applying") return null
    if (outcome === "ambiguous") {
      if (status === "failed" && verificationOutcome === "not_applied") {
        continue
      }
      if (!(status === "verified" && verificationOutcome === "verified")) {
        return null
      }
    } else if (outcome === "applied") {
      if (!(status === "verified" && verificationOutcome === "verified")) {
        return null
      }
    } else {
      continue
    }
    const value = asString(receipt?.appliedAt)
    if (!value || !Number.isFinite(Date.parse(value))) return null
    appliedAt.push(value)
  }
  if (
    args.liveMaterialChangeAt
    && Number.isFinite(Date.parse(args.liveMaterialChangeAt))
  ) {
    appliedAt.push(args.liveMaterialChangeAt)
  }
  appliedAt.sort((left, right) => Date.parse(right) - Date.parse(left))
  const previousChangeAt = appliedAt[0] ?? null
  if (!previousChangeAt) {
    return {
      previousMaterialChange: null,
      snapshot: args.latestSnapshot,
    }
  }

  const changeDate = sydneyDateKey(previousChangeAt)
  if (!changeDate) return null
  let attributedOrders = 0
  let totalOrdersAfterChange = 0
  const closedDates = new Set<string>()
  for (const row of args.runs) {
    if (
      row.status !== "delivered"
      || typeof row.report_date !== "string"
      || row.report_date > args.latestReportDate
      || !isAdsAgentSnapshot(row.snapshot)
      || row.snapshot.reportDate !== row.report_date
      || !Array.isArray(row.snapshot.daily)
      || closedDates.has(row.report_date)
    ) {
      return null
    }
    if (row.report_date <= changeDate) continue
    const campaigns = row.snapshot.daily.filter((campaign) =>
      campaign.campaignResourceName === args.campaignResourceName
      && resolveAdsCampaignService(campaign) === "scripts")
    const totalOrders = campaigns[0]?.orders
    const scriptsOrders = campaigns[0]?.serviceOrders.scripts ?? 0
    if (
      campaigns.length !== 1
      || totalOrders == null
      || totalOrders < 0
      || scriptsOrders < 0
      || scriptsOrders > totalOrders
    ) {
      return null
    }
    closedDates.add(row.report_date)
    attributedOrders += scriptsOrders
    totalOrdersAfterChange += totalOrders
  }
  if (
    totalOrdersAfterChange > 0
    && attributedOrders / totalOrdersAfterChange
      < POLICY.attribution.minimumExpectedServiceOrderShare
  ) return null
  return {
    previousMaterialChange: {
      attributedOrders,
      closedDays: closedDates.size,
    },
    snapshot: args.latestSnapshot,
  }
}

export function resolveLatestAdsMaterialChangeAt(args: {
  budgetResourceName: string
  campaignResourceName: string
  state: GoogleAdsAccountState
}): string | null {
  const relevantCampaignField = (fields: unknown): boolean => {
    const value = JSON.stringify(fields)
      .toLowerCase()
      .replace(/[_\-.]/g, "")
    return [
      "bidding",
      "campaignbudget",
      "maximizeconversionvalue",
      "targetroas",
    ].some((field) => value.includes(field))
  }
  const candidates = args.state.changeEvents
    .filter((event) => {
      if (event.changeResourceName === args.budgetResourceName) return true
      return event.changeResourceName === args.campaignResourceName
        && relevantCampaignField(event.changedFields)
    })
    .map((event) => event.changeDateTime)
    .filter((value): value is string =>
      value != null && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))
  return candidates[0] ?? null
}

function fallbackGoogleOperationsHash(proposal: AdsChangeProposal): string {
  return proposal.validationReceipt?.googleOperationsHash
    ?? hashAdsMutationOperations(proposal.operations)
}

async function requireTrackingGreen(args: {
  now: Date
  operations: AdsMutationOperation[]
  proposal: AdsChangeProposal
  repository: AdsMutationGatewayRepository
}): Promise<void> {
  if (!isScalingProposal(args.operations)) return
  const tracking = await args.repository.getLatestTrackingGate({
    now: args.now,
    runId: args.proposal.runId,
  })
  if (!tracking.fresh || tracking.state !== "GREEN") {
    throw new Error("tracking_not_green")
  }
}

async function requireScaleAuthorization(args: {
  operations: AdsMutationOperation[]
  proposal: AdsChangeProposal
  repository: AdsMutationGatewayRepository
  state: GoogleAdsAccountState
}): Promise<void> {
  const budgetIncreases = args.operations.filter(
    (operation): operation is Extract<
      AdsMutationOperation,
      { kind: "campaign_budget" }
    > => operation.kind === "campaign_budget"
      && operation.nextMicros > operation.expectedMicros,
  )
  const biddingChanges = args.operations.filter(
    (operation): operation is Extract<
      AdsMutationOperation,
      { kind: "campaign_bidding" }
    > => operation.kind === "campaign_bidding",
  )
  if (budgetIncreases.length === 0 && biddingChanges.length === 0) return

  const governedChanges = [
    ...budgetIncreases.map((operation) => ({ operation, type: "budget" as const })),
    ...biddingChanges.map((operation) => ({ operation, type: "bidding" as const })),
  ]
  for (const change of governedChanges) {
    const owners = args.state.campaigns
      .map((resource) => ({
        campaign: asRecord(resource.values.campaign),
        resourceName: resource.resourceName,
      }))
      .filter(({ campaign, resourceName }) =>
        change.type === "budget"
          ? asString(campaign?.campaignBudget) === change.operation.resourceName
          : resourceName === change.operation.resourceName)
    if (owners.length !== 1 || !owners[0].resourceName) {
      throw new Error(
        change.type === "budget"
          ? "campaign_budget_owner_ambiguous"
          : "campaign_bidding_owner_ambiguous",
      )
    }
    const service = resolveAdsCampaignService({
      campaignName: asString(owners[0].campaign?.name) ?? "",
    })
    if (!service) throw new Error("ungoverned_campaign_service")
    if (
      normalizedCampaignLabel(args.proposal.rationale.campaign)
        !== normalizedCampaignLabel(owners[0].campaign?.name)
    ) {
      throw new Error("proposal_campaign_mismatch")
    }
    if (args.proposal.rationale.service !== service) {
      throw new Error("proposal_service_mismatch")
    }
    if (service !== "scripts") continue
    if (
      args.state.changeEventHistorySaturated === true
      || args.state.changeEvents.length >= 20_000
    ) {
      throw new Error("scripts_change_history_saturated")
    }
    const budgetResourceName = asString(owners[0].campaign?.campaignBudget)
    if (!budgetResourceName) {
      throw new Error("scripts_budget_owner_unavailable")
    }
    const liveTargetRoas = asNumber(
      asRecord(owners[0].campaign?.maximizeConversionValue)?.targetRoas,
    )
    const liveStrategy = asString(owners[0].campaign?.biddingStrategyType)
    if (change.type === "budget") {
      if (
        liveStrategy !== "MAXIMIZE_CONVERSION_VALUE"
        || liveTargetRoas == null
        || liveTargetRoas < POLICY.scripts.scale.initialTargetRoas
      ) {
        throw new Error("scripts_live_troas_floor_missing")
      }
    } else if (
      liveStrategy !== "MAXIMIZE_CONVERSION_VALUE"
      || change.operation.next.strategy !== "MAXIMIZE_CONVERSION_VALUE"
      || change.operation.next.targetRoas == null
      || change.operation.next.targetRoas
        < POLICY.scripts.scale.initialTargetRoas
    ) {
      throw new Error("scripts_bidding_authorization_rejected")
    }

    const evidence = await args.repository.getScaleAuthorizationEvidence({
      budgetResourceName,
      campaignResourceName: owners[0].resourceName,
      liveMaterialChangeAt: resolveLatestAdsMaterialChangeAt({
        budgetResourceName,
        campaignResourceName: owners[0].resourceName,
        state: args.state,
      }),
      runId: args.proposal.runId,
      service,
    })
    if (!evidence) throw new Error("scripts_scale_authorization_unavailable")
    if (
      evidence.snapshot.reportDate
        !== previousSydneyDateKey(args.state.readAt)
    ) {
      throw new Error("scripts_scale_evidence_stale")
    }

    const campaigns = evidence.snapshot.rolling30.filter((campaign) =>
      campaign.budgetResourceName === budgetResourceName
      && resolveAdsCampaignService(campaign) === "scripts"
    )
    if (campaigns.length !== 1) {
      throw new Error("scripts_budget_evidence_unavailable")
    }
    authorizeScriptsScaleEligibility(campaigns[0])
    if (change.type === "bidding") continue
    authorizeScriptsBudgetScale({
      campaign: campaigns[0],
      expectedMicros: change.operation.expectedMicros,
      nextMicros: change.operation.nextMicros,
      ...(evidence.previousMaterialChange
        ? {
            closedDaysAfterPreviousChange:
              evidence.previousMaterialChange.closedDays,
            ordersAfterPreviousChange:
              evidence.previousMaterialChange.attributedOrders,
          }
        : {}),
    })
  }
}

function reverseOperations(
  operations: AdsMutationOperation[],
  state: GoogleAdsAccountState,
): AdsMutationOperation[] {
  return operations.map((operation): AdsMutationOperation => {
    if (operation.kind === "campaign_status") {
      return { ...operation, expected: operation.next, next: operation.expected }
    }
    if (operation.kind === "campaign_budget") {
      return {
        ...operation,
        expectedMicros: operation.nextMicros,
        nextMicros: operation.expectedMicros,
      }
    }
    if (operation.kind === "campaign_bidding") {
      return { ...operation, expected: operation.next, next: operation.expected }
    }
    if (operation.kind === "ad_group_cpc_bid") {
      return {
        ...operation,
        expectedMicros: operation.nextMicros,
        nextMicros: operation.expectedMicros,
      }
    }
    if (operation.kind === "ad_status") {
      return {
        expected: operation.next,
        kind: "ad_status",
        next: operation.expected,
        resourceName: operation.resourceName,
      }
    }
    if (operation.kind === "keyword_status") {
      return {
        expected: operation.next,
        kind: "keyword_status",
        next: operation.expected,
        resourceName: operation.resourceName,
      }
    }
    if (operation.kind === "asset_link_status") {
      return {
        expected: operation.next,
        kind: "asset_link_status",
        next: operation.expected,
        resourceName: operation.resourceName,
      }
    }
    if (operation.kind === "schedule_replace") {
      return { ...operation, expected: operation.next, next: operation.expected }
    }
    if (operation.kind === "responsive_search_ad_create") {
      const matches = matchingResponsiveSearchAds(state, operation)
        .filter(({ status }) => status === operation.status)
      if (matches.length !== 1) {
        throw new Error("responsive_search_ad_rollback_resource_missing")
      }
      return {
        expected: operation.status,
        kind: "ad_status",
        next: "REMOVED",
        resourceName: matches[0].resourceName,
      }
    }
    if (operation.kind === "positive_keyword_create") {
      const matches = matchingPositiveKeywords(state, operation)
        .filter(({ status }) => status === operation.status)
      if (matches.length !== 1) {
        throw new Error("positive_keyword_rollback_resource_missing")
      }
      return {
        expected: operation.status,
        kind: "keyword_status",
        next: "REMOVED",
        resourceName: matches[0].resourceName,
      }
    }

    const criterion = state.campaignCriteria.find((resource) => {
      const value = asRecord(resource.values.campaignCriterion)
      const keyword = asRecord(value?.keyword)
      return (
        value?.campaign === operation.campaignResourceName
        && value?.negative === true
        && asString(keyword?.text)?.toLowerCase()
          === operation.text.toLowerCase()
        && asString(keyword?.matchType) === operation.matchType
      )
    })
    if (!criterion?.resourceName) {
      throw new Error("negative_keyword_rollback_resource_missing")
    }
    return {
      expected: "ENABLED",
      kind: "keyword_status",
      next: "REMOVED",
      resourceName: criterion.resourceName,
    }
  })
}

export function createAdsMutationGateway(
  dependencies: AdsMutationGatewayDependencies,
): AdsMutationGateway {
  const repository = dependencies.repository

  async function getProposal(proposalKey: string): Promise<AdsChangeProposal> {
    const proposal = await repository.getProposalByKey(proposalKey)
    if (!proposal) throw new Error("proposal_not_found")
    return proposal
  }

  async function appendAudit(
    receipt: AdsMutationAuditReceipt,
  ): Promise<void> {
    await repository.appendAudit(receipt)
  }

  async function abortApprovedProposal(args: {
    code: string
    googleOperationsHash: string
    now: Date
    proposal: AdsChangeProposal
  }): Promise<ApplyReceipt> {
    const receipt: ApplyReceipt = {
      appliedAt: args.now.toISOString(),
      errorCode: args.code,
      googleOperationsHash: args.googleOperationsHash,
      outcome: "aborted",
      proposalKey: args.proposal.proposalKey,
      requestId: null,
    }
    const recorded = await repository.recordApplyOutcome({
      expectedStatus: "approved",
      proposalId: args.proposal.id,
      receipt,
      status: "aborted",
    })
    if (!recorded) throw new Error("proposal_apply_cas_miss")
    await appendAudit({
      errorCode: args.code,
      googleOperationsHash: args.googleOperationsHash,
      outcome: "aborted",
      proposalKey: args.proposal.proposalKey,
      requestId: null,
      stage: "apply",
      timestamp: args.now.toISOString(),
    })
    return receipt
  }

  async function createRollback(
    proposal: AdsChangeProposal,
    state: GoogleAdsAccountState,
    now: Date,
  ): Promise<AdsChangeProposal> {
    const operations = reverseOperations(proposal.operations, state)
    const rollback = await repository.createRollbackDraft({
      baselineHash: hashGoogleAdsAccountState(state),
      liveState: state,
      operations,
      original: proposal,
    })
    await appendAudit({
      errorCode: null,
      googleOperationsHash: hashAdsMutationOperations(operations),
      outcome: "draft_created",
      proposalKey: proposal.proposalKey,
      requestId: null,
      stage: "rollback",
      timestamp: now.toISOString(),
    })
    return rollback
  }

  async function validateProposal(
    proposalKey: string,
  ): Promise<ValidationReceipt> {
    const now = dependencies.now()
    const proposal = await getProposal(proposalKey)
    if (proposal.status !== "draft") throw new Error("proposal_not_draft")
    if (isAdsProposalExpired(proposal, now)) {
      throw new Error("proposal_expired")
    }

    let receipt: ValidationReceipt
    try {
      await assertExperimentChangeUnlocked({ proposal, repository })
      const state = await dependencies.getAccountState({ now })
      const baselineHash = hashGoogleAdsAccountState(state)
      if (baselineHash !== proposal.baselineHash) {
        throw new Error("baseline_drift")
      }
      const operations = validateAdsMutationPolicy({
        operations: proposal.operations,
        state,
      })
      assertExpectedOperationState(operations, state)
      await requireTrackingGreen({
        now,
        operations,
        proposal,
        repository,
      })
      await requireScaleAuthorization({
        operations,
        proposal,
        repository,
        state,
      })
      const googleOperations = buildGoogleAdsMutateOperations(
        operations,
        state,
      )
      const googleOperationsHash = hashGoogleAdsMutateOperations(
        googleOperations,
      )
      const validation = await dependencies.mutateGoogleAds({
        operations: googleOperations,
        validateOnly: true,
      })
      receipt = {
        baselineHash,
        errorCode: validation.ok ? null : "google_ads_validate_failed",
        googleOperationsHash,
        ok: validation.ok,
        operationHash: proposal.operationHash,
        proposalKey,
        requestId: validation.requestId,
        validatedAt: now.toISOString(),
      }
    } catch (error) {
      receipt = {
        baselineHash: proposal.baselineHash,
        errorCode: errorCode(error),
        googleOperationsHash: null,
        ok: false,
        operationHash: proposal.operationHash,
        proposalKey,
        requestId: null,
        validatedAt: now.toISOString(),
      }
    }

    await repository.recordValidation({ proposal, receipt })
    await appendAudit({
      errorCode: receipt.errorCode ?? null,
      googleOperationsHash:
        receipt.googleOperationsHash
        ?? hashAdsMutationOperations(proposal.operations),
      outcome: receipt.ok ? "validated" : "failed",
      proposalKey,
      requestId: receipt.requestId,
      stage: "validate",
      timestamp: now.toISOString(),
    })
    return receipt
  }

  async function applyProposal(
    proposalKey: string,
  ): Promise<ApplyReceipt> {
    if (!dependencies.mutationsEnabled()) {
      throw new Error("mutations_disabled")
    }
    const now = dependencies.now()
    const proposal = await getProposal(proposalKey)
    if (proposal.status !== "approved") {
      throw new Error("proposal_status_invalid")
    }
    if (isAdsProposalExpired(proposal, now)) {
      throw new Error("proposal_expired")
    }
    if (!verifiedDecisionReceipt(proposal)) {
      throw new Error("decision_receipt_unverified")
    }

    let state: GoogleAdsAccountState
    let operations: AdsMutationOperation[]
    let googleOperations: GoogleAdsMutateOperation[]
    let googleOperationsHash = fallbackGoogleOperationsHash(proposal)
    try {
      await assertExperimentChangeUnlocked({ proposal, repository })
      state = await dependencies.getAccountState({ now })
      operations = validateAdsMutationPolicy({
        operations: proposal.operations,
        state,
      })
      googleOperations = buildGoogleAdsMutateOperations(operations, state)
      googleOperationsHash = hashGoogleAdsMutateOperations(googleOperations)
      const eligibility = getAdsProposalApplyEligibility({
        decisionReceiptVerified: true,
        liveBaselineHash: hashGoogleAdsAccountState(state),
        now,
        proposal,
      })
      if (!eligibility.eligible) throw new Error(eligibility.reason)
      assertExpectedOperationState(operations, state)
      if (
        !proposal.validationReceipt?.googleOperationsHash
        || proposal.validationReceipt.googleOperationsHash
          !== googleOperationsHash
      ) {
        throw new Error("validated_operations_mismatch")
      }
      await requireTrackingGreen({
        now,
        operations,
        proposal,
        repository,
      })
      await requireScaleAuthorization({
        operations,
        proposal,
        repository,
        state,
      })
    } catch (error) {
      return abortApprovedProposal({
        code: errorCode(error),
        googleOperationsHash,
        now,
        proposal,
      })
    }

    const validation = await dependencies.mutateGoogleAds({
      operations: googleOperations,
      validateOnly: true,
    })
    if (!validation.ok) {
      return abortApprovedProposal({
        code: "google_ads_validate_failed",
        googleOperationsHash,
        now,
        proposal,
      })
    }

    const claimed = await repository.claimApply({
      proposalId: proposal.id,
    })
    if (!claimed) throw new Error("proposal_apply_cas_miss")
    try {
      await appendAudit({
        errorCode: null,
        googleOperationsHash,
        outcome: "claimed",
        proposalKey,
        requestId: validation.requestId,
        stage: "apply_started",
        timestamp: now.toISOString(),
      })
    } catch {
      const receipt: ApplyReceipt = {
        appliedAt: now.toISOString(),
        errorCode: "audit_receipt_unavailable",
        googleOperationsHash,
        outcome: "aborted",
        proposalKey,
        requestId: validation.requestId,
      }
      const recorded = await repository.recordApplyOutcome({
        expectedStatus: "applying",
        proposalId: proposal.id,
        receipt,
        status: "aborted",
      })
      if (!recorded) throw new Error("proposal_apply_receipt_cas_miss")
      return receipt
    }

    const result = await dependencies.mutateGoogleAds({
      operations: googleOperations,
      validateOnly: false,
    })
    let outcome: ApplyReceipt["outcome"] = result.ok
      ? "applied"
      : result.requestId
        ? "failed"
        : "ambiguous"
    let applyReceipt: ApplyReceipt = {
      appliedAt: now.toISOString(),
      errorCode: result.ok
        ? null
        : result.requestId
          ? "google_ads_apply_failed"
          : "google_ads_apply_ambiguous",
      googleOperationsHash,
      outcome,
      proposalKey,
      requestId: result.requestId,
    }

    let postState: GoogleAdsAccountState
    try {
      postState = await dependencies.getAccountState({
        now: dependencies.now(),
      })
    } catch {
      outcome = "ambiguous"
      applyReceipt = {
        ...applyReceipt,
        errorCode: "readback_unavailable",
        outcome,
      }
      const verification: VerificationReceipt = {
        outcome: "mismatch",
        proposalKey,
        resourceHashes: {},
        verifiedAt: dependencies.now().toISOString(),
      }
      const recorded = await repository.recordApplyOutcome({
        expectedStatus: "applying",
        proposalId: proposal.id,
        receipt: applyReceipt,
        status: "failed",
        verificationReceipt: verification,
      })
      if (!recorded) throw new Error("proposal_apply_receipt_cas_miss")
      await appendAudit({
        errorCode: applyReceipt.errorCode,
        googleOperationsHash,
        outcome,
        proposalKey,
        requestId: result.requestId,
        stage: "apply",
        timestamp: dependencies.now().toISOString(),
      })
      await appendAudit({
        errorCode: "readback_unavailable",
        googleOperationsHash,
        outcome: "mismatch",
        proposalKey,
        requestId: result.requestId,
        stage: "verify",
        timestamp: dependencies.now().toISOString(),
      })
      return applyReceipt
    }
    const verification = verifyOperationState(
      proposalKey,
      operations,
      postState,
      dependencies.now(),
    )

    if (!result.ok) {
      const ambiguousStateLanded =
        !result.requestId && verification.outcome === "verified"
      const failureVerification: VerificationReceipt = ambiguousStateLanded
        ? verification
        : {
            ...verification,
            outcome:
              verification.outcome === "verified"
                ? "mismatch"
                : "not_applied",
          }
      const recorded = await repository.recordApplyOutcome({
        expectedStatus: "applying",
        proposalId: proposal.id,
        receipt: applyReceipt,
        status: ambiguousStateLanded ? "applied" : "failed",
        ...(!ambiguousStateLanded
          ? { verificationReceipt: failureVerification }
          : {}),
      })
      if (!recorded) throw new Error("proposal_apply_receipt_cas_miss")
      await appendAudit({
        errorCode: applyReceipt.errorCode,
        googleOperationsHash,
        outcome,
        proposalKey,
        requestId: result.requestId,
        stage: "apply",
        timestamp: dependencies.now().toISOString(),
      })
      if (ambiguousStateLanded) {
        const verified = await repository.recordVerification({
          expectedStatus: "applied",
          proposalId: proposal.id,
          receipt: verification,
          status: "verified",
        })
        if (!verified) throw new Error("proposal_verification_cas_miss")
      }
      await appendAudit({
        errorCode: ambiguousStateLanded ? null : applyReceipt.errorCode,
        googleOperationsHash,
        outcome: failureVerification.outcome,
        proposalKey,
        requestId: result.requestId,
        stage: "verify",
        timestamp: dependencies.now().toISOString(),
      })
      if (
        !ambiguousStateLanded
        && verification.outcome === "verified"
      ) {
        await createRollback(proposal, postState, dependencies.now())
      }
      return applyReceipt
    }

    const applied = await repository.recordApplyOutcome({
      expectedStatus: "applying",
      proposalId: proposal.id,
      receipt: applyReceipt,
      status: "applied",
    })
    if (!applied) throw new Error("proposal_apply_receipt_cas_miss")
    await appendAudit({
      errorCode: null,
      googleOperationsHash,
      outcome: "applied",
      proposalKey,
      requestId: result.requestId,
      stage: "apply",
      timestamp: dependencies.now().toISOString(),
    })

    const verified = await repository.recordVerification({
      expectedStatus: "applied",
      proposalId: proposal.id,
      receipt: verification,
      status: verification.outcome === "verified" ? "verified" : "failed",
    })
    if (!verified) throw new Error("proposal_verification_cas_miss")
    await appendAudit({
      errorCode:
        verification.outcome === "verified"
          ? null
          : "readback_mismatch",
      googleOperationsHash,
      outcome: verification.outcome,
      proposalKey,
      requestId: result.requestId,
      stage: "verify",
      timestamp: dependencies.now().toISOString(),
    })
    if (verification.outcome !== "verified") {
      await createRollback(proposal, postState, dependencies.now())
    }
    return applyReceipt
  }

  async function verifyProposal(
    proposalKey: string,
  ): Promise<VerificationReceipt> {
    const proposal = await getProposal(proposalKey)
    if (
      proposal.status !== "applied"
      && proposal.status !== "verified"
      && proposal.status !== "failed"
    ) {
      throw new Error("proposal_not_applied")
    }
    const state = await dependencies.getAccountState({
      now: dependencies.now(),
    })
    const verification = verifyOperationState(
      proposalKey,
      proposal.operations,
      state,
      dependencies.now(),
    )
    if (proposal.status === "applied") {
      const recorded = await repository.recordVerification({
        expectedStatus: "applied",
        proposalId: proposal.id,
        receipt: verification,
        status: verification.outcome === "verified" ? "verified" : "failed",
      })
      if (!recorded) throw new Error("proposal_verification_cas_miss")
    }
    await appendAudit({
      errorCode:
        verification.outcome === "verified"
          ? null
          : "readback_mismatch",
      googleOperationsHash:
        proposal.applyReceipt?.googleOperationsHash
        ?? fallbackGoogleOperationsHash(proposal),
      outcome: verification.outcome,
      proposalKey,
      requestId: proposal.applyReceipt?.requestId ?? null,
      stage: "verify",
      timestamp: dependencies.now().toISOString(),
    })
    return verification
  }

  async function reconcileProposal(
    proposalKey: string,
  ): Promise<VerificationReceipt> {
    const proposal = await getProposal(proposalKey)
    if (proposal.status !== "applying") {
      throw new Error("proposal_not_applying")
    }
    if (proposal.applyReceipt || proposal.verificationReceipt) {
      throw new Error("proposal_reconciliation_receipt_conflict")
    }
    if (
      !proposal.validationReceipt?.ok
      || !proposal.validationReceipt.googleOperationsHash
      || proposal.validationReceipt.operationHash !== proposal.operationHash
      || !verifiedDecisionReceipt(proposal)
    ) {
      throw new Error("proposal_reconciliation_evidence_invalid")
    }

    const state = await dependencies.getAccountState({
      now: dependencies.now(),
    })
    const verifiedAt = dependencies.now()
    const verification = verifyOperationState(
      proposalKey,
      proposal.operations,
      state,
      verifiedAt,
    )
    if (verification.outcome !== "verified") {
      await appendAudit({
        errorCode: "applying_reconciliation_mismatch",
        googleOperationsHash:
          proposal.validationReceipt.googleOperationsHash,
        outcome: verification.outcome,
        proposalKey,
        requestId: null,
        stage: "verify",
        timestamp: verifiedAt.toISOString(),
      })
      throw new Error("proposal_reconciliation_mismatch")
    }

    const applyReceipt: ApplyReceipt = {
      appliedAt: verifiedAt.toISOString(),
      errorCode: "worker_interrupted_after_google_mutate",
      googleOperationsHash:
        proposal.validationReceipt.googleOperationsHash,
      outcome: "ambiguous",
      proposalKey,
      requestId: null,
    }
    const applied = await repository.recordApplyOutcome({
      expectedStatus: "applying",
      proposalId: proposal.id,
      receipt: applyReceipt,
      status: "applied",
    })
    if (!applied) throw new Error("proposal_apply_receipt_cas_miss")
    await appendAudit({
      errorCode: applyReceipt.errorCode,
      googleOperationsHash: applyReceipt.googleOperationsHash,
      outcome: applyReceipt.outcome,
      proposalKey,
      requestId: null,
      stage: "apply",
      timestamp: verifiedAt.toISOString(),
    })

    const verified = await repository.recordVerification({
      expectedStatus: "applied",
      proposalId: proposal.id,
      receipt: verification,
      status: "verified",
    })
    if (!verified) throw new Error("proposal_verification_cas_miss")
    await appendAudit({
      errorCode: null,
      googleOperationsHash: applyReceipt.googleOperationsHash,
      outcome: verification.outcome,
      proposalKey,
      requestId: null,
      stage: "verify",
      timestamp: verifiedAt.toISOString(),
    })
    return verification
  }

  async function buildRollbackProposal(
    proposalKey: string,
  ): Promise<AdsChangeProposal> {
    const proposal = await getProposal(proposalKey)
    const state = await dependencies.getAccountState({
      now: dependencies.now(),
    })
    return createRollback(proposal, state, dependencies.now())
  }

  return {
    applyProposal,
    buildRollbackProposal,
    reconcileProposal,
    validateProposal,
    verifyProposal,
  }
}

export function createSupabaseAdsMutationRepository(args: {
  supabase: SupabaseClient
}): AdsMutationGatewayRepository {
  const { supabase } = args
  return {
    async appendAudit(receipt) {
      const result = await supabase.from("audit_logs").insert({
        action: AUDIT_ACTION,
        actor_type: "system",
        created_at: receipt.timestamp,
        metadata: {
          error_code: receipt.errorCode,
          google_operations_hash: receipt.googleOperationsHash,
          outcome: receipt.outcome,
          proposal_key: receipt.proposalKey,
          request_id: receipt.requestId,
          stage: receipt.stage,
        },
      })
      if (result.error) {
        throw new Error(
          `google_ads_mutation_audit_failed:${result.error.code || "unknown"}`,
        )
      }
    },
    async claimApply({ proposalId }) {
      const result = await supabase
        .from("google_ads_change_proposals")
        .update({
          status: "applying",
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposalId)
        .eq("status", "approved")
        .select("id")
        .maybeSingle()
      if (result.error) {
        throw new Error(
          `google_ads_proposal_apply_claim_failed:${result.error.code || "unknown"}`,
        )
      }
      return result.data != null
    },
    createRollbackDraft: async ({
      baselineHash,
      operations,
      original,
    }) =>
      createAdsProposalDraft({
        baselineHash,
        mutationFamily: operations[0].kind,
        operations,
        rationale: {
          ...original.rationale,
          currentValue: original.rationale.requestedValue,
          reason: `Rollback packet for ${original.proposalKey}`,
          requestedValue: original.rationale.currentValue,
        },
        rollbackPlan: {
          value: original.rationale.requestedValue,
        },
        supabase,
      }),
    async getLatestTrackingGate({ now, runId }) {
      if (!runId) {
        return {
          checkedAt: now.toISOString(),
          fresh: false,
          state: "RED",
        }
      }
      const [source, latest] = await Promise.all([
        supabase
          .from("google_ads_agent_runs")
          .select("id, status, tracking_state, completed_at")
          .eq("id", runId)
          .maybeSingle(),
        supabase
          .from("google_ads_agent_runs")
          .select("id, status, tracking_state, completed_at")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      if (source.error || latest.error || !source.data || !latest.data) {
        return {
          checkedAt: now.toISOString(),
          fresh: false,
          state: "RED",
        }
      }
      const completedAt = Date.parse(latest.data.completed_at ?? "")
      const fresh =
        latest.data.status === "delivered"
        && source.data.status === "delivered"
        && Number.isFinite(completedAt)
        && now.getTime() - completedAt <= TRACKING_GATE_MAX_AGE_MS
        && now.getTime() >= completedAt
      const state =
        source.data.tracking_state === "GREEN"
        && latest.data.tracking_state === "GREEN"
          ? "GREEN"
          : source.data.tracking_state === "RED"
            || latest.data.tracking_state === "RED"
            ? "RED"
            : "AMBER"
      return {
        checkedAt: now.toISOString(),
        fresh,
        state,
      }
    },
    async getScaleAuthorizationEvidence({
      budgetResourceName,
      campaignResourceName,
      liveMaterialChangeAt,
      runId,
      service,
    }) {
      if (!runId) return null
      const [source, latest] = await Promise.all([
        supabase
          .from("google_ads_agent_runs")
          .select("id, report_date, status, snapshot")
          .eq("id", runId)
          .maybeSingle(),
        supabase
          .from("google_ads_agent_runs")
          .select("id, report_date, status, snapshot")
          .eq("status", "delivered")
          .order("report_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      if (
        source.error
        || latest.error
        || source.data?.status !== "delivered"
        || latest.data?.status !== "delivered"
        || typeof latest.data.report_date !== "string"
        || !isAdsAgentSnapshot(latest.data.snapshot)
      ) {
        return null
      }

      const historyCutoff = new Date(
        Date.parse(latest.data.snapshot.generatedAt) - 90 * 24 * 60 * 60 * 1_000,
      ).toISOString()
      const proposalFields =
        "id, status, mutation_family, operations, apply_receipt, verification_receipt, updated_at" as const
      const [recent, applying, ambiguousFailed] = await Promise.all([
        supabase
          .from("google_ads_change_proposals")
          .select(proposalFields)
          .in("mutation_family", ["campaign_budget", "campaign_bidding"])
          .gte("updated_at", historyCutoff)
          .order("updated_at", { ascending: false })
          .limit(200),
        supabase
          .from("google_ads_change_proposals")
          .select(proposalFields)
          .in("mutation_family", ["campaign_budget", "campaign_bidding"])
          .eq("status", "applying")
          .limit(200),
        supabase
          .from("google_ads_change_proposals")
          .select(proposalFields)
          .in("mutation_family", ["campaign_budget", "campaign_bidding"])
          .eq("status", "failed")
          .eq("apply_receipt->>outcome", "ambiguous")
          .limit(200),
      ])
      if (
        recent.error
        || applying.error
        || ambiguousFailed.error
        || (recent.data?.length ?? 0) >= 200
        || (applying.data?.length ?? 0) >= 200
        || (ambiguousFailed.data?.length ?? 0) >= 200
      ) {
        return null
      }
      const proposalRows = new Map<string, (typeof recent.data)[number]>()
      for (const row of [
        ...(recent.data ?? []),
        ...(applying.data ?? []),
        ...(ambiguousFailed.data ?? []),
      ]) {
        if (typeof row.id !== "string") return null
        proposalRows.set(row.id, row)
      }

      const firstHistoryDate = sydneyDateKey(historyCutoff)
      if (!firstHistoryDate) return null
      const runs = await supabase
        .from("google_ads_agent_runs")
        .select("report_date, status, snapshot")
        .eq("status", "delivered")
        .gte("report_date", firstHistoryDate)
        .lte("report_date", latest.data.report_date)
        .order("report_date", { ascending: true })
      if (runs.error) return null
      if (service !== "scripts") return null
      return deriveScriptsScaleAuthorizationEvidence({
        budgetResourceName,
        campaignResourceName,
        historyComplete: (
          (recent.data?.length ?? 0) < 200
          && (applying.data?.length ?? 0) < 200
          && (ambiguousFailed.data?.length ?? 0) < 200
        ),
        latestReportDate: latest.data.report_date,
        latestSnapshot: latest.data.snapshot,
        liveMaterialChangeAt,
        proposals: [...proposalRows.values()],
        runs: runs.data ?? [],
      })
    },
    async getMaterialExperimentLock({ campaign }) {
      const result = await supabase
        .from("google_ads_experiments")
        .select("control, result")
        .in("status", [
          "draft",
          "approved",
          "running",
          "won",
          "lost",
          "inconclusive",
        ])
      if (result.error) {
        throw new Error(
          `google_ads_experiment_lock_read_failed:${result.error.code || "unknown"}`,
        )
      }
      const normalize = (value: string) =>
        value
          .normalize("NFKD")
          .replace(/[’']/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase()
      const matches = (result.data ?? []).filter((value) => {
        const control = asRecord(value.control)
        return (
          typeof control?.campaign === "string"
          && normalize(control.campaign) === normalize(campaign)
        )
      })
      if (matches.length > 1) {
        throw new Error("multiple_experiment_locks")
      }
      const match = matches[0]
      if (!match) return null
      const value = asRecord(match.result)
      const launchProposalKey = asString(value?.launchProposalKey)
      if (!launchProposalKey) {
        throw new Error("experiment_launch_packet_missing")
      }
      return {
        launchProposalKey,
        stopProposalKey: asString(value?.stopProposalKey),
      }
    },
    getProposalByKey: (proposalKey) =>
      getAdsProposalByKey(supabase, proposalKey),
    async recordApplyOutcome({
      expectedStatus,
      proposalId,
      receipt,
      status,
      verificationReceipt,
    }) {
      const result = await supabase
        .from("google_ads_change_proposals")
        .update({
          apply_receipt: receipt,
          status,
          updated_at: new Date().toISOString(),
          ...(verificationReceipt
            ? { verification_receipt: verificationReceipt }
            : {}),
        })
        .eq("id", proposalId)
        .eq("status", expectedStatus)
        .select("id")
        .maybeSingle()
      if (result.error) {
        throw new Error(
          `google_ads_proposal_apply_receipt_failed:${result.error.code || "unknown"}`,
        )
      }
      return result.data != null
    },
    recordValidation: ({ proposal, receipt }) =>
      recordAdsProposalValidation({
        proposal,
        receipt,
        supabase,
      }),
    async recordVerification({
      expectedStatus,
      proposalId,
      receipt,
      status,
    }) {
      const result = await supabase
        .from("google_ads_change_proposals")
        .update({
          status,
          updated_at: new Date().toISOString(),
          verification_receipt: receipt,
        })
        .eq("id", proposalId)
        .eq("status", expectedStatus)
        .select("id")
        .maybeSingle()
      if (result.error) {
        throw new Error(
          `google_ads_proposal_verification_receipt_failed:${result.error.code || "unknown"}`,
        )
      }
      return result.data != null
    },
  }
}

function defaultGateway(): AdsMutationGateway {
  const supabase = createServiceRoleClient()
  return createAdsMutationGateway({
    getAccountState: getAdsAccountState,
    mutateGoogleAds,
    mutationsEnabled: () =>
      process.env.GOOGLE_ADS_AGENT_MUTATIONS_ENABLED === "true",
    now: () => new Date(),
    repository: createSupabaseAdsMutationRepository({ supabase }),
  })
}

export async function validateProposal(
  proposalKey: string,
): Promise<ValidationReceipt> {
  return defaultGateway().validateProposal(proposalKey)
}

export async function applyProposal(
  proposalKey: string,
): Promise<ApplyReceipt> {
  return defaultGateway().applyProposal(proposalKey)
}

export async function verifyProposal(
  proposalKey: string,
): Promise<VerificationReceipt> {
  return defaultGateway().verifyProposal(proposalKey)
}

export async function reconcileProposal(
  proposalKey: string,
): Promise<VerificationReceipt> {
  return defaultGateway().reconcileProposal(proposalKey)
}

export async function buildRollbackProposal(
  proposalKey: string,
): Promise<AdsChangeProposal> {
  return defaultGateway().buildRollbackProposal(proposalKey)
}
