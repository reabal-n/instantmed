import "server-only"

import { getAppUrl } from "@/lib/config/env"
import { isLikelyTestPatientIdentity } from "@/lib/data/seeded-e2e-data"
import { buildPartialIntakeRecoveryUrl } from "@/lib/email/recovery-links"
import { isValidEmail } from "@/lib/email/send/helpers"
import type { ResendProviderPayload } from "@/lib/email/send/provider-payload"
import type { EmailSuppressionDecision } from "@/lib/email/suppression"
import { getEmailSuppressionDecisions } from "@/lib/email/suppression"
import type { EmailBounceSuppressionDecision } from "@/lib/email/utils"
import { getEmailBounceSuppressionDecision } from "@/lib/email/utils"
import { createLogger } from "@/lib/observability/logger"
import { isValidDraftSessionId } from "@/lib/request/draft-resume-route"
import type { ServerDraftRecord } from "@/lib/request/server-draft"
import { getServerDraftRecoveryDecision } from "@/lib/request/server-draft-recovery"
import {
  decryptJSONB,
  type EncryptedPHI,
} from "@/lib/security/phi-encryption"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("partial-intake-recovery-policy")

export const PARTIAL_RECOVERY_MIN_IDLE_MINUTES = 60
export const PARTIAL_RECOVERY_MAX_IDLE_HOURS = 6

export interface PartialIntakeRecoveryPolicyDraft {
  recoveryTrackingId: string
  sessionId: string
  serviceType: string
  email: string
  firstName: string | null
  updatedAt: string
  expiresAt: string
  resumeUrl: string
}

export type PartialIntakeRecoveryPolicyDecision =
  | { kind: "allowed"; draft: PartialIntakeRecoveryPolicyDraft }
  | { kind: "policy_suppressed"; reason: string }
  | { kind: "transiently_blocked"; reason: string; retryAt?: string }

export type PartialIntakeRecoveryTrackingDecision =
  | { kind: "resolved"; recoveryTrackingId: string; legacyMapped: boolean }
  | { kind: "policy_suppressed"; reason: string }
  | { kind: "transiently_blocked"; reason: string; retryAt?: string }

interface RawPartialIntakeRecoveryDraft {
  recovery_tracking_id: string
  session_id: string
  service_type: string
  current_step_id: string | null
  email: string | null
  first_name: string | null
  updated_at: string
  expires_at: string
  converted_to_intake_id: string | null
  recovery_email_sent_at: string | null
  recovery_email_suppressed_at: string | null
  answers: Record<string, unknown> | null
  answers_encrypted: EncryptedPHI | null
}

export interface EvaluatePartialIntakeRecoveryPolicyInput {
  recoveryTrackingId: string
  expectedRecipient: string
  mode: "initial" | "dispatcher"
  expectedUpdatedAt?: string
  now?: Date
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase()
}

function retryAtAfter(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function transient(
  reason: string,
  retryAt?: string,
): Extract<
  PartialIntakeRecoveryPolicyDecision,
  { kind: "transiently_blocked" }
> {
  return {
    kind: "transiently_blocked",
    reason,
    ...(retryAt ? { retryAt } : {}),
  }
}

function suppressed(
  reason: string,
): Extract<
  PartialIntakeRecoveryPolicyDecision,
  { kind: "policy_suppressed" }
> {
  return { kind: "policy_suppressed", reason }
}

function isEncryptedPHI(value: unknown): value is EncryptedPHI {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false

  const candidate = value as Partial<EncryptedPHI>
  return (
    typeof candidate.ciphertext === "string" &&
    typeof candidate.encryptedDataKey === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.authTag === "string" &&
    typeof candidate.keyId === "string" &&
    typeof candidate.version === "number"
  )
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function idleWindowDecision(input: {
  mode: "initial" | "dispatcher"
  now: Date
  updatedAt: string
}): PartialIntakeRecoveryPolicyDecision | null {
  const updatedAtMs = new Date(input.updatedAt).getTime()
  if (!Number.isFinite(updatedAtMs)) {
    return suppressed("draft_timestamp_invalid")
  }

  const minimumIdleAt =
    updatedAtMs + PARTIAL_RECOVERY_MIN_IDLE_MINUTES * 60 * 1000
  if (input.now.getTime() < minimumIdleAt) {
    return transient(
      "draft_still_active",
      new Date(minimumIdleAt).toISOString(),
    )
  }

  // A row already queued inside the initial six-hour window remains retryable
  // until its draft expires. The dispatcher must still enforce the minimum
  // idle period so a patient who returned in the meantime is not interrupted.
  if (
    input.mode === "initial" &&
    input.now.getTime() - updatedAtMs >
      PARTIAL_RECOVERY_MAX_IDLE_HOURS * 60 * 60 * 1000
  ) {
    return suppressed("recovery_window_expired")
  }

  return null
}

async function resolveDraftRoute(
  draft: RawPartialIntakeRecoveryDraft,
  now: Date,
): Promise<
  | {
      kind: "allowed"
      subtype: "ed" | "hair_loss" | "womens_health" | null
    }
  | Extract<
      PartialIntakeRecoveryPolicyDecision,
      { kind: "policy_suppressed" | "transiently_blocked" }
    >
> {
  let answers: Record<string, unknown>
  if (draft.answers_encrypted !== null) {
    if (!isEncryptedPHI(draft.answers_encrypted)) {
      return transient("draft_decrypt_failed")
    }
    try {
      answers = await decryptJSONB<Record<string, unknown>>(
        draft.answers_encrypted,
      )
    } catch (error) {
      logger.warn("Partial recovery draft could not be decrypted", {
        error: error instanceof Error ? error.message : String(error),
      })
      return transient("draft_decrypt_failed")
    }
  } else if (isPlainRecord(draft.answers)) {
    // Legacy drafts may still be alive during the seven-day expiry window.
    answers = draft.answers
  } else {
    return suppressed("draft_not_resumable")
  }

  const routeService = draft.service_type === "prescription"
    ? "repeat-script"
    : draft.service_type
  const routeSubtype = typeof answers.consultSubtype === "string"
    ? answers.consultSubtype
    : null
  const recoveryDecision = getServerDraftRecoveryDecision({
    draft: {
      sessionId: draft.session_id,
      serviceType: draft.service_type as ServerDraftRecord["serviceType"],
      currentStepId: draft.current_step_id,
      answers,
      identity: {
        email: draft.email,
        firstName: draft.first_name,
        lastName: null,
        phone: null,
        dob: null,
      },
      updatedAt: draft.updated_at,
      expiresAt: draft.expires_at,
    },
    initialService: routeService,
    initialSubtype: routeSubtype,
    now: now.getTime(),
  })

  if (!recoveryDecision.ok) {
    return suppressed("draft_not_resumable")
  }

  const subtype = recoveryDecision.consultSubtype
  if (subtype === undefined) {
    return { kind: "allowed", subtype: null }
  }
  if (
    !["ed", "hair_loss", "womens_health"].includes(subtype)
  ) {
    return suppressed("draft_not_resumable")
  }

  return {
    kind: "allowed",
    subtype: subtype as "ed" | "hair_loss" | "womens_health",
  }
}

function suppressionDecision(input: {
  address: EmailSuppressionDecision
  bounce: EmailBounceSuppressionDecision
}): PartialIntakeRecoveryPolicyDecision | null {
  if (input.bounce.kind === "policy_suppressed") {
    return suppressed("address_bounced_or_complained")
  }
  if (input.address.kind === "policy_suppressed") {
    return suppressed("address_suppressed")
  }
  if (input.bounce.kind === "transiently_blocked") {
    return transient("bounce_lookup_or_soft_bounce")
  }
  if (input.address.kind === "transiently_blocked") {
    return transient("address_suppression_read_failed")
  }
  return null
}

/**
 * Re-read all authoritative state used by a partial-intake recovery immediately
 * before provider delivery. Read/decrypt failures stay retryable; facts that
 * make delivery permanently inappropriate are terminal policy suppressions.
 */
export async function evaluatePartialIntakeRecoveryPolicy(
  input: EvaluatePartialIntakeRecoveryPolicyInput,
): Promise<PartialIntakeRecoveryPolicyDecision> {
  try {
    return await evaluatePartialIntakeRecoveryPolicyUnchecked(input)
  } catch (error) {
    logger.warn("Partial recovery policy recheck failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return transient("policy_recheck_failed")
  }
}

async function evaluatePartialIntakeRecoveryPolicyUnchecked(
  input: EvaluatePartialIntakeRecoveryPolicyInput,
): Promise<PartialIntakeRecoveryPolicyDecision> {
  const now = input.now ?? new Date()
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("partial_intakes")
    .select(`
      recovery_tracking_id,
      session_id,
      service_type,
      current_step_id,
      email,
      first_name,
      updated_at,
      expires_at,
      converted_to_intake_id,
      recovery_email_sent_at,
      recovery_email_suppressed_at,
      answers,
      answers_encrypted
    `)
    .eq("recovery_tracking_id", input.recoveryTrackingId)
    .maybeSingle()

  if (error) return transient("draft_read_failed")
  if (!data) return suppressed("draft_missing")

  const draft = data as RawPartialIntakeRecoveryDraft
  if (draft.recovery_email_sent_at || draft.recovery_email_suppressed_at) {
    return suppressed("recovery_already_handled")
  }
  if (draft.converted_to_intake_id) return suppressed("draft_converted")

  const expiresAtMs = new Date(draft.expires_at).getTime()
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now.getTime()) {
    return suppressed("draft_expired")
  }
  if (!draft.email || !isValidEmail(draft.email)) {
    return suppressed("missing_or_invalid_recipient")
  }
  if (
    normalizedEmail(draft.email) !== normalizedEmail(input.expectedRecipient)
  ) {
    return suppressed("recipient_changed")
  }
  if (
    isLikelyTestPatientIdentity({
      email: draft.email,
      fullName: draft.first_name,
    })
  ) {
    return suppressed("test_identity")
  }

  if (
    input.mode === "initial" &&
    input.expectedUpdatedAt &&
    draft.updated_at !== input.expectedUpdatedAt
  ) {
    return transient("draft_snapshot_changed")
  }

  const windowDecision = idleWindowDecision({
    mode: input.mode,
    now,
    updatedAt: draft.updated_at,
  })
  if (windowDecision) return windowDecision

  const subtypeDecision = await resolveDraftRoute(draft, now)
  if (subtypeDecision.kind !== "allowed") return subtypeDecision

  const resumeUrl = buildPartialIntakeRecoveryUrl({
    appUrl: getAppUrl(),
    draft: {
      consultSubtype: subtypeDecision.subtype,
      serviceType: draft.service_type,
      sessionId: draft.session_id,
    },
  })
  if (!resumeUrl) return suppressed("draft_not_resumable")

  const [bounce, addressDecisions] = await Promise.all([
    getEmailBounceSuppressionDecision(draft.email),
    getEmailSuppressionDecisions([draft.email]),
  ])
  const address = addressDecisions.get(normalizedEmail(draft.email)) ?? {
    kind: "transiently_blocked" as const,
  }
  const deliveryDecision = suppressionDecision({ address, bounce })
  if (deliveryDecision) return deliveryDecision

  return {
    kind: "allowed",
    draft: {
      recoveryTrackingId: draft.recovery_tracking_id,
      sessionId: draft.session_id,
      serviceType: draft.service_type,
      email: draft.email,
      firstName: draft.first_name,
      updatedAt: draft.updated_at,
      expiresAt: draft.expires_at,
      resumeUrl,
    },
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#0*38;/gi, "&")
    .replace(/&#x0*26;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*34;/gi, '"')
    .replace(/&#x0*22;/gi, '"')
}

function canonicalUrl(value: string): string | null {
  try {
    return new URL(value).toString()
  } catch {
    return null
  }
}

function urlsIn(value: unknown): string[] {
  if (typeof value !== "string") return []
  return (value.match(/https?:\/\/[^\s"'<>]+/gi) ?? [])
    .map((url) => url.replace(/[),.;]+$/g, ""))
    .map(canonicalUrl)
    .filter((url): url is string => Boolean(url))
}

function htmlLinkUrls(value: unknown): string[] {
  if (typeof value !== "string") return []
  const source = decodeHtmlEntities(value)
  return Array.from(
    source.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi),
    (match) => canonicalUrl(match[2]),
  ).filter((url): url is string => Boolean(url))
}

function draftBearerUrls(urls: string[]): string[] {
  return urls.filter((candidate) => {
    try {
      const url = new URL(candidate)
      return isValidDraftSessionId(url.searchParams.get("d"))
    } catch {
      return false
    }
  })
}

function payloadTargetsRecipient(
  payload: ResendProviderPayload,
  expectedRecipient: string,
): boolean {
  const expected = normalizedEmail(expectedRecipient)
  return (
    Array.isArray(payload.to) &&
    payload.to.length === 1 &&
    typeof payload.to[0] === "string" &&
    normalizedEmail(payload.to[0]) === expected
  )
}

/**
 * The frozen body is the only persisted bearer context. Both MIME variants
 * must contain the exact current authoritative URL, and the frozen recipient
 * must still match the authoritative draft recipient.
 */
export function validatePartialIntakeRecoveryProviderPayload(
  payload: ResendProviderPayload,
  draft: Pick<PartialIntakeRecoveryPolicyDraft, "email" | "resumeUrl">,
):
  | { kind: "allowed" }
  | { kind: "policy_suppressed"; reason: string } {
  if (!payloadTargetsRecipient(payload, draft.email)) {
    return {
      kind: "policy_suppressed",
      reason: "recovery_payload_recipient_changed",
    }
  }

  const expectedUrl = canonicalUrl(draft.resumeUrl)
  const htmlLinkBearers = draftBearerUrls(htmlLinkUrls(payload.html))
  const htmlBearers = draftBearerUrls(
    urlsIn(
      typeof payload.html === "string"
        ? decodeHtmlEntities(payload.html)
        : payload.html,
    ),
  )
  const textBearers = draftBearerUrls(urlsIn(payload.text))
  if (
    !expectedUrl ||
    htmlLinkBearers.length === 0 ||
    textBearers.length === 0 ||
    htmlLinkBearers.some((url) => url !== expectedUrl) ||
    htmlBearers.some((url) => url !== expectedUrl) ||
    textBearers.some((url) => url !== expectedUrl)
  ) {
    return {
      kind: "policy_suppressed",
      reason: "recovery_payload_route_changed",
    }
  }

  return { kind: "allowed" }
}

function legacyResumeUrl(payload: ResendProviderPayload): string | null {
  const htmlUrls = htmlLinkUrls(payload.html)
  const textUrls = new Set(urlsIn(payload.text))
  return htmlUrls.find((candidate) => {
    if (!textUrls.has(candidate)) return false
    try {
      const url = new URL(candidate)
      return (
        url.pathname === "/request" &&
        url.searchParams.get("utm_campaign") === "partial_intake_recovery" &&
        isValidDraftSessionId(url.searchParams.get("d"))
      )
    } catch {
      return false
    }
  }) ?? null
}

/**
 * Frozen rows created before recovery_tracking_id can be mapped once from the
 * bearer URL inside their encrypted body. The bearer is never logged or copied
 * into plaintext metadata; only the non-bearer tracking ID is returned.
 */
export async function resolvePartialIntakeRecoveryTrackingId(input: {
  recoveryTrackingId?: string | null
  expectedRecipient: string
  providerPayload: ResendProviderPayload
}): Promise<PartialIntakeRecoveryTrackingDecision> {
  try {
    return await resolvePartialIntakeRecoveryTrackingIdUnchecked(input)
  } catch (error) {
    logger.warn("Inherited partial recovery mapping failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      kind: "transiently_blocked",
      reason: "legacy_recovery_mapping_read_failed",
      retryAt: retryAtAfter(5),
    }
  }
}

async function resolvePartialIntakeRecoveryTrackingIdUnchecked(input: {
  recoveryTrackingId?: string | null
  expectedRecipient: string
  providerPayload: ResendProviderPayload
}): Promise<PartialIntakeRecoveryTrackingDecision> {
  if (input.recoveryTrackingId) {
    return {
      kind: "resolved",
      recoveryTrackingId: input.recoveryTrackingId,
      legacyMapped: false,
    }
  }
  if (!payloadTargetsRecipient(input.providerPayload, input.expectedRecipient)) {
    return {
      kind: "policy_suppressed",
      reason: "recovery_payload_recipient_changed",
    }
  }

  const resumeUrl = legacyResumeUrl(input.providerPayload)
  if (!resumeUrl) {
    return {
      kind: "policy_suppressed",
      reason: "recovery_tracking_missing",
    }
  }
  const sessionId = new URL(resumeUrl).searchParams.get("d")
  if (!isValidDraftSessionId(sessionId)) {
    return {
      kind: "policy_suppressed",
      reason: "recovery_tracking_missing",
    }
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("partial_intakes")
    .select("recovery_tracking_id")
    .eq("session_id", sessionId)
    .eq("email", input.expectedRecipient)
    .maybeSingle()

  if (error) {
    return {
      kind: "transiently_blocked",
      reason: "legacy_recovery_mapping_read_failed",
      retryAt: retryAtAfter(5),
    }
  }
  if (!data || typeof data.recovery_tracking_id !== "string") {
    return {
      kind: "policy_suppressed",
      reason: "legacy_recovery_mapping_missing",
    }
  }

  return {
    kind: "resolved",
    recoveryTrackingId: data.recovery_tracking_id,
    legacyMapped: true,
  }
}
