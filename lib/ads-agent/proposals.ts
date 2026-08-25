import "server-only"

import { createHash } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import { containsProhibitedPaidMedicineTerm } from "@/lib/ads-agent/policy"
import type {
  AdsMutationFamily,
  AdsService,
} from "@/lib/ads-agent/types"
import {
  containsBannedPhrase,
  containsEmDash,
} from "@/lib/marketing/voice"

export interface BiddingConfig {
  strategy:
    | "MANUAL_CPC"
    | "MAXIMIZE_CONVERSIONS"
    | "MAXIMIZE_CONVERSION_VALUE"
  targetCpaMicros?: number
  targetRoas?: number
}

export interface AdSchedule {
  dayOfWeek:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY"
  endHour: number
  endMinute: "ZERO" | "FIFTEEN" | "THIRTY" | "FORTY_FIVE"
  startHour: number
  startMinute: "ZERO" | "FIFTEEN" | "THIRTY" | "FORTY_FIVE"
}

interface CampaignCreateKeyword {
  exemptPolicyViolationKeys: Array<{
    policyName:
      | "BIRTH_CONTROL"
      | "HEALTH_IN_PERSONALIZED_ADS"
      | "PRESCRIPTION_DRUG_SALE"
    violatingText: string
  }>
  matchType: "EXACT" | "PHRASE"
  text: string
}

interface CampaignCreateResponsiveSearchAd {
  descriptions: string[]
  headlines: string[]
  path1: string
  path2: string
}

interface CampaignCreateAdGroup {
  keywords: CampaignCreateKeyword[]
  name: string
  responsiveSearchAd: CampaignCreateResponsiveSearchAd
}

export type AdsMutationOperation =
  | {
      adGroups: CampaignCreateAdGroup[]
      campaignName: string
      cpcBidMicros: number
      dailyBudgetMicros: number
      finalUrl: string
      kind: "campaign_create"
      languageResourceName: string
      locationResourceName: string
      service: "ed" | "hair_loss" | "womens_health"
      status: "ENABLED"
    }
  | {
      kind: "campaign_status"
      resourceName: string
      expected: "ENABLED" | "PAUSED"
      next: "ENABLED" | "PAUSED"
    }
  | {
      kind: "campaign_budget"
      resourceName: string
      expectedMicros: number
      nextMicros: number
    }
  | {
      kind: "campaign_bidding"
      resourceName: string
      expected: BiddingConfig
      next: BiddingConfig
    }
  | {
      kind: "ad_group_cpc_bid"
      resourceName: string
      expectedMicros: number
      nextMicros: number
    }
  | {
      kind: "ad_status"
      resourceName: string
      expected: "ENABLED" | "PAUSED" | "REMOVED"
      next: "ENABLED" | "PAUSED" | "REMOVED"
    }
  | {
      kind: "keyword_status"
      resourceName: string
      expected: string
      next: string
    }
  | {
      kind: "negative_keyword"
      campaignResourceName: string
      matchType: "EXACT" | "PHRASE"
      text: string
    }
  | {
      campaignResourceName: string
      kind: "shared_negative_list"
      keywords: Array<{
        matchType: "BROAD"
        text: string
      }>
      sharedSetResourceName: string
    }
  | {
      kind: "asset_link_status"
      resourceName: string
      expected: string
      next: string
    }
  | {
      kind: "schedule_replace"
      campaignResourceName: string
      expected: AdSchedule[]
      next: AdSchedule[]
    }
  | {
      kind: "responsive_search_ad_create"
      adGroupResourceName: string
      descriptions: string[]
      finalUrl: string
      headlines: string[]
      path1: string
      path2: string
      status: "ENABLED" | "PAUSED"
    }
  | {
      kind: "positive_keyword_create"
      adGroupResourceName: string
      matchType: "EXACT" | "PHRASE"
      status: "ENABLED" | "PAUSED"
      text: string
    }

export type AdsProposalStatus =
  | "draft"
  | "validated"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "applying"
  | "applied"
  | "verified"
  | "aborted"
  | "failed"
  | "rolled_back"
  | "expired"

export interface AdsProposalPresentation {
  boundedImpact: string
  campaign: string
  currentValue: string
  reason: string
  requestedValue: string
  service: AdsService
}

export interface AdsProposalRollbackPlan {
  value: string
}

export interface AdsProposalValidationReceipt {
  baselineHash: string
  errorCode?: string | null
  googleOperationsHash?: string | null
  ok: boolean
  operationHash: string
  proposalKey: string
  requestId: string | null
  validatedAt: string
}

export interface AdsProposalApplyReceipt {
  appliedAt: string
  errorCode: string | null
  googleOperationsHash: string
  outcome: "applied" | "aborted" | "ambiguous" | "failed"
  proposalKey: string
  requestId: string | null
}

export interface AdsProposalVerificationReceipt {
  outcome: "verified" | "mismatch" | "not_applied"
  proposalKey: string
  resourceHashes: Record<string, string>
  verifiedAt: string
}

export interface AdsChangeProposal {
  approvalActorHash: string | null
  approvalChannel: "telegram" | "codex" | null
  approvalReference: string | null
  approvedAt: string | null
  applyReceipt: AdsProposalApplyReceipt | null
  baselineHash: string
  expiresAt: string
  id: string
  mutationFamily: AdsMutationFamily
  operations: AdsMutationOperation[]
  operationHash: string
  proposalKey: string
  rationale: AdsProposalPresentation
  rejectedAt: string | null
  rollbackPlan: AdsProposalRollbackPlan
  runId: string | null
  status: AdsProposalStatus
  telegramCallbackQueryHash: string | null
  telegramMessageId: number | null
  telegramUpdateId: number | null
  validationReceipt: AdsProposalValidationReceipt | null
  verificationReceipt: AdsProposalVerificationReceipt | null
}

type UnknownRecord = Record<string, unknown>

const STATUS_VALUES = ["ENABLED", "PAUSED"] as const
const AD_STATUS_VALUES = ["ENABLED", "PAUSED", "REMOVED"] as const
const CRITERION_STATUS_VALUES = ["ENABLED", "PAUSED", "REMOVED"] as const
const MINUTE_VALUES = ["ZERO", "FIFTEEN", "THIRTY", "FORTY_FIVE"] as const
const DAY_VALUES = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const
const STRATEGY_VALUES = [
  "MANUAL_CPC",
  "MAXIMIZE_CONVERSIONS",
  "MAXIMIZE_CONVERSION_VALUE",
] as const
const SERVICE_VALUES = [
  "med_certs",
  "scripts",
  "ed",
  "hair_loss",
  "womens_health",
  "account",
] as const
const CAMPAIGN_CREATE_SERVICE_VALUES = [
  "ed",
  "hair_loss",
  "womens_health",
] as const
const CAMPAIGN_CREATE_EXEMPTIBLE_POLICIES = [
  "BIRTH_CONTROL",
  "HEALTH_IN_PERSONALIZED_ADS",
  "PRESCRIPTION_DRUG_SALE",
] as const
const PAID_DESTINATION_PATHS = new Set([
  "/erectile-dysfunction",
  "/hair-loss",
  "/medical-certificate",
  "/prescriptions",
  "/womens-health",
])
const RATING_OR_TESTIMONIAL_PATTERN =
  /\b(?:rated|rating|ratings|stars?|testimonials?|patient reviews?|customer reviews?|patients? say)\b/i
const PROHIBITED_PAID_COPY_PATTERN =
  /\b(?:guaranteed|instant approval|approved instantly|no call needed|accepted everywhere|100% approval)\b/i

const transitions: Record<AdsProposalStatus, readonly AdsProposalStatus[]> = {
  aborted: [],
  applied: ["verified", "failed", "rolled_back"],
  applying: ["applied", "aborted", "failed"],
  approved: ["applying", "aborted", "expired"],
  awaiting_approval: ["approved", "rejected", "expired"],
  draft: ["validated", "failed", "expired"],
  expired: [],
  failed: [],
  rejected: [],
  rolled_back: [],
  validated: [
    "awaiting_approval",
    "approved",
    "rejected",
    "failed",
    "expired",
  ],
  verified: ["rolled_back"],
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function assertExactKeys(
  record: UnknownRecord,
  expected: readonly string[],
  kind: string,
): void {
  const allowed = new Set(expected)
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new Error(`Unexpected ${kind} field: ${key}`)
    }
  }
  if (expected.some((key) => !(key in record))) {
    throw new Error(`Missing ${kind} field`)
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid ${field}`)
  }
  return value.trim()
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`Invalid ${field}`)
  }
  return value as number
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`Invalid ${field}`)
  }
  return value as T[number]
}

function resourceName(
  value: unknown,
  collection: string,
  field = "resourceName",
): string {
  const normalized = requiredString(value, field)
  const pattern = new RegExp(
    `^customers/\\d+/${collection}/[A-Za-z0-9_~.-]+$`,
  )
  if (!pattern.test(normalized)) throw new Error(`Invalid ${field}`)
  return normalized
}

function normalizePaidDestination(value: unknown): string {
  const raw = requiredString(value, "paid destination")
  let destination: URL
  try {
    destination = new URL(raw)
  } catch {
    throw new Error("Invalid paid destination")
  }
  if (
    destination.protocol !== "https:"
    || destination.hostname !== "instantmed.com.au"
    || destination.port
    || destination.username
    || destination.password
    || destination.search
    || destination.hash
    || !PAID_DESTINATION_PATHS.has(destination.pathname)
    || containsProhibitedPaidMedicineTerm(destination.pathname)
  ) {
    throw new Error("Invalid paid destination")
  }
  return destination.toString().replace(/\/$/, "")
}

function normalizeDisplayPath(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`Invalid ${field}`)
  const path = value.trim()
  if (path.length > 15 || !/^[A-Za-z0-9-]*$/.test(path)) {
    throw new Error(`Invalid ${field}`)
  }
  return path
}

function boundedText(
  value: unknown,
  field: string,
  maximumLength: number,
): string {
  const normalized = requiredString(value, field)
  if (normalized.length > maximumLength) {
    throw new Error(`${field} is too long`)
  }
  return normalized
}

function normalizeConstantResourceName(args: {
  collection: "geoTargetConstants" | "languageConstants"
  field: string
  value: unknown
}): string {
  const normalized = requiredString(args.value, args.field)
  if (!new RegExp(`^${args.collection}/\\d+$`).test(normalized)) {
    throw new Error(`Invalid ${args.field}`)
  }
  return normalized
}

function assertPaidAdCopy(value: string): void {
  if (containsProhibitedPaidMedicineTerm(value)) {
    throw new Error("Medicine terms are prohibited in paid ad copy")
  }
  if (RATING_OR_TESTIMONIAL_PATTERN.test(value)) {
    throw new Error("Paid ad copy cannot use ratings or testimonials")
  }
  if (PROHIBITED_PAID_COPY_PATTERN.test(value)) {
    throw new Error("Paid ad copy contains a prohibited claim")
  }
  if (containsBannedPhrase(value) || containsEmDash(value)) {
    throw new Error("Paid ad copy violates the InstantMed voice contract")
  }
}

function normalizeUniqueAdText(args: {
  field: "description" | "headline"
  maximum: number
  maximumLength: number
  minimum: number
  value: unknown
}): string[] {
  if (
    !Array.isArray(args.value)
    || args.value.length < args.minimum
    || args.value.length > args.maximum
  ) {
    if (args.field === "headline") {
      throw new Error("Responsive search ads require 3 to 15 headlines")
    }
    throw new Error("Responsive search ads require 2 to 4 descriptions")
  }
  const normalized = args.value.map((entry) => {
    const text = requiredString(
      entry,
      `responsive search ad ${args.field}`,
    )
    if (text.length > args.maximumLength) {
      throw new Error(`Responsive search ad ${args.field} is too long`)
    }
    assertPaidAdCopy(text)
    return text
  })
  if (new Set(normalized.map((entry) => entry.toLowerCase())).size
    !== normalized.length) {
    throw new Error(
      `Responsive search ad ${args.field}s must be unique`,
    )
  }
  return normalized
}

function normalizeBiddingConfig(value: unknown): BiddingConfig {
  const record = asRecord(value)
  if (!record) throw new Error("Invalid bidding config")
  const keys = ["strategy"]
  if ("targetCpaMicros" in record) keys.push("targetCpaMicros")
  if ("targetRoas" in record) keys.push("targetRoas")
  assertExactKeys(record, keys, "bidding config")

  const strategy = enumValue(
    record.strategy,
    STRATEGY_VALUES,
    "bidding strategy",
  )
  const targetCpaMicros = "targetCpaMicros" in record
    ? nonNegativeInteger(record.targetCpaMicros, "targetCpaMicros")
    : undefined
  const targetRoas = "targetRoas" in record
    ? Number(record.targetRoas)
    : undefined
  if (
    targetRoas !== undefined
    && (!Number.isFinite(targetRoas) || targetRoas <= 0)
  ) {
    throw new Error("Invalid targetRoas")
  }
  if (
    strategy === "MANUAL_CPC"
    && (targetCpaMicros !== undefined || targetRoas !== undefined)
  ) {
    throw new Error("Manual CPC cannot carry an automated target")
  }
  if (strategy === "MAXIMIZE_CONVERSIONS" && targetRoas !== undefined) {
    throw new Error("Maximize conversions cannot carry targetRoas")
  }
  if (
    strategy === "MAXIMIZE_CONVERSION_VALUE"
    && targetCpaMicros !== undefined
  ) {
    throw new Error("Maximize conversion value cannot carry targetCpaMicros")
  }

  return {
    strategy,
    ...(targetCpaMicros !== undefined ? { targetCpaMicros } : {}),
    ...(targetRoas !== undefined ? { targetRoas } : {}),
  }
}

function normalizeSchedule(value: unknown): AdSchedule[] {
  if (!Array.isArray(value) || value.length > 49) {
    throw new Error("Invalid ad schedule")
  }
  return value.map((entry) => {
    const record = asRecord(entry)
    if (!record) throw new Error("Invalid ad schedule entry")
    assertExactKeys(record, [
      "dayOfWeek",
      "endHour",
      "endMinute",
      "startHour",
      "startMinute",
    ], "ad schedule")
    const startHour = nonNegativeInteger(record.startHour, "startHour")
    const endHour = nonNegativeInteger(record.endHour, "endHour")
    const endMinute = enumValue(record.endMinute, MINUTE_VALUES, "endMinute")
    if (
      startHour > 23
      || endHour > 24
      || endHour < startHour
      || endHour === 24 && endMinute !== "ZERO"
    ) {
      throw new Error("Invalid ad schedule hour")
    }
    return {
      dayOfWeek: enumValue(record.dayOfWeek, DAY_VALUES, "dayOfWeek"),
      endHour,
      endMinute,
      startHour,
      startMinute: enumValue(
        record.startMinute,
        MINUTE_VALUES,
        "startMinute",
      ),
    }
  })
}

function normalizeOperation(value: unknown): AdsMutationOperation {
  const record = asRecord(value)
  if (!record || typeof record.kind !== "string") {
    throw new Error("Unsupported Google Ads mutation operation")
  }

  if (record.kind === "campaign_create") {
    assertExactKeys(record, [
      "kind",
      "adGroups",
      "campaignName",
      "cpcBidMicros",
      "dailyBudgetMicros",
      "finalUrl",
      "languageResourceName",
      "locationResourceName",
      "service",
      "status",
    ], "campaign_create")
    if (
      !Array.isArray(record.adGroups)
      || record.adGroups.length < 1
      || record.adGroups.length > 5
    ) {
      throw new Error("Campaign creation requires 1 to 5 ad groups")
    }
    const keywordTargets = new Set<string>()
    const adGroups = record.adGroups.map((value) => {
      const adGroup = asRecord(value)
      if (!adGroup) throw new Error("Invalid campaign ad group")
      assertExactKeys(adGroup, [
        "keywords",
        "name",
        "responsiveSearchAd",
      ], "campaign ad group")
      if (
        !Array.isArray(adGroup.keywords)
        || adGroup.keywords.length < 1
        || adGroup.keywords.length > 20
      ) {
        throw new Error("Campaign ad groups require 1 to 20 keywords")
      }
      const keywords = adGroup.keywords.map((value) => {
        const keyword = asRecord(value)
        if (!keyword) throw new Error("Invalid campaign keyword")
        assertExactKeys(keyword, [
          "exemptPolicyViolationKeys",
          "matchType",
          "text",
        ], "campaign keyword")
        const text = boundedText(keyword.text, "campaign keyword", 80)
        if (text.split(/\s+/).length > 10) {
          throw new Error("Positive keyword has too many words")
        }
        if (containsProhibitedPaidMedicineTerm(text)) {
          throw new Error("Medicine-name keywords are prohibited")
        }
        const matchType = enumValue(
          keyword.matchType,
          ["EXACT", "PHRASE"] as const,
          "matchType",
        )
        if (
          !Array.isArray(keyword.exemptPolicyViolationKeys)
          || keyword.exemptPolicyViolationKeys.length > 3
        ) {
          throw new Error("Invalid exemptPolicyViolationKeys")
        }
        const exemptPolicyViolationKeys = keyword.exemptPolicyViolationKeys
          .map((value) => {
            const exemption = asRecord(value)
            if (!exemption) throw new Error("Invalid policy exemption")
            assertExactKeys(
              exemption,
              ["policyName", "violatingText"],
              "policy exemption",
            )
            const policyName = enumValue(
              exemption.policyName,
              CAMPAIGN_CREATE_EXEMPTIBLE_POLICIES,
              "policyName",
            )
            const violatingText = boundedText(
              exemption.violatingText,
              "violatingText",
              80,
            )
            if (violatingText !== text) {
              throw new Error(
                "Policy exemption violatingText must match the keyword",
              )
            }
            return { policyName, violatingText }
          })
        if (
          new Set(exemptPolicyViolationKeys.map(({ policyName }) => policyName))
            .size !== exemptPolicyViolationKeys.length
        ) {
          throw new Error("Campaign keyword policy exemptions must be unique")
        }
        const target = text.toLowerCase()
        if (keywordTargets.has(target)) {
          throw new Error("Campaign positive keywords must be unique")
        }
        keywordTargets.add(target)
        return { exemptPolicyViolationKeys, matchType, text }
      })
      const rsa = asRecord(adGroup.responsiveSearchAd)
      if (!rsa) throw new Error("Invalid campaign responsive search ad")
      assertExactKeys(rsa, [
        "descriptions",
        "headlines",
        "path1",
        "path2",
      ], "campaign responsive search ad")
      return {
        keywords,
        name: boundedText(adGroup.name, "campaign ad group name", 255),
        responsiveSearchAd: {
          descriptions: normalizeUniqueAdText({
            field: "description",
            maximum: 4,
            maximumLength: 90,
            minimum: 2,
            value: rsa.descriptions,
          }),
          headlines: normalizeUniqueAdText({
            field: "headline",
            maximum: 15,
            maximumLength: 30,
            minimum: 3,
            value: rsa.headlines,
          }),
          path1: normalizeDisplayPath(rsa.path1, "path1"),
          path2: normalizeDisplayPath(rsa.path2, "path2"),
        },
      }
    })
    if (
      new Set(adGroups.map(({ name }) => name.toLowerCase())).size
      !== adGroups.length
    ) {
      throw new Error("Campaign ad group names must be unique")
    }
    const cpcBidMicros = nonNegativeInteger(
      record.cpcBidMicros,
      "cpcBidMicros",
    )
    const dailyBudgetMicros = nonNegativeInteger(
      record.dailyBudgetMicros,
      "dailyBudgetMicros",
    )
    if (cpcBidMicros === 0 || dailyBudgetMicros === 0) {
      throw new Error("Campaign budget and CPC bid must be positive")
    }
    return {
      adGroups,
      campaignName: boundedText(record.campaignName, "campaign name", 128),
      cpcBidMicros,
      dailyBudgetMicros,
      finalUrl: normalizePaidDestination(record.finalUrl),
      kind: "campaign_create",
      languageResourceName: normalizeConstantResourceName({
        collection: "languageConstants",
        field: "languageResourceName",
        value: record.languageResourceName,
      }),
      locationResourceName: normalizeConstantResourceName({
        collection: "geoTargetConstants",
        field: "locationResourceName",
        value: record.locationResourceName,
      }),
      service: enumValue(
        record.service,
        CAMPAIGN_CREATE_SERVICE_VALUES,
        "campaign service",
      ),
      status: enumValue(record.status, ["ENABLED"] as const, "status"),
    }
  }

  if (record.kind === "campaign_status") {
    assertExactKeys(
      record,
      ["kind", "resourceName", "expected", "next"],
      "campaign_status",
    )
    const expected = enumValue(record.expected, STATUS_VALUES, "expected")
    const next = enumValue(record.next, STATUS_VALUES, "next")
    if (expected === next) throw new Error("Campaign status must change")
    return {
      expected,
      kind: "campaign_status",
      next,
      resourceName: resourceName(record.resourceName, "campaigns"),
    }
  }
  if (record.kind === "campaign_budget") {
    assertExactKeys(
      record,
      ["kind", "resourceName", "expectedMicros", "nextMicros"],
      "campaign_budget",
    )
    const expectedMicros = nonNegativeInteger(
      record.expectedMicros,
      "expectedMicros",
    )
    const nextMicros = nonNegativeInteger(record.nextMicros, "nextMicros")
    if (expectedMicros === nextMicros) {
      throw new Error("Campaign budget must change")
    }
    return {
      expectedMicros,
      kind: "campaign_budget",
      nextMicros,
      resourceName: resourceName(record.resourceName, "campaignBudgets"),
    }
  }
  if (record.kind === "campaign_bidding") {
    assertExactKeys(
      record,
      ["kind", "resourceName", "expected", "next"],
      "campaign_bidding",
    )
    const expected = normalizeBiddingConfig(record.expected)
    const next = normalizeBiddingConfig(record.next)
    if (JSON.stringify(expected) === JSON.stringify(next)) {
      throw new Error("Campaign bidding must change")
    }
    return {
      expected,
      kind: "campaign_bidding",
      next,
      resourceName: resourceName(record.resourceName, "campaigns"),
    }
  }
  if (record.kind === "ad_group_cpc_bid") {
    assertExactKeys(
      record,
      ["kind", "resourceName", "expectedMicros", "nextMicros"],
      "ad_group_cpc_bid",
    )
    const expectedMicros = nonNegativeInteger(
      record.expectedMicros,
      "expectedMicros",
    )
    const nextMicros = nonNegativeInteger(record.nextMicros, "nextMicros")
    if (expectedMicros === nextMicros) throw new Error("CPC bid must change")
    return {
      expectedMicros,
      kind: "ad_group_cpc_bid",
      nextMicros,
      resourceName: resourceName(record.resourceName, "adGroups"),
    }
  }
  if (record.kind === "ad_status") {
    assertExactKeys(
      record,
      ["kind", "resourceName", "expected", "next"],
      "ad_status",
    )
    const expected = enumValue(record.expected, AD_STATUS_VALUES, "expected")
    const next = enumValue(record.next, AD_STATUS_VALUES, "next")
    if (expected === next) throw new Error("Ad status must change")
    return {
      expected,
      kind: "ad_status",
      next,
      resourceName: resourceName(record.resourceName, "adGroupAds"),
    }
  }
  if (record.kind === "keyword_status") {
    assertExactKeys(
      record,
      ["kind", "resourceName", "expected", "next"],
      "keyword_status",
    )
    const expected = enumValue(
      record.expected,
      CRITERION_STATUS_VALUES,
      "expected",
    )
    const next = enumValue(record.next, CRITERION_STATUS_VALUES, "next")
    if (expected === next) throw new Error("Keyword status must change")
    const criterionResourceName = requiredString(
      record.resourceName,
      "resourceName",
    )
    if (
      !/^customers\/\d+\/(?:adGroupCriteria|campaignCriteria)\/[A-Za-z0-9_~.-]+$/
        .test(criterionResourceName)
    ) {
      throw new Error("Invalid resourceName")
    }
    return {
      expected,
      kind: "keyword_status",
      next,
      resourceName: criterionResourceName,
    }
  }
  if (record.kind === "negative_keyword") {
    assertExactKeys(
      record,
      ["kind", "campaignResourceName", "matchType", "text"],
      "negative_keyword",
    )
    const text = requiredString(record.text, "negative keyword")
    if (text.length > 80) throw new Error("Negative keyword is too long")
    return {
      campaignResourceName: resourceName(
        record.campaignResourceName,
        "campaigns",
        "campaignResourceName",
      ),
      kind: "negative_keyword",
      matchType: enumValue(
        record.matchType,
        ["EXACT", "PHRASE"] as const,
        "matchType",
      ),
      text,
    }
  }
  if (record.kind === "shared_negative_list") {
    assertExactKeys(
      record,
      ["kind", "campaignResourceName", "keywords", "sharedSetResourceName"],
      "shared_negative_list",
    )
    if (!Array.isArray(record.keywords) || record.keywords.length > 30) {
      throw new Error("Shared negative list accepts at most 30 keywords")
    }
    const keywords = record.keywords.map((value) => {
      const keyword = asRecord(value)
      if (!keyword) throw new Error("Invalid shared negative keyword")
      assertExactKeys(
        keyword,
        ["matchType", "text"],
        "shared negative keyword",
      )
      const text = requiredString(keyword.text, "shared negative keyword")
      if (text.length > 80) throw new Error("Shared negative keyword is too long")
      return {
        matchType: enumValue(
          keyword.matchType,
          ["BROAD"] as const,
          "matchType",
        ),
        text,
      }
    })
    if (
      new Set(keywords.map(({ text }) => text.toLowerCase())).size
        !== keywords.length
    ) {
      throw new Error("Shared negative keywords must be unique")
    }
    return {
      campaignResourceName: resourceName(
        record.campaignResourceName,
        "campaigns",
        "campaignResourceName",
      ),
      kind: "shared_negative_list",
      keywords,
      sharedSetResourceName: resourceName(
        record.sharedSetResourceName,
        "sharedSets",
        "sharedSetResourceName",
      ),
    }
  }
  if (record.kind === "asset_link_status") {
    assertExactKeys(
      record,
      ["kind", "resourceName", "expected", "next"],
      "asset_link_status",
    )
    const expected = enumValue(
      record.expected,
      CRITERION_STATUS_VALUES,
      "expected",
    )
    const next = enumValue(record.next, CRITERION_STATUS_VALUES, "next")
    if (expected === next) throw new Error("Asset link status must change")
    return {
      expected,
      kind: "asset_link_status",
      next,
      resourceName: resourceName(record.resourceName, "campaignAssets"),
    }
  }
  if (record.kind === "schedule_replace") {
    assertExactKeys(
      record,
      ["kind", "campaignResourceName", "expected", "next"],
      "schedule_replace",
    )
    const expected = normalizeSchedule(record.expected)
    const next = normalizeSchedule(record.next)
    if (JSON.stringify(expected) === JSON.stringify(next)) {
      throw new Error("Ad schedule must change")
    }
    return {
      campaignResourceName: resourceName(
        record.campaignResourceName,
        "campaigns",
        "campaignResourceName",
      ),
      expected,
      kind: "schedule_replace",
      next,
    }
  }
  if (record.kind === "responsive_search_ad_create") {
    assertExactKeys(
      record,
      [
        "kind",
        "adGroupResourceName",
        "descriptions",
        "finalUrl",
        "headlines",
        "path1",
        "path2",
        "status",
      ],
      "responsive_search_ad_create",
    )
    return {
      adGroupResourceName: resourceName(
        record.adGroupResourceName,
        "adGroups",
        "adGroupResourceName",
      ),
      descriptions: normalizeUniqueAdText({
        field: "description",
        maximum: 4,
        maximumLength: 90,
        minimum: 2,
        value: record.descriptions,
      }),
      finalUrl: normalizePaidDestination(record.finalUrl),
      headlines: normalizeUniqueAdText({
        field: "headline",
        maximum: 15,
        maximumLength: 30,
        minimum: 3,
        value: record.headlines,
      }),
      kind: "responsive_search_ad_create",
      path1: normalizeDisplayPath(record.path1, "path1"),
      path2: normalizeDisplayPath(record.path2, "path2"),
      status: enumValue(record.status, STATUS_VALUES, "status"),
    }
  }
  if (record.kind === "positive_keyword_create") {
    assertExactKeys(
      record,
      [
        "kind",
        "adGroupResourceName",
        "matchType",
        "status",
        "text",
      ],
      "positive_keyword_create",
    )
    const text = requiredString(record.text, "positive keyword")
    if (text.length > 80) throw new Error("Positive keyword is too long")
    if (text.split(/\s+/).length > 10) {
      throw new Error("Positive keyword has too many words")
    }
    if (containsProhibitedPaidMedicineTerm(text)) {
      throw new Error("Medicine-name keywords are prohibited")
    }
    return {
      adGroupResourceName: resourceName(
        record.adGroupResourceName,
        "adGroups",
        "adGroupResourceName",
      ),
      kind: "positive_keyword_create",
      matchType: enumValue(
        record.matchType,
        ["EXACT", "PHRASE"] as const,
        "matchType",
      ),
      status: enumValue(record.status, STATUS_VALUES, "status"),
      text,
    }
  }

  throw new Error("Unsupported Google Ads mutation operation")
}

export function normalizeAdsMutationOperations(
  value: unknown,
): AdsMutationOperation[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw new Error("Google Ads proposal operations must be a bounded array")
  }
  const operations = value.map(normalizeOperation)
  if (
    operations.some((operation) => operation.kind === "campaign_create")
    && operations.length !== 1
  ) {
    throw new Error(
      "Google Ads proposals require exactly one campaign_create operation",
    )
  }
  return operations
}

export function hashAdsMutationOperations(value: unknown): string {
  const normalized = normalizeAdsMutationOperations(value)
  return createHash("sha256")
    .update(JSON.stringify(normalized), "utf8")
    .digest("hex")
}

export function canTransitionAdsProposal(
  from: AdsProposalStatus,
  to: AdsProposalStatus,
): boolean {
  return transitions[from].includes(to)
}

export function isAdsProposalExpired(
  proposal: Pick<AdsChangeProposal, "expiresAt">,
  now = new Date(),
): boolean {
  const expiresAt = Date.parse(proposal.expiresAt)
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime()
}

export function assertAdsProposalOperationsUnchanged(
  proposal: Pick<
    AdsChangeProposal,
    "operationHash" | "operations" | "validationReceipt"
  >,
): void {
  let currentHash: string
  try {
    currentHash = hashAdsMutationOperations(proposal.operations)
  } catch {
    throw new Error("proposal_operations_changed")
  }
  const validatedHash = proposal.validationReceipt?.operationHash
  if (
    currentHash !== proposal.operationHash
    || !validatedHash
    || currentHash !== validatedHash
  ) {
    throw new Error("proposal_operations_changed")
  }
}

export function getAdsProposalApplyEligibility(args: {
  decisionReceiptVerified: boolean
  liveBaselineHash: string
  now?: Date
  proposal: AdsChangeProposal
}):
  | { eligible: true }
  | {
      eligible: false
      reason:
        | "baseline_drift"
        | "decision_receipt_unverified"
        | "proposal_expired"
        | "proposal_operations_changed"
        | "proposal_status_invalid"
        | "validation_invalid"
    } {
  if (args.proposal.status !== "approved") {
    return { eligible: false, reason: "proposal_status_invalid" }
  }
  if (!args.decisionReceiptVerified) {
    return { eligible: false, reason: "decision_receipt_unverified" }
  }
  if (
    !args.proposal.validationReceipt?.ok
    || args.proposal.validationReceipt.baselineHash
      !== args.proposal.baselineHash
  ) {
    return { eligible: false, reason: "validation_invalid" }
  }
  try {
    assertAdsProposalOperationsUnchanged(args.proposal)
  } catch {
    return { eligible: false, reason: "proposal_operations_changed" }
  }
  if (isAdsProposalExpired(args.proposal, args.now)) {
    return { eligible: false, reason: "proposal_expired" }
  }
  if (args.liveBaselineHash !== args.proposal.baselineHash) {
    return { eligible: false, reason: "baseline_drift" }
  }
  return { eligible: true }
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function asPresentation(value: unknown): AdsProposalPresentation {
  const record = asRecord(value)
  if (!record) throw new Error("Invalid proposal rationale")
  return {
    boundedImpact: requiredString(record.boundedImpact, "boundedImpact"),
    campaign: requiredString(record.campaign, "campaign"),
    currentValue: requiredString(record.currentValue, "currentValue"),
    reason: requiredString(record.reason, "reason"),
    requestedValue: requiredString(
      record.requestedValue,
      "requestedValue",
    ),
    service: enumValue(record.service, SERVICE_VALUES, "service"),
  }
}

function asValidationReceipt(
  value: unknown,
): AdsProposalValidationReceipt | null {
  if (value == null) return null
  const record = asRecord(value)
  if (!record) throw new Error("Invalid proposal validation receipt")
  return {
    baselineHash: requiredString(record.baselineHash, "baselineHash"),
    errorCode: asNullableString(record.errorCode),
    googleOperationsHash: asNullableString(record.googleOperationsHash),
    ok: record.ok === true,
    operationHash: requiredString(record.operationHash, "operationHash"),
    proposalKey: requiredString(record.proposalKey, "proposalKey"),
    requestId: asNullableString(record.requestId),
    validatedAt: requiredString(record.validatedAt, "validatedAt"),
  }
}

function asApplyReceipt(value: unknown): AdsProposalApplyReceipt | null {
  if (value == null) return null
  const record = asRecord(value)
  if (!record) throw new Error("Invalid proposal apply receipt")
  const outcome = enumValue(
    record.outcome,
    ["applied", "aborted", "ambiguous", "failed"] as const,
    "apply outcome",
  )
  return {
    appliedAt: requiredString(record.appliedAt, "appliedAt"),
    errorCode: asNullableString(record.errorCode),
    googleOperationsHash: requiredString(
      record.googleOperationsHash,
      "googleOperationsHash",
    ),
    outcome,
    proposalKey: requiredString(record.proposalKey, "proposalKey"),
    requestId: asNullableString(record.requestId),
  }
}

function asVerificationReceipt(
  value: unknown,
): AdsProposalVerificationReceipt | null {
  if (value == null) return null
  const record = asRecord(value)
  if (!record) throw new Error("Invalid proposal verification receipt")
  const resourceHashes = asRecord(record.resourceHashes)
  if (!resourceHashes) {
    throw new Error("Invalid proposal verification resource hashes")
  }
  return {
    outcome: enumValue(
      record.outcome,
      ["verified", "mismatch", "not_applied"] as const,
      "verification outcome",
    ),
    proposalKey: requiredString(record.proposalKey, "proposalKey"),
    resourceHashes: Object.fromEntries(
      Object.entries(resourceHashes).map(([key, hash]) => [
        key,
        requiredString(hash, "resource hash"),
      ]),
    ),
    verifiedAt: requiredString(record.verifiedAt, "verifiedAt"),
  }
}

function proposalFromRow(row: UnknownRecord): AdsChangeProposal {
  const operations = normalizeAdsMutationOperations(row.operations)
  const rationale = asPresentation(row.rationale)
  const rollback = asRecord(row.rollback_plan)
  const operationHash = hashAdsMutationOperations(operations)
  return {
    approvalActorHash: asNullableString(row.approval_actor_hash),
    approvalChannel:
      row.approval_channel === "telegram" || row.approval_channel === "codex"
        ? row.approval_channel
        : null,
    approvalReference: asNullableString(row.approval_reference),
    approvedAt: asNullableString(row.approved_at),
    applyReceipt: asApplyReceipt(row.apply_receipt),
    baselineHash: requiredString(row.baseline_hash, "baseline_hash"),
    expiresAt: requiredString(row.expires_at, "expires_at"),
    id: requiredString(row.id, "id"),
    mutationFamily: requiredString(
      row.mutation_family,
      "mutation_family",
    ) as AdsMutationFamily,
    operationHash,
    operations,
    proposalKey: requiredString(row.proposal_key, "proposal_key"),
    rationale,
    rejectedAt: asNullableString(row.rejected_at),
    rollbackPlan: {
      value: requiredString(rollback?.value, "rollback value"),
    },
    runId: asNullableString(row.run_id),
    status: requiredString(row.status, "status") as AdsProposalStatus,
    telegramCallbackQueryHash: asNullableString(
      row.telegram_callback_query_hash,
    ),
    telegramMessageId:
      typeof row.telegram_message_id === "number"
        ? row.telegram_message_id
        : null,
    telegramUpdateId:
      typeof row.telegram_update_id === "number"
        ? row.telegram_update_id
        : null,
    validationReceipt: asValidationReceipt(row.validation_receipt),
    verificationReceipt: asVerificationReceipt(row.verification_receipt),
  }
}

const PROPOSAL_SELECT = [
  "id",
  "proposal_key",
  "status",
  "mutation_family",
  "operations",
  "rationale",
  "baseline_hash",
  "rollback_plan",
  "expires_at",
  "run_id",
  "approval_reference",
  "approval_channel",
  "approval_actor_hash",
  "approved_at",
  "rejected_at",
  "telegram_message_id",
  "telegram_update_id",
  "telegram_callback_query_hash",
  "validation_receipt",
  "apply_receipt",
  "verification_receipt",
].join(", ")

function sydneyProposalDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Australia/Sydney",
    year: "numeric",
  }).formatToParts(now)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  return `${values.year}${values.month}${values.day}`
}

function operationFamily(operation: AdsMutationOperation): AdsMutationFamily {
  return operation.kind
}

export async function createAdsProposalDraft(args: {
  baselineHash: string
  expiresAt?: Date
  mutationFamily: AdsMutationFamily
  now?: Date
  operations: AdsMutationOperation[]
  rationale: AdsProposalPresentation
  rollbackPlan: AdsProposalRollbackPlan
  runId?: string | null
  supabase: SupabaseClient
}): Promise<AdsChangeProposal> {
  const now = args.now ?? new Date()
  if (!/^[a-f0-9]{64}$/.test(args.baselineHash)) {
    throw new Error("invalid_proposal_baseline_hash")
  }
  if ([
    args.rationale.boundedImpact,
    args.rationale.campaign,
    args.rationale.currentValue,
    args.rationale.reason,
    args.rationale.requestedValue,
    args.rollbackPlan.value,
  ].some(containsProhibitedPaidMedicineTerm)) {
    throw new Error("proposal_contains_prohibited_medicine_term")
  }
  const expiresAt = args.expiresAt
    ?? new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const lifetimeMs = expiresAt.getTime() - now.getTime()
  if (
    !Number.isFinite(lifetimeMs)
    || lifetimeMs <= 0
    || lifetimeMs > 24 * 60 * 60 * 1000
  ) {
    throw new Error("invalid_proposal_expiry")
  }
  const operations = normalizeAdsMutationOperations(args.operations)
  if (
    operations.some(
      (operation) => operationFamily(operation) !== args.mutationFamily,
    )
  ) {
    throw new Error("proposal_mutation_family_mismatch")
  }

  const datePrefix = `ADS-${sydneyProposalDate(now)}-`
  const latest = await args.supabase
    .from("google_ads_change_proposals")
    .select("proposal_key")
    .like("proposal_key", `${datePrefix}%`)
    .order("proposal_key", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latest.error) {
    throw new Error(
      `google_ads_proposal_sequence_failed:${latest.error.code || "unknown"}`,
    )
  }
  const latestKey = typeof latest.data?.proposal_key === "string"
    ? latest.data.proposal_key
    : null
  const latestSequence = latestKey
    ? Number(latestKey.slice(datePrefix.length))
    : 0
  const proposalKey = `${datePrefix}${String(latestSequence + 1).padStart(2, "0")}`
  if (!/^ADS-\d{8}-\d{2}$/.test(proposalKey)) {
    throw new Error("proposal_sequence_exhausted")
  }

  const inserted = await args.supabase
    .from("google_ads_change_proposals")
    .insert({
      baseline_hash: args.baselineHash,
      expires_at: expiresAt.toISOString(),
      mutation_family: args.mutationFamily,
      operations,
      proposal_key: proposalKey,
      rationale: args.rationale,
      rollback_plan: args.rollbackPlan,
      run_id: args.runId ?? null,
      status: "draft",
      updated_at: now.toISOString(),
    })
    .select(PROPOSAL_SELECT)
    .single()
  if (inserted.error || !inserted.data) {
    throw new Error(
      `google_ads_proposal_insert_failed:${inserted.error?.code || "unknown"}`,
    )
  }
  return proposalFromRow(inserted.data as unknown as UnknownRecord)
}

export async function getAdsProposalByKey(
  supabase: SupabaseClient,
  proposalKey: string,
): Promise<AdsChangeProposal | null> {
  const result = await supabase
    .from("google_ads_change_proposals")
    .select(PROPOSAL_SELECT)
    .eq("proposal_key", proposalKey)
    .maybeSingle()
  if (result.error) {
    throw new Error(
      `google_ads_proposal_read_failed:${result.error.code || "unknown"}`,
    )
  }
  return result.data
    ? proposalFromRow(result.data as unknown as UnknownRecord)
    : null
}

export async function recordAdsProposalValidation(args: {
  now?: Date
  proposal: AdsChangeProposal
  receipt: AdsProposalValidationReceipt
  supabase: SupabaseClient
}): Promise<AdsChangeProposal> {
  if (args.proposal.status !== "draft") {
    throw new Error("proposal_not_draft")
  }
  if (isAdsProposalExpired(args.proposal, args.now)) {
    throw new Error("proposal_expired")
  }
  if (
    args.receipt.proposalKey !== args.proposal.proposalKey
    || args.receipt.baselineHash !== args.proposal.baselineHash
    || args.receipt.operationHash !== args.proposal.operationHash
  ) {
    throw new Error("proposal_validation_receipt_mismatch")
  }

  const result = await args.supabase
    .from("google_ads_change_proposals")
    .update({
      status: args.receipt.ok ? "validated" : "failed",
      updated_at: (args.now ?? new Date()).toISOString(),
      validation_receipt: args.receipt,
    })
    .eq("id", args.proposal.id)
    .eq("status", "draft")
    .select(PROPOSAL_SELECT)
    .maybeSingle()
  if (result.error || !result.data) {
    throw new Error(
      `google_ads_proposal_validation_receipt_failed:${result.error?.code || "cas_miss"}`,
    )
  }
  return proposalFromRow(result.data as unknown as UnknownRecord)
}

export async function compareAndSetTelegramProposalDecision(args: {
  actorHash: string
  callbackQueryHash: string
  decision: "approve" | "reject"
  expectedStatus: "awaiting_approval"
  proposalId: string
  supabase: SupabaseClient
  telegramMessageId: number
  updateId: number
}): Promise<{ consumed: boolean }> {
  const now = new Date().toISOString()
  const status = args.decision === "approve" ? "approved" : "rejected"
  const result = await args.supabase
    .from("google_ads_change_proposals")
    .update({
      approval_actor_hash: args.actorHash,
      approval_channel: "telegram",
      approval_reference: "telegram-button",
      approved_at: args.decision === "approve" ? now : null,
      rejected_at: args.decision === "reject" ? now : null,
      status,
      telegram_callback_query_hash: args.callbackQueryHash,
      telegram_update_id: args.updateId,
      updated_at: now,
    })
    .eq("id", args.proposalId)
    .eq("status", args.expectedStatus)
    .eq("telegram_message_id", args.telegramMessageId)
    .select("id")
    .maybeSingle()

  if (result.error?.code === "23505") return { consumed: false }
  if (result.error) {
    throw new Error(
      `google_ads_proposal_decision_failed:${result.error.code || "unknown"}`,
    )
  }
  return { consumed: result.data != null }
}

export async function markAdsProposalAwaitingTelegramApproval(args: {
  now?: Date
  proposal: AdsChangeProposal
  supabase: SupabaseClient
  telegramMessageId: number
}): Promise<void> {
  if (args.proposal.status !== "validated") {
    throw new Error("proposal_not_validated")
  }
  if (!args.proposal.validationReceipt?.ok) {
    throw new Error("proposal_validation_failed")
  }
  if (isAdsProposalExpired(args.proposal, args.now)) {
    throw new Error("proposal_expired")
  }
  assertAdsProposalOperationsUnchanged(args.proposal)

  const result = await args.supabase
    .from("google_ads_change_proposals")
    .update({
      status: "awaiting_approval",
      telegram_message_id: args.telegramMessageId,
      updated_at: (args.now ?? new Date()).toISOString(),
    })
    .eq("id", args.proposal.id)
    .eq("status", "validated")
    .select("id")
    .maybeSingle()
  if (result.error || !result.data) {
    throw new Error(
      `google_ads_proposal_awaiting_approval_failed:${result.error?.code || "cas_miss"}`,
    )
  }
}

export async function recordCodexProposalDecision(args: {
  decision: "approve" | "reject"
  now?: Date
  proposalKey: string
  reference: string
  supabase: SupabaseClient
}): Promise<{ consumed: boolean }> {
  if (!isCodexAdsApprovalReference(args.reference)) {
    throw new Error("invalid_codex_approval_reference")
  }
  const proposal = await getAdsProposalByKey(args.supabase, args.proposalKey)
  if (!proposal) throw new Error("proposal_not_found")
  const expectedStatus = getCodexDecisionExpectedStatus(proposal.status)
  if (!expectedStatus) {
    return { consumed: false }
  }
  if (!proposal.validationReceipt?.ok) {
    throw new Error("proposal_validation_failed")
  }
  if (isAdsProposalExpired(proposal, args.now)) {
    throw new Error("proposal_expired")
  }
  assertAdsProposalOperationsUnchanged(proposal)

  const now = (args.now ?? new Date()).toISOString()
  const status = args.decision === "approve" ? "approved" : "rejected"
  const actorHash = createHash("sha256")
    .update(args.reference, "utf8")
    .digest("hex")
  const result = await args.supabase
    .from("google_ads_change_proposals")
    .update({
      approval_actor_hash: actorHash,
      approval_channel: "codex",
      approval_reference: args.reference,
      approved_at: args.decision === "approve" ? now : null,
      rejected_at: args.decision === "reject" ? now : null,
      status,
      updated_at: now,
    })
    .eq("id", proposal.id)
    .eq("status", expectedStatus)
    .select("id")
    .maybeSingle()
  if (result.error) {
    throw new Error(
      `google_ads_codex_decision_failed:${result.error.code || "unknown"}`,
    )
  }
  return { consumed: result.data != null }
}

function getCodexDecisionExpectedStatus(
  status: AdsProposalStatus,
): "validated" | "awaiting_approval" | null {
  return status === "validated" || status === "awaiting_approval"
    ? status
    : null
}

export function isCodexAdsApprovalReference(value: string): boolean {
  return /^codex-task:[A-Za-z0-9_-]{4,128}$/.test(value)
}
