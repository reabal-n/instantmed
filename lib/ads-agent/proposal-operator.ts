import "server-only"

import { readFileSync, statSync } from "node:fs"

import { containsProhibitedPaidMedicineTerm } from "@/lib/ads-agent/policy"
import {
  type AdsMutationOperation,
  type AdsProposalPresentation,
  type AdsProposalRollbackPlan,
  normalizeAdsMutationOperations,
} from "@/lib/ads-agent/proposals"
import type {
  AdsMutationFamily,
  AdsService,
} from "@/lib/ads-agent/types"

const MAX_PACKET_BYTES = 64 * 1024
const PACKET_FIELDS = [
  "mutationFamily",
  "operations",
  "rationale",
  "rollbackPlan",
] as const

type ProposalPacketRecord = Record<string, unknown>

export interface AdsProposalDraftPacket {
  mutationFamily: AdsMutationFamily
  operations: AdsMutationOperation[]
  rationale: AdsProposalPresentation
  rollbackPlan: AdsProposalRollbackPlan
}

const MUTATION_FAMILIES = new Set<AdsMutationFamily>([
  "campaign_status",
  "campaign_budget",
  "campaign_bidding",
  "ad_group_cpc_bid",
  "ad_status",
  "keyword_status",
  "negative_keyword",
  "asset_link_status",
  "schedule_replace",
])
const SERVICES = new Set<AdsService>([
  "med_certs",
  "scripts",
  "ed",
  "hair_loss",
  "womens_health",
  "account",
])

function asRecord(value: unknown): ProposalPacketRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ProposalPacketRecord
    : null
}

function exactRecord(
  value: unknown,
  fields: readonly string[],
  label: string,
): ProposalPacketRecord {
  const record = asRecord(value)
  if (!record) throw new Error(`Invalid ${label}`)
  const allowed = new Set(fields)
  for (const field of Object.keys(record)) {
    if (!allowed.has(field)) throw new Error(`Unexpected ${label} field: ${field}`)
  }
  if (fields.some((field) => !(field in record))) {
    throw new Error(`Missing ${label} field`)
  }
  return record
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid ${field}`)
  }
  const normalized = value.trim()
  if (normalized.length > 500) throw new Error(`${field} is too long`)
  return normalized
}

function normalizeProposalPacket(value: unknown): AdsProposalDraftPacket {
  const packet = exactRecord(value, PACKET_FIELDS, "proposal packet")
  if (
    typeof packet.mutationFamily !== "string"
    || !MUTATION_FAMILIES.has(packet.mutationFamily as AdsMutationFamily)
  ) {
    throw new Error("Invalid proposal mutation family")
  }
  const mutationFamily = packet.mutationFamily as AdsMutationFamily
  const operations = normalizeAdsMutationOperations(packet.operations)
  if (operations.some((operation) => operation.kind !== mutationFamily)) {
    throw new Error("Proposal mutation family does not match its operations")
  }

  const rationale = exactRecord(packet.rationale, [
    "boundedImpact",
    "campaign",
    "currentValue",
    "reason",
    "requestedValue",
    "service",
  ], "proposal rationale")
  if (
    typeof rationale.service !== "string"
    || !SERVICES.has(rationale.service as AdsService)
  ) {
    throw new Error("Invalid proposal service")
  }
  const normalizedRationale: AdsProposalPresentation = {
    boundedImpact: requiredText(rationale.boundedImpact, "boundedImpact"),
    campaign: requiredText(rationale.campaign, "campaign"),
    currentValue: requiredText(rationale.currentValue, "currentValue"),
    reason: requiredText(rationale.reason, "reason"),
    requestedValue: requiredText(rationale.requestedValue, "requestedValue"),
    service: rationale.service as AdsService,
  }
  const rollback = exactRecord(
    packet.rollbackPlan,
    ["value"],
    "proposal rollback plan",
  )
  const rollbackPlan = {
    value: requiredText(rollback.value, "rollback value"),
  }
  if ([
    ...Object.values(normalizedRationale),
    rollbackPlan.value,
  ].some((entry) => containsProhibitedPaidMedicineTerm(String(entry)))) {
    throw new Error("Proposal packet contains a prohibited medicine term")
  }

  return {
    mutationFamily,
    operations,
    rationale: normalizedRationale,
    rollbackPlan,
  }
}

export function readAdsProposalDraftPacket(
  packetPath: string,
): AdsProposalDraftPacket {
  if (statSync(packetPath).size > MAX_PACKET_BYTES) {
    throw new Error("Google Ads proposal packet exceeds 64 KiB")
  }
  return normalizeProposalPacket(JSON.parse(readFileSync(packetPath, "utf8")))
}
