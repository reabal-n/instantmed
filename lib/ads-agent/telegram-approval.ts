import "server-only"

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto"

import {
  type AdsChangeProposal,
  assertAdsProposalOperationsUnchanged,
  compareAndSetTelegramProposalDecision,
  getAdsProposalByKey,
  isAdsProposalExpired,
  markAdsProposalAwaitingTelegramApproval,
} from "@/lib/ads-agent/proposals"
import { sendGoogleAdsProposalCardViaTelegram } from "@/lib/notifications/telegram"

type TelegramAdsDecision = "approve" | "reject"

export interface TelegramAdsDecisionWrite {
  actorHash: string
  callbackQueryHash: string
  decision: TelegramAdsDecision
  expectedStatus: "awaiting_approval"
  proposalId: string
  telegramMessageId: number
  updateId: number
}

export interface TelegramAdsApprovalRepository {
  compareAndSetDecision(
    input: TelegramAdsDecisionWrite,
  ): Promise<{ consumed: boolean }>
  getProposalByKey(proposalKey: string): Promise<AdsChangeProposal | null>
}

export interface AdsExperimentApprovalSummary {
  durationDays: number
  maxLossCents: number
  methodology: "google_custom" | "versioned_sequential"
  minimumOrdersPerArm: number
  variable: string
}

export type TelegramAdsDecisionResult =
  | {
      decision: TelegramAdsDecision
      ok: true
      proposalKey: string
    }
  | {
      ignored: true
      ok: true
    }
  | {
      ok: false
      reason: string
    }

type TelegramAdsEnv = Partial<Record<
  | "TELEGRAM_ADS_APPROVALS_ENABLED"
  | "TELEGRAM_ADS_APPROVAL_SIGNING_SECRET"
  | "TELEGRAM_ADS_APPROVER_USER_ID"
  | "TELEGRAM_CHAT_ID",
  string | undefined
>>

interface ParsedCallback {
  callbackQueryId: string
  chatId: string
  data: string
  forwarded: boolean
  messageId: number
  updateId: number
  userId: string
}

interface ParsedCallbackData {
  decision: TelegramAdsDecision
  proposalKey: string
  signature: string
}

const CALLBACK_PATTERN = /^ads:([ar]):(ADS-\d{8}-\d{2}):([a-f0-9]{16})$/
const SERVICE_LABELS: Record<AdsChangeProposal["rationale"]["service"], string> = {
  account: "Account",
  ed: "ED",
  hair_loss: "Hair loss",
  med_certs: "Med certs",
  scripts: "Scripts",
  womens_health: "Women's health",
}

function safeEqual(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) return false
  try {
    return timingSafeEqual(Buffer.from(left), Buffer.from(right))
  } catch {
    return false
  }
}

export function verifyTelegramWebhookSecret(
  header: string,
  configuredSecret: string,
): boolean {
  return safeEqual(header, configuredSecret)
}

function signaturePayload(
  decision: TelegramAdsDecision,
  proposal: AdsChangeProposal,
): string {
  return [
    decision,
    proposal.proposalKey,
    proposal.operationHash,
    proposal.baselineHash,
    proposal.expiresAt,
  ].join(":")
}

function signTelegramAdsCallback(
  decision: TelegramAdsDecision,
  proposal: AdsChangeProposal,
  signingSecret: string,
): string {
  return createHmac("sha256", signingSecret)
    .update(signaturePayload(decision, proposal), "utf8")
    .digest("hex")
    .slice(0, 16)
}

export function buildTelegramAdsCallbackData(
  decision: TelegramAdsDecision,
  proposal: AdsChangeProposal,
  signingSecret: string,
): string {
  if (signingSecret.length < 32) {
    throw new Error("Telegram Ads approval signing secret is not configured")
  }
  const action = decision === "approve" ? "a" : "r"
  const signature = signTelegramAdsCallback(
    decision,
    proposal,
    signingSecret,
  )
  const data = `ads:${action}:${proposal.proposalKey}:${signature}`
  if (Buffer.byteLength(data, "utf8") > 64) {
    throw new Error("Telegram Ads callback exceeds 64 bytes")
  }
  return data
}

export function formatTelegramAdsProposalCard(
  proposal: AdsChangeProposal,
  experiment?: AdsExperimentApprovalSummary | null,
): string {
  const expiresAt = new Date(proposal.expiresAt)
  if (!Number.isFinite(expiresAt.getTime())) {
    throw new Error("Invalid Ads proposal expiry")
  }
  const expiry = new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(expiresAt)

  const lines = [
    `${proposal.proposalKey} · expires ${expiry} Sydney`,
    `${SERVICE_LABELS[proposal.rationale.service]} · ${proposal.rationale.campaign}: ${proposal.rationale.currentValue} → ${proposal.rationale.requestedValue}`,
    `Bounded impact: ${proposal.rationale.boundedImpact}`,
    ...(experiment
      ? [
          `Experiment: ${experiment.variable} · ${
            experiment.methodology === "google_custom"
              ? "Google custom"
              : "sequential"
          } · ${experiment.durationDays} days · minimum ${experiment.minimumOrdersPerArm} retained orders/arm · A$${(
            experiment.maxLossCents / 100
          ).toFixed(2)} max loss`,
        ]
      : []),
    `Why: ${proposal.rationale.reason}`,
    `Validation: ${proposal.validationReceipt?.ok ? "PASSED" : "NOT PASSED"}`,
    `Rollback: ${proposal.rationale.requestedValue} → ${proposal.rollbackPlan.value}`,
  ]
  return lines.join("\n")
}

async function getExperimentApprovalSummary(args: {
  proposalKey: string
  supabase: Parameters<
    typeof markAdsProposalAwaitingTelegramApproval
  >[0]["supabase"]
}): Promise<AdsExperimentApprovalSummary | null> {
  const result = await args.supabase
    .from("google_ads_experiments")
    .select(
      "variable, max_loss_cents, minimum_orders_per_arm, starts_at, ends_at, result",
    )
    .in("status", ["draft", "approved"])
    .contains("result", { launchProposalKey: args.proposalKey })
    .limit(2)
  if (result.error) {
    throw new Error(
      `google_ads_experiment_approval_read_failed:${result.error.code || "unknown"}`,
    )
  }
  if ((result.data?.length ?? 0) > 1) {
    throw new Error("multiple_experiments_for_proposal")
  }
  const row = result.data?.[0]
  if (!row) return null
  const value = row.result && typeof row.result === "object"
    ? row.result as Record<string, unknown>
    : null
  const methodology = value?.methodology
  const startsAt = Date.parse(String(row.starts_at ?? ""))
  const endsAt = Date.parse(String(row.ends_at ?? ""))
  const durationDays = Math.round(
    (endsAt - startsAt) / (24 * 60 * 60 * 1000),
  )
  if (
    (methodology !== "google_custom"
      && methodology !== "versioned_sequential")
    || !Number.isInteger(durationDays)
    || durationDays <= 0
    || durationDays > 30
    || !Number.isInteger(row.max_loss_cents)
    || row.max_loss_cents <= 0
    || !Number.isInteger(row.minimum_orders_per_arm)
    || row.minimum_orders_per_arm < 10
    || typeof row.variable !== "string"
    || !row.variable.trim()
  ) {
    throw new Error("invalid_experiment_approval_summary")
  }
  return {
    durationDays,
    maxLossCents: row.max_loss_cents,
    methodology,
    minimumOrdersPerArm: row.minimum_orders_per_arm,
    variable: row.variable,
  }
}

export async function sendAdsProposalForTelegramApproval(args: {
  envSource?: TelegramAdsEnv
  now?: Date
  proposal: AdsChangeProposal
  supabase: Parameters<typeof markAdsProposalAwaitingTelegramApproval>[0]["supabase"]
}): Promise<{ messageId: number }> {
  const env = args.envSource ?? process.env
  if (env.TELEGRAM_ADS_APPROVALS_ENABLED !== "true") {
    throw new Error("Telegram Ads approvals are disabled")
  }
  const signingSecret = env.TELEGRAM_ADS_APPROVAL_SIGNING_SECRET
  if (!signingSecret || signingSecret.length < 32) {
    throw new Error("Telegram Ads approval signing secret is not configured")
  }
  if (args.proposal.status !== "validated") {
    throw new Error("Ads proposal is not validated")
  }
  assertAdsProposalOperationsUnchanged(args.proposal)
  const experiment = await getExperimentApprovalSummary({
    proposalKey: args.proposal.proposalKey,
    supabase: args.supabase,
  })

  const result = await sendGoogleAdsProposalCardViaTelegram({
    approveCallbackData: buildTelegramAdsCallbackData(
      "approve",
      args.proposal,
      signingSecret,
    ),
    message: formatTelegramAdsProposalCard(args.proposal, experiment),
    proposalKey: args.proposal.proposalKey,
    rejectCallbackData: buildTelegramAdsCallbackData(
      "reject",
      args.proposal,
      signingSecret,
    ),
  })
  await markAdsProposalAwaitingTelegramApproval({
    now: args.now,
    proposal: args.proposal,
    supabase: args.supabase,
    telegramMessageId: result.messageId,
  })
  return result
}

function parseCallbackData(value: string): ParsedCallbackData | null {
  const match = CALLBACK_PATTERN.exec(value)
  if (!match) return null
  return {
    decision: match[1] === "a" ? "approve" : "reject",
    proposalKey: match[2],
    signature: match[3],
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function parseCallback(body: unknown): ParsedCallback | null {
  const update = record(body)
  const callback = record(update?.callback_query)
  if (!callback) return null
  const message = record(callback.message)
  const chat = record(message?.chat)
  const from = record(callback.from)
  if (
    !Number.isSafeInteger(update?.update_id)
    || typeof callback.id !== "string"
    || typeof callback.data !== "string"
    || !Number.isSafeInteger(message?.message_id)
    || (
      typeof chat?.id !== "number"
      && typeof chat?.id !== "string"
    )
    || (
      typeof from?.id !== "number"
      && typeof from?.id !== "string"
    )
  ) {
    return null
  }

  const forwarded = (
    "forward_date" in (message ?? {})
    || "forward_from" in (message ?? {})
    || "forward_origin" in (message ?? {})
    || "forward_sender_name" in (message ?? {})
    || message?.is_automatic_forward === true
  )

  return {
    callbackQueryId: callback.id,
    chatId: String(chat?.id),
    data: callback.data,
    forwarded,
    messageId: message?.message_id as number,
    updateId: update?.update_id as number,
    userId: String(from?.id),
  }
}

function hashTelegramValue(secret: string, value: string): string {
  return createHmac("sha256", secret)
    .update(value, "utf8")
    .digest("hex")
}

export async function handleTelegramAdsDecision(args: {
  body: unknown
  envSource?: TelegramAdsEnv
  now?: Date
  repository: TelegramAdsApprovalRepository
}): Promise<TelegramAdsDecisionResult> {
  const env = args.envSource ?? process.env
  const rawBody = record(args.body)
  if (!rawBody?.callback_query) return { ignored: true, ok: true }

  if (env.TELEGRAM_ADS_APPROVALS_ENABLED !== "true") {
    return { ok: false, reason: "approvals_disabled" }
  }
  const approverUserId = env.TELEGRAM_ADS_APPROVER_USER_ID
  if (!approverUserId || !/^\d+$/.test(approverUserId)) {
    return { ok: false, reason: "approver_user_id_missing" }
  }
  const signingSecret = env.TELEGRAM_ADS_APPROVAL_SIGNING_SECRET
  if (!signingSecret || signingSecret.length < 32) {
    return { ok: false, reason: "approval_signing_secret_missing" }
  }
  const configuredChatId = env.TELEGRAM_CHAT_ID
  if (!configuredChatId) {
    return { ok: false, reason: "chat_id_missing" }
  }

  const callback = parseCallback(args.body)
  if (!callback) return { ok: false, reason: "malformed_callback" }
  if (callback.chatId !== configuredChatId) {
    return { ok: false, reason: "chat_mismatch" }
  }
  if (callback.userId !== approverUserId) {
    return { ok: false, reason: "user_mismatch" }
  }
  if (callback.forwarded) {
    return { ok: false, reason: "forwarded_message" }
  }
  if (!callback.data.startsWith("ads:a:") && !callback.data.startsWith("ads:r:")) {
    return { ok: false, reason: "unknown_action" }
  }

  const parsedData = parseCallbackData(callback.data)
  if (!parsedData) return { ok: false, reason: "unknown_action" }
  const proposal = await args.repository.getProposalByKey(
    parsedData.proposalKey,
  )
  if (!proposal) return { ok: false, reason: "proposal_not_found" }
  if (proposal.status !== "awaiting_approval") {
    return { ok: false, reason: "proposal_terminal" }
  }
  if (isAdsProposalExpired(proposal, args.now)) {
    return { ok: false, reason: "proposal_expired" }
  }
  if (proposal.telegramMessageId !== callback.messageId) {
    return { ok: false, reason: "message_mismatch" }
  }
  try {
    assertAdsProposalOperationsUnchanged(proposal)
  } catch {
    return { ok: false, reason: "proposal_changed" }
  }

  const expectedSignature = signTelegramAdsCallback(
    parsedData.decision,
    proposal,
    signingSecret,
  )
  if (!safeEqual(parsedData.signature, expectedSignature)) {
    return { ok: false, reason: "invalid_signature" }
  }

  const decision = await args.repository.compareAndSetDecision({
    actorHash: hashTelegramValue(signingSecret, callback.userId),
    callbackQueryHash: hashTelegramValue(
      signingSecret,
      callback.callbackQueryId,
    ),
    decision: parsedData.decision,
    expectedStatus: "awaiting_approval",
    proposalId: proposal.id,
    telegramMessageId: callback.messageId,
    updateId: callback.updateId,
  })
  if (!decision.consumed) {
    return { ok: false, reason: "decision_already_consumed" }
  }

  return {
    decision: parsedData.decision,
    ok: true,
    proposalKey: proposal.proposalKey,
  }
}

export function createTelegramAdsApprovalRepository(args: {
  supabase: Parameters<typeof getAdsProposalByKey>[0]
}): TelegramAdsApprovalRepository {
  return {
    compareAndSetDecision: (input) =>
      compareAndSetTelegramProposalDecision({
        ...input,
        supabase: args.supabase,
      }),
    getProposalByKey: (proposalKey) =>
      getAdsProposalByKey(args.supabase, proposalKey),
  }
}
