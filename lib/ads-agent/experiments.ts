import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { buildRollbackProposal } from "@/lib/ads-agent/mutations"
import {
  type AdsChangeProposal,
  type AdsMutationOperation,
  getAdsProposalByKey,
} from "@/lib/ads-agent/proposals"
import type {
  AdsMutationFamily,
  AdsService,
  TrackingState,
} from "@/lib/ads-agent/types"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const FEE_AWARE_EXPERIMENT_METRIC =
  "first_order_contribution_cents_per_retained_order" as const

export const EXPERIMENT_VARIABLES = [
  "ad_copy",
  "keywords",
  "assets",
  "bids",
  "budgets",
  "schedules",
  "landing_pages",
] as const

export type AdsExperimentVariable = (typeof EXPERIMENT_VARIABLES)[number]
export type AdsExperimentMethodology =
  | "google_custom"
  | "versioned_sequential"
export type AdsExperimentStatus =
  | "draft"
  | "approved"
  | "running"
  | "stopped"
  | "won"
  | "lost"
  | "inconclusive"

export interface AdsExperimentArmVersion {
  campaign: string
  methodology: AdsExperimentMethodology
  proposalKey: string
  value: string
  version: string
  windowEndsAt: string
  windowStartsAt: string
}

export interface AdsExperimentArmMeasurement {
  contributionCents: number
  retainedOrders: number
}

export interface AdsExperimentCheckpoint {
  asOf: string
  challenger: AdsExperimentArmMeasurement
  control: AdsExperimentArmMeasurement
  economicsComplete?: boolean
  trackingState: TrackingState
}

export interface AdsExperimentRunEvidence {
  reportDate: string
  snapshot: unknown
  status: string
  trackingState: TrackingState
}

export interface AdsExperimentResult {
  checkpoints: AdsExperimentCheckpoint[]
  evaluation?: AdsExperimentEvaluation
  launchProposalKey: string
  methodology: AdsExperimentMethodology
  stopProposalKey: string | null
  stoppedAt?: string
}

export interface AdsExperiment {
  challenger: AdsExperimentArmVersion
  control: AdsExperimentArmVersion
  createdAt: string
  endsAt: string
  experimentKey: string
  hypothesis: string
  id: string | null
  maxLossCents: number
  minimumOrdersPerArm: number
  primaryMetric: typeof FEE_AWARE_EXPERIMENT_METRIC
  result: AdsExperimentResult
  service: Exclude<AdsService, "account">
  startsAt: string
  status: AdsExperimentStatus
  updatedAt: string
  variable: AdsExperimentVariable
}

export interface AdsExperimentEvaluation {
  action: "complete" | "continue" | "request_stop"
  asOf: string
  challengerMetricCents: number | null
  controlMetricCents: number | null
  deltaMetricCents: number | null
  lossCents: number
  outcome: "inconclusive" | "lost" | "running" | "won"
  reasonCodes: string[]
}

export interface AdsExperimentRepository {
  findMaterialOverlaps(args: {
    campaign: string
    endsAt: string
    startsAt: string
  }): Promise<AdsExperiment[]>
  getByKey(experimentKey: string): Promise<AdsExperiment | null>
  insert(experiment: AdsExperiment): Promise<AdsExperiment>
  update(
    experiment: AdsExperiment,
    expectedStatus?: AdsExperimentStatus,
  ): Promise<AdsExperiment>
}

interface BuildAdsExperimentArgs {
  durationDays?: number
  experimentKey: string
  forecastRetainedOrders30d: number
  maxLossCents: number
  minimumOrdersPerArm: number
  now: Date
  proposal: AdsChangeProposal
  safetyOrComplianceRemediation?: boolean
}

interface CreateAdsExperimentArgs extends BuildAdsExperimentArgs {
  repository: AdsExperimentRepository
}

interface AdsExperimentStopResult {
  approvalRequired: boolean
  experimentStatus: AdsExperimentStatus
  stopProposalKey: string | null
}

interface UnknownRecord {
  [key: string]: unknown
}

const MATERIAL_EXPERIMENT_STATUSES = new Set<AdsExperimentStatus>([
  "draft",
  "approved",
  "running",
  "won",
  "lost",
  "inconclusive",
])
const STOPPABLE_EXPERIMENT_STATUSES = new Set<AdsExperimentStatus>([
  "approved",
  "running",
  "won",
  "lost",
  "inconclusive",
])
const DEFAULT_MINIMUM_ORDERS_PER_ARM = 10
const DEFAULT_MAX_LOSS_CENTS = 15_000
const MAX_EXPERIMENT_DAYS = 30
const SCHEDULE_EXPERIMENT_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000
const EXPERIMENT_KEY_PATTERN = /^EXP-\d{8}-\d{2}$/
const REMEDIATION_PATTERN =
  /\b(?:compliance|incident|legal|misleading|policy violation|prohibited|remediation|safety)\b/i
const EXPERIMENT_SELECT = [
  "id",
  "experiment_key",
  "service",
  "hypothesis",
  "variable",
  "control",
  "challenger",
  "primary_metric",
  "max_loss_cents",
  "minimum_orders_per_arm",
  "starts_at",
  "ends_at",
  "status",
  "result",
  "created_at",
  "updated_at",
].join(", ")

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`invalid_experiment_${field}`)
  }
  return value
}

function requiredNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`invalid_experiment_${field}`)
  }
  return parsed
}

function requiredInteger(value: unknown, field: string): number {
  const parsed = requiredNumber(value, field)
  if (!Number.isInteger(parsed)) {
    throw new Error(`invalid_experiment_${field}`)
  }
  return parsed
}

function validDate(value: string, field: string): string {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`invalid_experiment_${field}`)
  }
  return value
}

function normalizeCampaign(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function sydneyDateKey(now: Date): string {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "Australia/Sydney",
      year: "numeric",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  return `${values.year}${values.month}${values.day}`
}

function isoSydneyDate(now: Date): string {
  const key = sydneyDateKey(now)
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`
}

function shiftIsoDate(dateKey: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) throw new Error("experiment_date_key_invalid")
  const shifted = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + days,
  ))
  return [
    String(shifted.getUTCFullYear()).padStart(4, "0"),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-")
}

function sydneyClock(now: Date): {
  hour: number
  minute: number
  second: number
} {
  const values = new Map(
    new Intl.DateTimeFormat("en-AU", {
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Australia/Sydney",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  )
  return {
    hour: values.get("hour") ?? -1,
    minute: values.get("minute") ?? -1,
    second: values.get("second") ?? -1,
  }
}

function dateKeys(startInclusive: string, endExclusive: string): string[] {
  const dates: string[] = []
  for (
    let date = startInclusive;
    date < endExclusive;
    date = shiftIsoDate(date, 1)
  ) {
    dates.push(date)
    if (dates.length > MAX_EXPERIMENT_DAYS) {
      throw new Error("experiment_evidence_window_too_large")
    }
  }
  return dates
}

function sequentialEvidenceDates(args: {
  experiment: AdsExperiment
  now: Date
}): {
  challengerDates: string[]
  controlDates: string[]
  queryEndExclusive: string
  queryStartInclusive: string
} {
  const startsAt = new Date(args.experiment.startsAt)
  const endsAt = new Date(args.experiment.endsAt)
  const durationDays = Math.round(
    (endsAt.getTime() - startsAt.getTime()) / DAY_MS,
  )
  if (
    !Number.isInteger(durationDays)
    || durationDays <= 0
    || durationDays > MAX_EXPERIMENT_DAYS
  ) {
    throw new Error("experiment_window_invalid")
  }

  const controlEndExclusive = isoSydneyDate(startsAt)
  const controlStartInclusive = shiftIsoDate(
    controlEndExclusive,
    -durationDays,
  )
  const clock = sydneyClock(startsAt)
  const challengerStartInclusive =
    clock.hour === 0 && clock.minute === 0 && clock.second === 0
      ? controlEndExclusive
      : shiftIsoDate(controlEndExclusive, 1)
  const checkpointEnd = new Date(Math.min(
    args.now.getTime(),
    endsAt.getTime(),
  ))
  const challengerEndExclusive = isoSydneyDate(checkpointEnd)
  const boundedChallengerEnd =
    challengerEndExclusive < challengerStartInclusive
      ? challengerStartInclusive
      : challengerEndExclusive

  return {
    challengerDates: dateKeys(
      challengerStartInclusive,
      boundedChallengerEnd,
    ),
    controlDates: dateKeys(
      controlStartInclusive,
      controlEndExclusive,
    ),
    queryEndExclusive: boundedChallengerEnd,
    queryStartInclusive: controlStartInclusive,
  }
}

function trackingSeverity(state: TrackingState): number {
  return state === "RED" ? 2 : state === "AMBER" ? 1 : 0
}

function aggregateExperimentArm(args: {
  campaign: string
  dates: string[]
  runs: Map<string, AdsExperimentRunEvidence>
}): {
  complete: boolean
  measurement: AdsExperimentArmMeasurement
  trackingState: TrackingState
} {
  let complete = true
  let contributionCents = 0
  let retainedOrders = 0
  let trackingState: TrackingState = "GREEN"

  for (const date of args.dates) {
    const run = args.runs.get(date)
    if (!run || run.status !== "delivered") {
      complete = false
      if (trackingSeverity(trackingState) < trackingSeverity("AMBER")) {
        trackingState = "AMBER"
      }
      continue
    }
    if (trackingSeverity(run.trackingState) > trackingSeverity(trackingState)) {
      trackingState = run.trackingState
    }
    const snapshot = asRecord(run.snapshot)
    const campaigns = Array.isArray(snapshot?.daily)
      ? snapshot.daily
          .map(asRecord)
          .filter((campaign): campaign is UnknownRecord =>
            campaign != null)
          .filter((campaign) =>
            normalizeCampaign(
              typeof campaign.campaignName === "string"
                ? campaign.campaignName
                : "",
            ) === normalizeCampaign(args.campaign))
      : []
    if (campaigns.length !== 1) {
      complete = false
      continue
    }
    const campaign = campaigns[0]
    const contribution = campaign.contributionCents
    const orders = campaign.orders
    const refundedOrders = campaign.refundedOrders
    const unavailable = campaign.unavailableReasonCodes
    if (
      !Number.isInteger(contribution)
      || !Number.isInteger(orders)
      || !Number.isInteger(refundedOrders)
      || !Array.isArray(unavailable)
      || unavailable.length > 0
    ) {
      complete = false
      continue
    }
    contributionCents += contribution as number
    retainedOrders += Math.max(
      0,
      (orders as number) - (refundedOrders as number),
    )
  }

  return {
    complete,
    measurement: { contributionCents, retainedOrders },
    trackingState,
  }
}

export function buildSequentialExperimentCheckpoint(args: {
  experiment: AdsExperiment
  now: Date
  runs: AdsExperimentRunEvidence[]
}): AdsExperimentCheckpoint {
  if (args.experiment.result.methodology !== "versioned_sequential") {
    throw new Error("experiment_not_sequential")
  }
  const dates = sequentialEvidenceDates({
    experiment: args.experiment,
    now: args.now,
  })
  const runs = new Map(args.runs.map((run) => [run.reportDate, run]))
  const control = aggregateExperimentArm({
    campaign: args.experiment.control.campaign,
    dates: dates.controlDates,
    runs,
  })
  const challenger = aggregateExperimentArm({
    campaign: args.experiment.challenger.campaign,
    dates: dates.challengerDates,
    runs,
  })
  const trackingState =
    trackingSeverity(control.trackingState)
      >= trackingSeverity(challenger.trackingState)
      ? control.trackingState
      : challenger.trackingState
  return {
    asOf: args.now.toISOString(),
    challenger: challenger.measurement,
    control: control.measurement,
    economicsComplete: control.complete && challenger.complete,
    trackingState,
  }
}

function proposalLaunchVerified(proposal: AdsChangeProposal): boolean {
  return (
    proposal.status === "verified"
    && proposal.applyReceipt?.outcome === "applied"
    && proposal.verificationReceipt?.outcome === "verified"
    && proposal.verificationReceipt.proposalKey === proposal.proposalKey
    && proposal.approvedAt != null
    && (proposal.approvalChannel === "telegram"
      || proposal.approvalChannel === "codex")
  )
}

function proposalPacketValidated(proposal: AdsChangeProposal): boolean {
  return (
    ["validated", "awaiting_approval", "approved", "verified"]
      .includes(proposal.status)
    && proposal.validationReceipt?.ok === true
    && proposal.validationReceipt.proposalKey === proposal.proposalKey
    && proposal.validationReceipt.operationHash === proposal.operationHash
  )
}

export function experimentVariableForMutationFamily(
  family: AdsMutationFamily,
): AdsExperimentVariable | null {
  if (family === "ad_status") return "ad_copy"
  if (family === "keyword_status" || family === "negative_keyword") {
    return "keywords"
  }
  if (family === "asset_link_status") return "assets"
  if (
    family === "campaign_bidding"
    || family === "ad_group_cpc_bid"
  ) {
    return "bids"
  }
  if (family === "campaign_budget") return "budgets"
  if (family === "schedule_replace") return "schedules"
  return null
}

function variableForOperation(
  operation: AdsMutationOperation,
): AdsExperimentVariable | null {
  return experimentVariableForMutationFamily(operation.kind)
}

function buildArmVersion(args: {
  campaign: string
  methodology: AdsExperimentMethodology
  proposalKey: string
  value: string
  version: string
  windowEndsAt: string
  windowStartsAt: string
}): AdsExperimentArmVersion {
  return { ...args }
}

export function buildAdsExperiment(
  args: BuildAdsExperimentArgs,
): AdsExperiment {
  if (!EXPERIMENT_KEY_PATTERN.test(args.experimentKey)) {
    throw new Error("experiment_key_invalid")
  }
  if (!proposalPacketValidated(args.proposal)) {
    throw new Error("experiment_packet_not_validated")
  }
  if (
    args.safetyOrComplianceRemediation
    || REMEDIATION_PATTERN.test(args.proposal.rationale.reason)
    || REMEDIATION_PATTERN.test(args.proposal.rationale.boundedImpact)
  ) {
    throw new Error("remediation_is_not_an_experiment")
  }
  if (args.proposal.rationale.service === "account") {
    throw new Error("experiment_requires_one_service")
  }
  if (!Number.isInteger(args.maxLossCents) || args.maxLossCents <= 0) {
    throw new Error("experiment_max_loss_invalid")
  }
  if (
    !Number.isInteger(args.minimumOrdersPerArm)
    || args.minimumOrdersPerArm < DEFAULT_MINIMUM_ORDERS_PER_ARM
  ) {
    throw new Error("experiment_minimum_sample_invalid")
  }
  if (
    !Number.isFinite(args.forecastRetainedOrders30d)
    || args.forecastRetainedOrders30d < 0
  ) {
    throw new Error("experiment_forecast_invalid")
  }
  if (!Number.isFinite(args.now.getTime())) {
    throw new Error("experiment_start_invalid")
  }

  const variables = new Set(
    args.proposal.operations.map(variableForOperation),
  )
  if (variables.has(null) || variables.size !== 1) {
    throw new Error("experiment_requires_one_variable")
  }
  const variable = Array.from(variables)[0]!
  const durationDays = args.durationDays
    ?? (variable === "schedules"
      ? SCHEDULE_EXPERIMENT_DAYS
      : MAX_EXPERIMENT_DAYS)
  if (
    !Number.isInteger(durationDays)
    || durationDays <= 0
    || durationDays > MAX_EXPERIMENT_DAYS
  ) {
    throw new Error("experiment_window_invalid")
  }

  const startsAt = args.now.toISOString()
  const endsAt = new Date(
    args.now.getTime() + durationDays * DAY_MS,
  ).toISOString()
  const controlStartsAt = new Date(
    args.now.getTime() - durationDays * DAY_MS,
  ).toISOString()
  const methodology: AdsExperimentMethodology =
    args.forecastRetainedOrders30d
      >= Math.max(
        DEFAULT_MINIMUM_ORDERS_PER_ARM * 2,
        args.minimumOrdersPerArm * 2,
      )
      ? "google_custom"
      : "versioned_sequential"

  return {
    challenger: buildArmVersion({
      campaign: args.proposal.rationale.campaign,
      methodology,
      proposalKey: args.proposal.proposalKey,
      value: args.proposal.rationale.requestedValue,
      version: `${args.experimentKey}:challenger`,
      windowEndsAt: endsAt,
      windowStartsAt: startsAt,
    }),
    control: buildArmVersion({
      campaign: args.proposal.rationale.campaign,
      methodology,
      proposalKey: args.proposal.proposalKey,
      value: args.proposal.rationale.currentValue,
      version: `${args.experimentKey}:control`,
      windowEndsAt: startsAt,
      windowStartsAt: controlStartsAt,
    }),
    createdAt: startsAt,
    endsAt,
    experimentKey: args.experimentKey,
    hypothesis: args.proposal.rationale.reason,
    id: null,
    maxLossCents: args.maxLossCents,
    minimumOrdersPerArm: args.minimumOrdersPerArm,
    primaryMetric: FEE_AWARE_EXPERIMENT_METRIC,
    result: {
      checkpoints: [],
      launchProposalKey: args.proposal.proposalKey,
      methodology,
      stopProposalKey: null,
    },
    service: args.proposal.rationale.service,
    startsAt,
    status: proposalLaunchVerified(args.proposal) ? "running" : "draft",
    updatedAt: startsAt,
    variable,
  }
}

export function activateAdsExperiment(args: {
  experiment: AdsExperiment
  proposal: AdsChangeProposal
}): AdsExperiment {
  if (args.experiment.status === "running") return args.experiment
  if (
    args.experiment.status !== "draft"
    && args.experiment.status !== "approved"
  ) {
    throw new Error("experiment_not_activatable")
  }
  if (
    args.experiment.result.launchProposalKey !== args.proposal.proposalKey
    || args.experiment.control.proposalKey !== args.proposal.proposalKey
    || args.experiment.challenger.proposalKey !== args.proposal.proposalKey
  ) {
    throw new Error("experiment_launch_packet_mismatch")
  }
  if (!proposalLaunchVerified(args.proposal)) {
    throw new Error("experiment_launch_pending")
  }
  const verifiedAt = new Date(
    args.proposal.verificationReceipt!.verifiedAt,
  )
  if (!Number.isFinite(verifiedAt.getTime())) {
    throw new Error("experiment_launch_verification_invalid")
  }
  const durationMs =
    Date.parse(args.experiment.endsAt)
    - Date.parse(args.experiment.startsAt)
  if (
    !Number.isFinite(durationMs)
    || durationMs <= 0
    || durationMs > MAX_EXPERIMENT_DAYS * DAY_MS
  ) {
    throw new Error("experiment_window_invalid")
  }
  const startsAt = verifiedAt.toISOString()
  const endsAt = new Date(verifiedAt.getTime() + durationMs).toISOString()
  const controlStartsAt = new Date(
    verifiedAt.getTime() - durationMs,
  ).toISOString()
  return {
    ...args.experiment,
    challenger: {
      ...args.experiment.challenger,
      windowEndsAt: endsAt,
      windowStartsAt: startsAt,
    },
    control: {
      ...args.experiment.control,
      windowEndsAt: startsAt,
      windowStartsAt: controlStartsAt,
    },
    endsAt,
    startsAt,
    status: "running",
    updatedAt: startsAt,
  }
}

export function experimentsOverlap(
  left: AdsExperiment,
  right: AdsExperiment,
): boolean {
  if (
    !MATERIAL_EXPERIMENT_STATUSES.has(left.status)
    || !MATERIAL_EXPERIMENT_STATUSES.has(right.status)
    || normalizeCampaign(left.control.campaign)
      !== normalizeCampaign(right.control.campaign)
  ) {
    return false
  }
  const leftStart = Date.parse(left.startsAt)
  const leftEnd = Date.parse(left.endsAt)
  const rightStart = Date.parse(right.startsAt)
  const rightEnd = Date.parse(right.endsAt)
  if (
    ![leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)
  ) {
    throw new Error("experiment_window_invalid")
  }
  return leftStart < rightEnd && rightStart < leftEnd
}

export async function createAdsExperiment(
  args: CreateAdsExperimentArgs,
): Promise<AdsExperiment> {
  const experiment = buildAdsExperiment(args)
  const candidates = await args.repository.findMaterialOverlaps({
    campaign: experiment.control.campaign,
    endsAt: experiment.endsAt,
    startsAt: experiment.startsAt,
  })
  if (candidates.some((candidate) =>
    experimentsOverlap(candidate, experiment))) {
    throw new Error("experiment_campaign_overlap")
  }
  return args.repository.insert(experiment)
}

function metricCents(arm: AdsExperimentArmMeasurement): number | null {
  return arm.retainedOrders > 0
    ? Math.round(arm.contributionCents / arm.retainedOrders)
    : null
}

export function evaluateAdsExperiment(args: {
  checkpoint: AdsExperimentCheckpoint
  experiment: AdsExperiment
}): AdsExperimentEvaluation {
  const asOf = Date.parse(args.checkpoint.asOf)
  const endsAt = Date.parse(args.experiment.endsAt)
  if (!Number.isFinite(asOf) || !Number.isFinite(endsAt)) {
    throw new Error("experiment_checkpoint_date_invalid")
  }
  for (const arm of [
    args.checkpoint.control,
    args.checkpoint.challenger,
  ]) {
    if (
      !Number.isInteger(arm.retainedOrders)
      || arm.retainedOrders < 0
      || !Number.isInteger(arm.contributionCents)
    ) {
      throw new Error("experiment_checkpoint_metric_invalid")
    }
  }

  const controlMetricCents = metricCents(args.checkpoint.control)
  const challengerMetricCents = metricCents(args.checkpoint.challenger)
  const projectedControlCents = controlMetricCents == null
    ? 0
    : controlMetricCents * args.checkpoint.challenger.retainedOrders
  const lossCents = Math.max(
    0,
    projectedControlCents
      - args.checkpoint.challenger.contributionCents,
  )
  const deltaMetricCents =
    controlMetricCents != null && challengerMetricCents != null
      ? challengerMetricCents - controlMetricCents
      : null

  const base = {
    asOf: args.checkpoint.asOf,
    challengerMetricCents,
    controlMetricCents,
    deltaMetricCents,
    lossCents,
  }

  if (
    args.checkpoint.trackingState !== "GREEN"
    || args.checkpoint.economicsComplete === false
  ) {
    return {
      ...base,
      action: "request_stop",
      outcome: "inconclusive",
      reasonCodes: [
        args.checkpoint.trackingState !== "GREEN"
          ? "TRACKING_NOT_GREEN"
          : "ECONOMICS_INCOMPLETE",
      ],
    }
  }
  if (lossCents >= args.experiment.maxLossCents) {
    return {
      ...base,
      action: "request_stop",
      outcome: "lost",
      reasonCodes: ["MAX_LOSS_REACHED"],
    }
  }
  if (asOf < endsAt) {
    return {
      ...base,
      action: "continue",
      outcome: "running",
      reasonCodes: ["WINDOW_OPEN"],
    }
  }
  if (
    args.checkpoint.control.retainedOrders
      < args.experiment.minimumOrdersPerArm
    || args.checkpoint.challenger.retainedOrders
      < args.experiment.minimumOrdersPerArm
  ) {
    return {
      ...base,
      action: "complete",
      outcome: "inconclusive",
      reasonCodes: ["MINIMUM_SAMPLE_NOT_MET"],
    }
  }
  if (deltaMetricCents == null || deltaMetricCents === 0) {
    return {
      ...base,
      action: "complete",
      outcome: "inconclusive",
      reasonCodes: ["NO_FEE_AWARE_DIFFERENCE"],
    }
  }
  return {
    ...base,
    action: "complete",
    outcome: deltaMetricCents > 0 ? "won" : "lost",
    reasonCodes: [
      deltaMetricCents > 0
        ? "CHALLENGER_CONTRIBUTION_HIGHER"
        : "CHALLENGER_CONTRIBUTION_LOWER",
    ],
  }
}

function resultWith(
  experiment: AdsExperiment,
  values: Partial<AdsExperimentResult>,
): AdsExperimentResult {
  return {
    ...experiment.result,
    ...values,
  }
}

export async function requestExperimentStop(args: {
  buildRollbackProposal(
    launchProposalKey: string,
  ): Promise<AdsChangeProposal>
  experimentKey: string
  getProposal(proposalKey: string): Promise<AdsChangeProposal | null>
  now: Date
  repository: AdsExperimentRepository
}): Promise<AdsExperimentStopResult> {
  const current = await args.repository.getByKey(args.experimentKey)
  if (!current) throw new Error("experiment_not_found")
  if (current.status === "stopped") {
    return {
      approvalRequired: false,
      experimentStatus: "stopped",
      stopProposalKey: current.result.stopProposalKey,
    }
  }
  if (!STOPPABLE_EXPERIMENT_STATUSES.has(current.status)) {
    throw new Error("experiment_not_stoppable")
  }

  if (!current.result.stopProposalKey) {
    const rollback = await args.buildRollbackProposal(
      current.result.launchProposalKey,
    )
    if (rollback.status !== "draft") {
      throw new Error("experiment_stop_packet_invalid")
    }
    const updated = await args.repository.update({
      ...current,
      result: resultWith(current, {
        stopProposalKey: rollback.proposalKey,
      }),
      updatedAt: args.now.toISOString(),
    }, current.status)
    return {
      approvalRequired: true,
      experimentStatus: updated.status,
      stopProposalKey: rollback.proposalKey,
    }
  }

  const stopProposal = await args.getProposal(
    current.result.stopProposalKey,
  )
  if (
    !stopProposal
    || stopProposal.status !== "verified"
    || stopProposal.verificationReceipt?.outcome !== "verified"
    || stopProposal.proposalKey !== current.result.stopProposalKey
  ) {
    return {
      approvalRequired: true,
      experimentStatus: current.status,
      stopProposalKey: current.result.stopProposalKey,
    }
  }

  const stopped = await args.repository.update({
    ...current,
    result: resultWith(current, {
      stoppedAt: args.now.toISOString(),
    }),
    status: "stopped",
    updatedAt: args.now.toISOString(),
  }, current.status)
  return {
    approvalRequired: false,
    experimentStatus: stopped.status,
    stopProposalKey: current.result.stopProposalKey,
  }
}

function armVersionFromRow(
  value: unknown,
  field: string,
): AdsExperimentArmVersion {
  const row = asRecord(value)
  if (!row) throw new Error(`invalid_experiment_${field}`)
  const methodology = requiredString(
    row.methodology,
    `${field}_methodology`,
  )
  if (
    methodology !== "google_custom"
    && methodology !== "versioned_sequential"
  ) {
    throw new Error(`invalid_experiment_${field}_methodology`)
  }
  return {
    campaign: requiredString(row.campaign, `${field}_campaign`),
    methodology,
    proposalKey: requiredString(
      row.proposalKey,
      `${field}_proposal_key`,
    ),
    value: requiredString(row.value, `${field}_value`),
    version: requiredString(row.version, `${field}_version`),
    windowEndsAt: validDate(
      requiredString(row.windowEndsAt, `${field}_window_ends_at`),
      `${field}_window_ends_at`,
    ),
    windowStartsAt: validDate(
      requiredString(row.windowStartsAt, `${field}_window_starts_at`),
      `${field}_window_starts_at`,
    ),
  }
}

function measurementFromRow(
  value: unknown,
  field: string,
): AdsExperimentArmMeasurement {
  const row = asRecord(value)
  if (!row) throw new Error(`invalid_experiment_${field}`)
  return {
    contributionCents: requiredInteger(
      row.contributionCents,
      `${field}_contribution_cents`,
    ),
    retainedOrders: requiredInteger(
      row.retainedOrders,
      `${field}_retained_orders`,
    ),
  }
}

function checkpointFromRow(value: unknown): AdsExperimentCheckpoint {
  const row = asRecord(value)
  if (!row) throw new Error("invalid_experiment_checkpoint")
  const trackingState = requiredString(
    row.trackingState,
    "checkpoint_tracking_state",
  )
  if (!["GREEN", "AMBER", "RED"].includes(trackingState)) {
    throw new Error("invalid_experiment_checkpoint_tracking_state")
  }
  return {
    asOf: validDate(
      requiredString(row.asOf, "checkpoint_as_of"),
      "checkpoint_as_of",
    ),
    challenger: measurementFromRow(
      row.challenger,
      "checkpoint_challenger",
    ),
    control: measurementFromRow(row.control, "checkpoint_control"),
    ...(typeof row.economicsComplete === "boolean"
      ? { economicsComplete: row.economicsComplete }
      : {}),
    trackingState: trackingState as TrackingState,
  }
}

function resultFromRow(
  value: unknown,
  launchProposalKey: string,
): AdsExperimentResult {
  const row = asRecord(value)
  if (!row) throw new Error("invalid_experiment_result")
  const methodology = row.methodology
  if (
    methodology !== "google_custom"
    && methodology !== "versioned_sequential"
  ) {
    throw new Error("invalid_experiment_result_methodology")
  }
  return {
    checkpoints: Array.isArray(row.checkpoints)
      ? row.checkpoints.map(checkpointFromRow)
      : [],
    launchProposalKey: requiredString(
      row.launchProposalKey ?? launchProposalKey,
      "result_launch_proposal_key",
    ),
    methodology,
    stopProposalKey:
      typeof row.stopProposalKey === "string" && row.stopProposalKey.trim()
        ? row.stopProposalKey
        : null,
    ...(typeof row.stoppedAt === "string"
      ? { stoppedAt: validDate(row.stoppedAt, "result_stopped_at") }
      : {}),
    ...(asRecord(row.evaluation)
      ? { evaluation: row.evaluation as unknown as AdsExperimentEvaluation }
      : {}),
  }
}

function experimentFromRow(value: unknown): AdsExperiment {
  const row = asRecord(value)
  if (!row) throw new Error("invalid_experiment_row")
  const experimentKey = requiredString(
    row.experiment_key,
    "experiment_key",
  )
  const service = requiredString(row.service, "service")
  if (
    !["med_certs", "scripts", "ed", "hair_loss", "womens_health"]
      .includes(service)
  ) {
    throw new Error("invalid_experiment_service")
  }
  const variable = requiredString(row.variable, "variable")
  if (!EXPERIMENT_VARIABLES.includes(variable as AdsExperimentVariable)) {
    throw new Error("invalid_experiment_variable")
  }
  const primaryMetric = requiredString(
    row.primary_metric,
    "primary_metric",
  )
  if (primaryMetric !== FEE_AWARE_EXPERIMENT_METRIC) {
    throw new Error("invalid_experiment_primary_metric")
  }
  const status = requiredString(row.status, "status")
  if (![
    "draft",
    "approved",
    "running",
    "stopped",
    "won",
    "lost",
    "inconclusive",
  ].includes(status)) {
    throw new Error("invalid_experiment_status")
  }
  const control = armVersionFromRow(row.control, "control")
  const challenger = armVersionFromRow(row.challenger, "challenger")
  return {
    challenger,
    control,
    createdAt: validDate(
      requiredString(row.created_at, "created_at"),
      "created_at",
    ),
    endsAt: validDate(
      requiredString(row.ends_at, "ends_at"),
      "ends_at",
    ),
    experimentKey,
    hypothesis: requiredString(row.hypothesis, "hypothesis"),
    id: requiredString(row.id, "id"),
    maxLossCents: requiredInteger(row.max_loss_cents, "max_loss_cents"),
    minimumOrdersPerArm: requiredInteger(
      row.minimum_orders_per_arm,
      "minimum_orders_per_arm",
    ),
    primaryMetric: FEE_AWARE_EXPERIMENT_METRIC,
    result: resultFromRow(row.result, challenger.proposalKey),
    service: service as Exclude<AdsService, "account">,
    startsAt: validDate(
      requiredString(row.starts_at, "starts_at"),
      "starts_at",
    ),
    status: status as AdsExperimentStatus,
    updatedAt: validDate(
      requiredString(row.updated_at, "updated_at"),
      "updated_at",
    ),
    variable: variable as AdsExperimentVariable,
  }
}

function experimentInsert(experiment: AdsExperiment): UnknownRecord {
  return {
    challenger: experiment.challenger,
    control: experiment.control,
    ends_at: experiment.endsAt,
    experiment_key: experiment.experimentKey,
    hypothesis: experiment.hypothesis,
    max_loss_cents: experiment.maxLossCents,
    minimum_orders_per_arm: experiment.minimumOrdersPerArm,
    primary_metric: experiment.primaryMetric,
    result: experiment.result,
    service: experiment.service,
    starts_at: experiment.startsAt,
    status: experiment.status,
    updated_at: experiment.updatedAt,
    variable: experiment.variable,
  }
}

export function createSupabaseAdsExperimentRepository(args: {
  supabase: SupabaseClient
}): AdsExperimentRepository {
  const { supabase } = args
  return {
    async findMaterialOverlaps({ campaign }) {
      const result = await supabase
        .from("google_ads_experiments")
        .select(EXPERIMENT_SELECT)
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
          `google_ads_experiment_overlap_read_failed:${result.error.code || "unknown"}`,
        )
      }
      return (result.data ?? [])
        .map(experimentFromRow)
        .filter((experiment) =>
          normalizeCampaign(experiment.control.campaign)
            === normalizeCampaign(campaign))
    },
    async getByKey(experimentKey) {
      const result = await supabase
        .from("google_ads_experiments")
        .select(EXPERIMENT_SELECT)
        .eq("experiment_key", experimentKey)
        .maybeSingle()
      if (result.error) {
        throw new Error(
          `google_ads_experiment_read_failed:${result.error.code || "unknown"}`,
        )
      }
      return result.data ? experimentFromRow(result.data) : null
    },
    async insert(experiment) {
      const result = await supabase
        .from("google_ads_experiments")
        .insert(experimentInsert(experiment))
        .select(EXPERIMENT_SELECT)
        .single()
      if (result.error || !result.data) {
        throw new Error(
          `google_ads_experiment_insert_failed:${result.error?.code || "unknown"}`,
        )
      }
      return experimentFromRow(result.data)
    },
    async update(experiment, expectedStatus) {
      if (!experiment.id) throw new Error("experiment_id_missing")
      let query = supabase
        .from("google_ads_experiments")
        .update({
          result: experiment.result,
          status: experiment.status,
          updated_at: experiment.updatedAt,
        })
        .eq("id", experiment.id)
      if (expectedStatus) query = query.eq("status", expectedStatus)
      const result = await query
        .select(EXPERIMENT_SELECT)
        .maybeSingle()
      if (result.error) {
        throw new Error(
          `google_ads_experiment_update_failed:${result.error.code || "unknown"}`,
        )
      }
      if (!result.data) throw new Error("google_ads_experiment_update_cas_miss")
      return experimentFromRow(result.data)
    },
  }
}

async function nextExperimentKey(
  supabase: SupabaseClient,
  now: Date,
): Promise<string> {
  const prefix = `EXP-${sydneyDateKey(now)}-`
  const result = await supabase
    .from("google_ads_experiments")
    .select("experiment_key")
    .like("experiment_key", `${prefix}%`)
    .order("experiment_key", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (result.error) {
    throw new Error(
      `google_ads_experiment_sequence_failed:${result.error.code || "unknown"}`,
    )
  }
  const latest = typeof result.data?.experiment_key === "string"
    ? result.data.experiment_key
    : null
  const next = latest ? Number(latest.slice(prefix.length)) + 1 : 1
  const key = `${prefix}${String(next).padStart(2, "0")}`
  if (!EXPERIMENT_KEY_PATTERN.test(key)) {
    throw new Error("experiment_sequence_exhausted")
  }
  return key
}

function forecastRetainedOrders(
  snapshot: unknown,
  proposal: AdsChangeProposal,
): number {
  const row = asRecord(snapshot)
  const campaigns = Array.isArray(row?.rolling30) ? row.rolling30 : []
  const campaignName = normalizeCampaign(proposal.rationale.campaign)
  return campaigns.reduce((total, value) => {
    const campaign = asRecord(value)
    if (!campaign) return total
    if (
      normalizeCampaign(
        typeof campaign.campaignName === "string"
          ? campaign.campaignName
          : "",
      ) !== campaignName
    ) {
      return total
    }
    const orders = requiredNumber(campaign.orders ?? 0, "forecast_orders")
    const refunded = requiredNumber(
      campaign.refundedOrders ?? 0,
      "forecast_refunded_orders",
    )
    return total + Math.max(0, orders - refunded)
  }, 0)
}

async function proposalSnapshot(
  supabase: SupabaseClient,
  runId: string | null,
): Promise<unknown> {
  if (!runId) return null
  const result = await supabase
    .from("google_ads_agent_runs")
    .select("snapshot")
    .eq("id", runId)
    .maybeSingle()
  if (result.error) {
    throw new Error(
      `google_ads_experiment_run_read_failed:${result.error.code || "unknown"}`,
    )
  }
  return result.data?.snapshot ?? null
}

export async function createExperimentFromProposal(
  proposalKey: string,
): Promise<AdsExperiment> {
  const supabase = createServiceRoleClient()
  const proposal = await getAdsProposalByKey(supabase, proposalKey)
  if (!proposal) throw new Error("proposal_not_found")
  const verifiedAt = proposal.verificationReceipt?.verifiedAt
  const now = verifiedAt ? new Date(verifiedAt) : new Date()
  const snapshot = await proposalSnapshot(supabase, proposal.runId)
  return createAdsExperiment({
    experimentKey: await nextExperimentKey(supabase, now),
    forecastRetainedOrders30d: forecastRetainedOrders(snapshot, proposal),
    maxLossCents: DEFAULT_MAX_LOSS_CENTS,
    minimumOrdersPerArm: DEFAULT_MINIMUM_ORDERS_PER_ARM,
    now,
    proposal,
    repository: createSupabaseAdsExperimentRepository({ supabase }),
  })
}

function checkpointFromExperiment(
  experiment: AdsExperiment,
  now: Date,
): AdsExperimentCheckpoint {
  const latest = experiment.result.checkpoints.at(-1)
  if (latest) return latest
  return {
    asOf: now.toISOString(),
    challenger: {
      contributionCents: 0,
      retainedOrders: 0,
    },
    control: {
      contributionCents: 0,
      retainedOrders: 0,
    },
    economicsComplete: false,
    trackingState: "AMBER",
  }
}

async function loadExperimentCheckpoint(args: {
  experiment: AdsExperiment
  now: Date
  supabase: SupabaseClient
}): Promise<AdsExperimentCheckpoint> {
  if (args.experiment.result.methodology === "google_custom") {
    return checkpointFromExperiment(args.experiment, args.now)
  }
  const dates = sequentialEvidenceDates({
    experiment: args.experiment,
    now: args.now,
  })
  const result = await args.supabase
    .from("google_ads_agent_runs")
    .select("report_date, status, tracking_state, snapshot")
    .gte("report_date", dates.queryStartInclusive)
    .lt("report_date", dates.queryEndExclusive)
    .order("report_date", { ascending: true })
  if (result.error) {
    throw new Error(
      `google_ads_experiment_checkpoint_read_failed:${result.error.code || "unknown"}`,
    )
  }
  const runs = (result.data ?? []).map((value): AdsExperimentRunEvidence => {
    const row = asRecord(value)
    const trackingState = row?.tracking_state
    return {
      reportDate: requiredString(
        row?.report_date,
        "checkpoint_report_date",
      ),
      snapshot: row?.snapshot ?? null,
      status: typeof row?.status === "string" ? row.status : "failed",
      trackingState:
        trackingState === "GREEN"
        || trackingState === "AMBER"
        || trackingState === "RED"
          ? trackingState
          : "RED",
    }
  })
  return buildSequentialExperimentCheckpoint({
    experiment: args.experiment,
    now: args.now,
    runs,
  })
}

export async function recordExperimentCheckpoint(args: {
  checkpoint: AdsExperimentCheckpoint
  experimentKey: string
  now?: Date
  repository: AdsExperimentRepository
}): Promise<AdsExperiment> {
  const current = await args.repository.getByKey(args.experimentKey)
  if (!current) throw new Error("experiment_not_found")
  if (current.status !== "running") {
    throw new Error("experiment_not_running")
  }
  const checkpoint = checkpointFromRow(args.checkpoint)
  const checkpoints = [
    ...current.result.checkpoints.filter(
      (item) => item.asOf !== checkpoint.asOf,
    ),
    checkpoint,
  ].sort((left, right) => left.asOf.localeCompare(right.asOf))
  return args.repository.update({
    ...current,
    result: resultWith(current, { checkpoints }),
    updatedAt: (args.now ?? new Date()).toISOString(),
  }, current.status)
}

async function collectAndRecordCheckpoint(args: {
  experiment: AdsExperiment
  now: Date
  repository: AdsExperimentRepository
  supabase: SupabaseClient
}): Promise<{
  checkpoint: AdsExperimentCheckpoint
  experiment: AdsExperiment
}> {
  if (args.experiment.status !== "running") {
    throw new Error("experiment_not_running")
  }
  const checkpoint = await loadExperimentCheckpoint({
    experiment: args.experiment,
    now: args.now,
    supabase: args.supabase,
  })
  const checkpoints = [
    ...args.experiment.result.checkpoints.filter(
      (item) => item.asOf !== checkpoint.asOf,
    ),
    checkpoint,
  ].sort((left, right) => left.asOf.localeCompare(right.asOf))
  const updated = await args.repository.update({
    ...args.experiment,
    result: resultWith(args.experiment, { checkpoints }),
    updatedAt: args.now.toISOString(),
  }, args.experiment.status)
  return { checkpoint, experiment: updated }
}

async function activateStoredExperiment(args: {
  experiment: AdsExperiment
  repository: AdsExperimentRepository
  supabase: SupabaseClient
}): Promise<AdsExperiment> {
  if (args.experiment.status === "running") return args.experiment
  if (
    args.experiment.status !== "draft"
    && args.experiment.status !== "approved"
  ) {
    throw new Error("experiment_not_running")
  }
  const proposal = await getAdsProposalByKey(
    args.supabase,
    args.experiment.result.launchProposalKey,
  )
  if (!proposal) throw new Error("experiment_launch_proposal_not_found")
  const activated = activateAdsExperiment({
    experiment: args.experiment,
    proposal,
  })
  const candidates = await args.repository.findMaterialOverlaps({
    campaign: activated.control.campaign,
    endsAt: activated.endsAt,
    startsAt: activated.startsAt,
  })
  if (candidates.some((candidate) =>
    candidate.experimentKey !== activated.experimentKey
    && experimentsOverlap(candidate, activated))) {
    throw new Error("experiment_campaign_overlap")
  }
  return args.repository.update(activated, args.experiment.status)
}

export async function checkExperiment(
  experimentKey: string,
): Promise<AdsExperimentEvaluation> {
  const supabase = createServiceRoleClient()
  const repository = createSupabaseAdsExperimentRepository({ supabase })
  const stored = await repository.getByKey(experimentKey)
  if (!stored) throw new Error("experiment_not_found")
  const experiment = await activateStoredExperiment({
    experiment: stored,
    repository,
    supabase,
  })
  const collected = await collectAndRecordCheckpoint({
    experiment,
    now: new Date(),
    repository,
    supabase,
  })
  return evaluateAdsExperiment({
    checkpoint: collected.checkpoint,
    experiment: collected.experiment,
  })
}

export async function evaluateExperiment(
  experimentKey: string,
): Promise<AdsExperimentEvaluation> {
  const supabase = createServiceRoleClient()
  const repository = createSupabaseAdsExperimentRepository({ supabase })
  const stored = await repository.getByKey(experimentKey)
  if (!stored) throw new Error("experiment_not_found")
  const experiment = await activateStoredExperiment({
    experiment: stored,
    repository,
    supabase,
  })
  const now = new Date()
  const collected = await collectAndRecordCheckpoint({
    experiment,
    now,
    repository,
    supabase,
  })
  const evaluation = evaluateAdsExperiment({
    checkpoint: collected.checkpoint,
    experiment: collected.experiment,
  })
  const status: AdsExperimentStatus =
    evaluation.action === "complete"
      ? evaluation.outcome === "running"
        ? collected.experiment.status
        : evaluation.outcome
      : collected.experiment.status
  await repository.update({
    ...collected.experiment,
    result: resultWith(collected.experiment, { evaluation }),
    status,
    updatedAt: now.toISOString(),
  }, collected.experiment.status)
  return evaluation
}

export async function stopExperiment(
  experimentKey: string,
): Promise<AdsExperimentStopResult> {
  const supabase = createServiceRoleClient()
  return requestExperimentStop({
    buildRollbackProposal,
    experimentKey,
    getProposal: (proposalKey) =>
      getAdsProposalByKey(supabase, proposalKey),
    now: new Date(),
    repository: createSupabaseAdsExperimentRepository({ supabase }),
  })
}

export const experimentDefaults = {
  maxDays: MAX_EXPERIMENT_DAYS,
  maxLossCents: DEFAULT_MAX_LOSS_CENTS,
  minimumOrdersPerArm: DEFAULT_MINIMUM_ORDERS_PER_ARM,
  sydneyReportDate: isoSydneyDate,
} as const
