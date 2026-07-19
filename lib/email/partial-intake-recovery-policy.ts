import "server-only"

import * as Sentry from "@sentry/nextjs"

import { getAppUrl } from "@/lib/config/env"
import { buildPartialIntakeRecoveryUrl } from "@/lib/email/recovery-links"
import type { CommunicationOutcome } from "@/lib/email/send/types"
import type { EmailSuppressionDecision } from "@/lib/email/suppression"
import { getEmailSuppressionDecisions } from "@/lib/email/suppression"
import type { EmailBounceSuppressionDecision } from "@/lib/email/utils"
import { getEmailBounceSuppressionDecision } from "@/lib/email/utils"
import { createLogger } from "@/lib/observability/logger"
import { decryptJSONB, type EncryptedPHI } from "@/lib/security/phi-encryption"
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

type RawPartialIntakeRecoveryDraft = {
  recovery_tracking_id: string
  session_id: string
  service_type: string
  email: string | null
  first_name: string | null
  updated_at: string
  expires_at: string
  converted_to_intake_id: string | null
  recovery_email_sent_at: string | null
  recovery_email_suppressed_at: string | null
  answers_encrypted: EncryptedPHI | null
}

type InitialPolicyInput = {
  recoveryTrackingId: string
  expectedRecipient: string
  expectedUpdatedAt: string
  mode: "initial"
  now?: Date
}

type DispatcherPolicyInput = {
  recoveryTrackingId: string
  expectedRecipient: string
  mode: "dispatcher"
  now?: Date
}

function transient(
  reason: string,
): Extract<
  PartialIntakeRecoveryPolicyDecision,
  { kind: "transiently_blocked" }
> {
  return { kind: "transiently_blocked", reason }
}

function suppressed(
  reason: string,
): Extract<
  PartialIntakeRecoveryPolicyDecision,
  { kind: "policy_suppressed" }
> {
  return { kind: "policy_suppressed", reason }
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isExpired(expiresAt: string, now: Date): boolean {
  const expiresAtMs = new Date(expiresAt).getTime()
  return !Number.isFinite(expiresAtMs) || expiresAtMs <= now.getTime()
}

function initialWindowDecision(
  updatedAt: string,
  now: Date,
): PartialIntakeRecoveryPolicyDecision | null {
  const updatedAtMs = new Date(updatedAt).getTime()
  if (!Number.isFinite(updatedAtMs)) return suppressed("draft_timestamp_invalid")

  const ageMs = now.getTime() - updatedAtMs
  if (ageMs < PARTIAL_RECOVERY_MIN_IDLE_MINUTES * 60 * 1000) {
    return transient("draft_still_active")
  }
  if (ageMs > PARTIAL_RECOVERY_MAX_IDLE_HOURS * 60 * 60 * 1000) {
    return suppressed("recovery_window_expired")
  }
  return null
}

async function resolveConsultSubtype(
  draft: RawPartialIntakeRecoveryDraft,
): Promise<
  | { kind: "allowed"; subtype: "ed" | "hair_loss" | "womens_health" | null }
  | { kind: "policy_suppressed"; reason: string }
  | { kind: "transiently_blocked"; reason: string }
> {
  if (draft.service_type !== "consult") {
    return { kind: "allowed", subtype: null }
  }
  if (!draft.answers_encrypted) {
    return { kind: "policy_suppressed", reason: "draft_not_resumable" }
  }

  try {
    const answers = await decryptJSONB<Record<string, unknown>>(
      draft.answers_encrypted,
    )
    const subtype = answers.consultSubtype
    if (
      subtype === "ed" ||
      subtype === "hair_loss" ||
      subtype === "womens_health"
    ) {
      return { kind: "allowed", subtype }
    }
    return { kind: "policy_suppressed", reason: "draft_not_resumable" }
  } catch (error) {
    logger.warn("Partial recovery draft could not be decrypted", {
      error: error instanceof Error ? error.message : String(error),
    })
    return { kind: "transiently_blocked", reason: "draft_decrypt_failed" }
  }
}

function classifySuppression(input: {
  addressDecision: EmailSuppressionDecision
  bounceDecision: EmailBounceSuppressionDecision
}): PartialIntakeRecoveryPolicyDecision | null {
  if (input.bounceDecision.kind === "policy_suppressed") {
    return suppressed("address_bounced_or_complained")
  }
  if (input.bounceDecision.kind === "transiently_blocked") {
    return transient("bounce_lookup_or_soft_bounce")
  }
  if (input.addressDecision.kind === "policy_suppressed") {
    return suppressed("address_suppressed")
  }
  if (input.addressDecision.kind === "transiently_blocked") {
    return transient("address_suppression_read_failed")
  }
  return null
}

export async function evaluatePartialIntakeRecoveryPolicy(
  input: InitialPolicyInput | DispatcherPolicyInput,
): Promise<PartialIntakeRecoveryPolicyDecision> {
  const now = input.now ?? new Date()
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("partial_intakes")
    .select(`
      recovery_tracking_id,
      session_id,
      service_type,
      email,
      first_name,
      updated_at,
      expires_at,
      converted_to_intake_id,
      recovery_email_sent_at,
      recovery_email_suppressed_at,
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
  if (isExpired(draft.expires_at, now)) return suppressed("draft_expired")
  if (!draft.email) return suppressed("missing_recipient")
  if (normalizedEmail(draft.email) !== normalizedEmail(input.expectedRecipient)) {
    return suppressed("recipient_changed")
  }

  if (input.mode === "initial") {
    if (draft.updated_at !== input.expectedUpdatedAt) {
      return transient("draft_snapshot_changed")
    }
    const windowDecision = initialWindowDecision(draft.updated_at, now)
    if (windowDecision) return windowDecision
  }

  const subtypeDecision = await resolveConsultSubtype(draft)
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

  const [bounceDecision, addressDecisions] = await Promise.all([
    getEmailBounceSuppressionDecision(draft.email),
    getEmailSuppressionDecisions([draft.email]),
  ])
  const addressDecision = addressDecisions.get(normalizedEmail(draft.email)) ??
    { kind: "transiently_blocked" as const }
  const suppressionDecision = classifySuppression({
    addressDecision,
    bounceDecision,
  })
  if (suppressionDecision) return suppressionDecision

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

export async function markPartialIntakeRecoveryCommunicationOutcome(
  recoveryTrackingId: string,
  outcome: CommunicationOutcome,
): Promise<CommunicationOutcome> {
  if (outcome.kind !== "sent" && outcome.kind !== "policy_suppressed") {
    return outcome
  }

  const marker = outcome.kind === "sent"
    ? "recovery_email_sent_at"
    : "recovery_email_suppressed_at"
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("partial_intakes")
    .update({ [marker]: new Date().toISOString() })
    .eq("recovery_tracking_id", recoveryTrackingId)
    .is("recovery_email_sent_at", null)
    .is("recovery_email_suppressed_at", null)
    .select("recovery_tracking_id")
    .maybeSingle()

  if (error) {
    logger.error("Partial recovery marker write failed", {
      recoveryTrackingId,
      outcome: outcome.kind,
      error: error.message,
    })
    return transient("recovery_marker_write_failed")
  }
  if (data) return outcome

  const { data: current, error: readError } = await supabase
    .from("partial_intakes")
    .select(`
      recovery_tracking_id,
      recovery_email_sent_at,
      recovery_email_suppressed_at
    `)
    .eq("recovery_tracking_id", recoveryTrackingId)
    .maybeSingle()

  if (readError) {
    logger.error("Partial recovery marker reconciliation read failed", {
      recoveryTrackingId,
      outcome: outcome.kind,
      error: readError.message,
    })
    return transient("recovery_marker_write_failed")
  }
  if (!current) {
    logger.error("Partial recovery marker target disappeared", {
      recoveryTrackingId,
      outcome: outcome.kind,
    })
    Sentry.captureMessage("Partial recovery marker target disappeared", {
      level: "error",
      tags: { subsystem: "partial-intake-recovery" },
      extra: { recoveryTrackingId, outcome: outcome.kind },
    })
    return transient("recovery_marker_write_failed")
  }

  const targetAlreadyWritten = outcome.kind === "sent"
    ? Boolean(current.recovery_email_sent_at)
    : Boolean(current.recovery_email_suppressed_at)
  if (targetAlreadyWritten) return outcome

  const oppositeMarkerWritten = outcome.kind === "sent"
    ? Boolean(current.recovery_email_suppressed_at)
    : Boolean(current.recovery_email_sent_at)
  if (oppositeMarkerWritten) {
    if (
      outcome.kind === "policy_suppressed" &&
      outcome.reason === "recovery_already_handled"
    ) {
      return outcome
    }
    logger.error("Partial recovery marker invariant conflict", {
      recoveryTrackingId,
      outcome: outcome.kind,
    })
    Sentry.captureMessage("Partial recovery marker invariant conflict", {
      level: "error",
      tags: { subsystem: "partial-intake-recovery" },
      extra: { recoveryTrackingId, outcome: outcome.kind },
    })
    return transient("recovery_marker_invariant_conflict")
  }

  return transient("recovery_marker_write_failed")
}
