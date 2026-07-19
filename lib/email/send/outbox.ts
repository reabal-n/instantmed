"use server"

/**
 * Email outbox database operations.
 * Two-phase write pattern: create pending row before send, update after.
 */

import { logger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { buildEmailOutboxIdempotencyKey } from "./idempotency"
import { FROZEN_PROVIDER_PAYLOAD_KEY } from "./provider-payload"
import type { OutboxEntry, OutboxRow } from "./types"

export interface CreatePendingOutboxResult {
  id: string | null
  duplicate: boolean
  existingStatus?: string
  providerPayloadEnc?: string
  certificateStorageVersion?: string
}

function providerPayloadEnc(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined
  const value = (metadata as Record<string, unknown>)[FROZEN_PROVIDER_PAYLOAD_KEY]
  return typeof value === "string" ? value : undefined
}

function pendingOutboxResult(
  id: string | null,
  duplicate: boolean,
  metadata?: unknown,
  existingStatus?: unknown,
): CreatePendingOutboxResult {
  const encryptedPayload = providerPayloadEnc(metadata)
  const certificateStorageVersion = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>).certificate_storage_version
    : undefined
  return {
    id,
    duplicate,
    ...(typeof existingStatus === "string" ? { existingStatus } : {}),
    ...(encryptedPayload ? { providerPayloadEnc: encryptedPayload } : {}),
    ...(typeof certificateStorageVersion === "string" && certificateStorageVersion
      ? { certificateStorageVersion }
      : {}),
  }
}

/**
 * How many times a failed idempotent send may be reclaimed for retry before
 * the failed row is treated as terminal (duplicate). Bounds retries of a
 * permanently broken send to a handful of cron cycles.
 */
const MAX_IDEMPOTENT_RECLAIMS = 5

type CreatePendingOutboxEntry = Omit<OutboxEntry, "status"> & {
  initialStatus?: "pending" | "sending"
}

/**
 * Create an outbox row BEFORE attempting to send.
 * This ensures we have a record even if the process crashes mid-send.
 * Immediate sends should start as `sending` so the dispatcher cannot pick up
 * the same row while the provider call is in progress. Deferred sends stay
 * `pending` until their schedule lapses.
 * Stores only an encrypted provider body in metadata. This lets the dispatcher
 * replay the exact request under the same provider idempotency key without
 * exposing email HTML or patient details in plaintext.
 */
export async function createPendingOutbox(entry: CreatePendingOutboxEntry): Promise<CreatePendingOutboxResult> {
  try {
    const supabase = createServiceRoleClient()
    const idempotencyKey = buildEmailOutboxIdempotencyKey(entry)

    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("email_outbox")
        .select("id, status, metadata")
        .eq("idempotency_key", idempotencyKey)
        .limit(1)
        .maybeSingle()

      if (existing) {
        // A FAILED row must not phantom-dedup the retry. For the cron-owned
        // types the dispatcher cannot reconstruct ("Unsupported email_type"
        // quiet-fail), the owning cron's next sendEmail IS the only retry
        // path — treating its failed row as "already sent" permanently drops
        // the email. Reclaim the failed row for this attempt instead. The
        // status filter keeps the reclaim atomic against concurrent senders.
        // reclaim_count lives in metadata (retry_count is a per-send-attempt
        // counter that resets each send) and caps how many cron cycles a
        // permanently broken send can burn before going terminal-duplicate.
        const existingMetadata = (existing.metadata ?? {}) as Record<string, unknown>
        const reclaimCount = typeof existingMetadata.reclaim_count === "number"
          ? existingMetadata.reclaim_count
          : 0
        if (existing.status === "failed" && reclaimCount < MAX_IDEMPOTENT_RECLAIMS) {
          const existingProviderPayload = providerPayloadEnc(existingMetadata)
          const incomingProviderPayload = providerPayloadEnc(entry.metadata)
          const reclaimedMetadata = {
            ...existingMetadata,
            ...(!existingProviderPayload && incomingProviderPayload
              ? { [FROZEN_PROVIDER_PAYLOAD_KEY]: incomingProviderPayload }
              : {}),
            reclaim_count: reclaimCount + 1,
          }
          const { data: reclaimed } = await supabase
            .from("email_outbox")
            .update({
              status: entry.initialStatus ?? "pending",
              last_attempt_at: new Date().toISOString(),
              scheduled_for: entry.scheduled_for ?? null,
              metadata: reclaimedMetadata,
            })
            .eq("id", existing.id)
            .eq("status", "failed")
            .select("id")
            .maybeSingle()

          if (reclaimed) {
            logger.info("[Email] DB idempotency guard: reclaimed failed outbox row for retry", {
              existingId: reclaimed.id,
              emailType: entry.email_type,
            })
            return pendingOutboxResult(reclaimed.id, false, reclaimedMetadata)
          }
          // Reclaim raced a concurrent sender - fall through to duplicate.
        }

        logger.info("[Email] DB idempotency guard: duplicate outbox row skipped", {
          existingId: existing.id,
          emailType: entry.email_type,
        })
        return pendingOutboxResult(
          existing.id,
          true,
          existingMetadata,
          existing.status,
        )
      }
    }

    // Explicit keys define the caller's exact attempt boundary. A different
    // explicit resend inside five minutes is intentional and must not be
    // swallowed by the broader time-window heuristic.
    if (!idempotencyKey) {
      // Idempotency guard: skip if an identical email was created in the last 5 minutes
      // Prevents duplicate outbox rows from double-submissions or race conditions
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      let existingQuery = supabase
        .from("email_outbox")
        .select("id")
        .eq("email_type", entry.email_type)
        .eq("to_email", entry.to_email)
        .gte("created_at", fiveMinAgo)
        .in("status", ["pending", "sent", "sending"])
        .limit(1)

      existingQuery = entry.intake_id
        ? existingQuery.eq("intake_id", entry.intake_id)
        : existingQuery.is("intake_id", null)

      const certificateStorageVersion = entry.metadata?.certificate_storage_version
      if (typeof certificateStorageVersion === "string" && certificateStorageVersion) {
        existingQuery = existingQuery.eq(
          "metadata->>certificate_storage_version",
          certificateStorageVersion,
        )
      }

      const { data: existing } = await existingQuery
        .maybeSingle()

      if (existing) {
        logger.info("[Email] Idempotency guard: duplicate outbox row skipped", {
          existingId: existing.id,
          emailType: entry.email_type,
        })
        return { id: existing.id, duplicate: true }
      }
    }

    const { data, error } = await supabase
      .from("email_outbox")
      .insert({
        email_type: entry.email_type,
        to_email: entry.to_email,
        to_name: entry.to_name,
        subject: entry.subject,
        status: entry.initialStatus ?? "pending",
        provider: entry.provider,
        intake_id: entry.intake_id,
        patient_id: entry.patient_id,
        certificate_id: entry.certificate_id,
        metadata: entry.metadata || {},
        idempotency_key: idempotencyKey,
        last_attempt_at: new Date().toISOString(),
        retry_count: 0,
        scheduled_for: entry.scheduled_for ?? null,
      })
      .select("id")
      .single()

    if (error) {
      if (error.code === "23505" && idempotencyKey) {
        const { data: existing } = await supabase
          .from("email_outbox")
          .select("id, status, metadata")
          .eq("idempotency_key", idempotencyKey)
          .limit(1)
          .maybeSingle()

        if (existing) {
          logger.info("[Email] DB idempotency guard: duplicate insert raced and was suppressed", {
            existingId: existing.id,
            emailType: entry.email_type,
          })
          return pendingOutboxResult(
            existing.id,
            true,
            existing.metadata,
            existing.status,
          )
        }
      }
      logger.error("[Email] Failed to create pending outbox", { error: error.message })
      return { id: null, duplicate: false }
    }
    return pendingOutboxResult(data?.id || null, false, entry.metadata)
  } catch (err) {
    logger.error("[Email] Pending outbox error", { error: err })
    return { id: null, duplicate: false }
  }
}

/**
 * Persist the first reconstructed provider body before a legacy outbox row is
 * sent with a provider idempotency key. Once stored, every later attempt can
 * replay the same bytes instead of regenerating time-varying links or tokens.
 */
export async function persistFrozenProviderPayload(
  outboxId: string,
  metadata: Record<string, unknown> | null | undefined,
  encryptedPayload: string,
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("email_outbox")
      .update({
        metadata: {
          ...(metadata ?? {}),
          [FROZEN_PROVIDER_PAYLOAD_KEY]: encryptedPayload,
        },
      })
      .eq("id", outboxId)
      .eq("status", "sending")
      .select("id")
      .maybeSingle()

    if (error || !data) {
      logger.error("[Email] Failed to freeze legacy provider payload", {
        outboxId,
        error: error?.message,
      })
      return false
    }

    return true
  } catch (error) {
    logger.error("[Email] Legacy provider payload persistence error", {
      outboxId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/**
 * Atomically claim an outbox row for processing.
 * Uses UPDATE with WHERE to prevent duplicate processing by concurrent dispatchers.
 *
 * CONCURRENCY SAFETY:
 * - Only one process can successfully claim a row (atomic UPDATE)
 * - If another cron/admin already claimed it, this returns false
 * - Row is set to 'sending' status during processing
 *
 * Returns: { claimed: true, row } if successfully claimed, { claimed: false } otherwise
 */
export async function claimOutboxRow(outboxId: string): Promise<{
  claimed: boolean
  row?: OutboxRow
  error?: string
}> {
  const supabase = createServiceRoleClient()

  // Atomic claim: UPDATE only if status is still pending/failed
  // This prevents race conditions between concurrent dispatchers
  const { data, error } = await supabase
    .from("email_outbox")
    .update({
      status: "sending",
      last_attempt_at: new Date().toISOString(),
    })
    .in("status", ["pending", "failed"])
    .eq("id", outboxId)
    .select("id, email_type, to_email, to_name, subject, status, provider, provider_message_id, error_message, retry_count, intake_id, patient_id, certificate_id, metadata, created_at, sent_at, last_attempt_at, scheduled_for")
    .single()

  if (error) {
    // Row was already claimed by another process or doesn't exist
    if (error.code === "PGRST116") {
      return { claimed: false, error: "Already claimed or not found" }
    }
    logger.warn("[Email] Failed to claim outbox row", { outboxId, error: error.message })
    return { claimed: false, error: error.message }
  }

  return { claimed: true, row: data as OutboxRow }
}

/**
 * Update an existing outbox row after send attempt.
 */
export async function updateOutboxStatus(
  outboxId: string,
  status: "sent" | "failed" | "skipped_e2e",
  details: {
    provider_message_id?: string
    error_message?: string
    attempts?: number
  }
): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const updateData: Record<string, unknown> = {
      status,
      last_attempt_at: new Date().toISOString(),
    }

    if (status === "sent") {
      updateData.sent_at = new Date().toISOString()
      updateData.provider_message_id = details.provider_message_id
      updateData.error_message = null
    } else if (status === "failed") {
      updateData.error_message = details.error_message
    }

    if (details.attempts !== undefined) {
      updateData.retry_count = details.attempts
    }

    const { error } = await supabase
      .from("email_outbox")
      .update(updateData)
      .eq("id", outboxId)

    if (error) {
      logger.error("[Email] Failed to update outbox status", { outboxId, error: error.message })
    }
  } catch (err) {
    logger.error("[Email] Outbox update error", { outboxId, error: err })
  }
}

/**
 * Release a claimed row for a policy retry without changing its retry budget,
 * idempotency key, or encrypted provider payload.
 */
export async function deferOutboxRow(
  outboxId: string,
  scheduledFor: string,
  reason: string,
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from("email_outbox")
      .update({
        status: "pending",
        scheduled_for: scheduledFor,
        error_message: reason,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", outboxId)
      .eq("status", "sending")

    if (error) {
      logger.error("[Email] Failed to defer outbox row", {
        outboxId,
        error: error.message,
      })
      return false
    }
    return true
  } catch (error) {
    logger.error("[Email] Outbox deferral error", { outboxId, error })
    return false
  }
}

/**
 * Legacy function for immediate status logging (validation failures, E2E mode, dev mode).
 */
export async function logToOutbox(entry: OutboxEntry): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("email_outbox")
      .insert({
        email_type: entry.email_type,
        to_email: entry.to_email,
        to_name: entry.to_name,
        subject: entry.subject,
        status: entry.status,
        provider: entry.provider,
        provider_message_id: entry.provider_message_id,
        error_message: entry.error_message,
        intake_id: entry.intake_id,
        patient_id: entry.patient_id,
        certificate_id: entry.certificate_id,
        metadata: entry.metadata || {},
        idempotency_key: entry.idempotency_key,
        sent_at: entry.sent_at,
        last_attempt_at: entry.last_attempt_at || new Date().toISOString(),
        retry_count: entry.retry_count || 0,
      })
      .select("id")
      .single()

    if (error) {
      logger.error("[Email] Failed to log to outbox", { error: error.message })
      return null
    }
    return data?.id || null
  } catch (err) {
    logger.error("[Email] Outbox logging error", { error: err })
    return null
  }
}
