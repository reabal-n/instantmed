"use server"

/**
 * Email outbox database operations.
 * Two-phase write pattern: create pending row before send, update after.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"
import type { OutboxEntry, OutboxRow } from "./types"

/**
 * Create a pending outbox row BEFORE attempting to send.
 * This ensures we have a record even if the process crashes mid-send.
 * Does NOT store email body - dispatcher will reconstruct from intake/certificate data.
 */
export async function createPendingOutbox(entry: Omit<OutboxEntry, "status">): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient()

    // Idempotency guard: skip if an identical email was created in the last 5 minutes
    // Prevents duplicate outbox rows from double-submissions or race conditions
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from("email_outbox")
      .select("id")
      .eq("email_type", entry.email_type)
      .eq("to_email", entry.to_email)
      .eq("intake_id", entry.intake_id || "")
      .gte("created_at", fiveMinAgo)
      .in("status", ["pending", "sent", "sending"])
      .limit(1)
      .maybeSingle()

    if (existing) {
      logger.info("[Email] Idempotency guard: duplicate outbox row skipped", {
        existingId: existing.id,
        emailType: entry.email_type,
      })
      return existing.id
    }

    const { data, error } = await supabase
      .from("email_outbox")
      .insert({
        email_type: entry.email_type,
        to_email: entry.to_email,
        to_name: entry.to_name,
        subject: entry.subject,
        status: "pending",
        provider: entry.provider,
        intake_id: entry.intake_id,
        patient_id: entry.patient_id,
        certificate_id: entry.certificate_id,
        metadata: entry.metadata || {},
        last_attempt_at: new Date().toISOString(),
        retry_count: 0,
      })
      .select("id")
      .single()

    if (error) {
      logger.error("[Email] Failed to create pending outbox", { error: error.message })
      return null
    }
    return data?.id || null
  } catch (err) {
    logger.error("[Email] Pending outbox error", { error: err })
    return null
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
    .select("id, email_type, to_email, to_name, subject, status, provider, provider_message_id, error_message, retry_count, intake_id, patient_id, certificate_id, metadata, created_at, sent_at, last_attempt_at")
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
