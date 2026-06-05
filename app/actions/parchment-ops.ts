"use server"

import * as Sentry from "@sentry/nextjs"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { updateScriptSent } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import { syncParchmentPrescriptionToPms } from "@/lib/parchment/sync-prescription"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PARCHMENT_PRESCRIPTION_EVENT = "parchment:prescription.created"
const SCRIPT_COMPLETION_REASONS = new Set(["script_completion_failed", "script_completion_resume_failed"])
const log = createLogger("parchment-ops-actions")

export interface RetryParchmentWebhookFailureActionResult {
  success: boolean
  error?: string
  prescriptionId?: string
  markedScriptSent?: boolean
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

async function resolvePatientProfileId({
  supabase,
  metadata,
  parchmentPatientId,
}: {
  supabase: ReturnType<typeof createServiceRoleClient>
  metadata: Record<string, unknown>
  parchmentPatientId: string
}): Promise<string | null> {
  const metadataPatientProfileId = getMetadataString(metadata, "patient_profile_id")
  if (metadataPatientProfileId && UUID_RE.test(metadataPatientProfileId)) {
    return metadataPatientProfileId
  }

  const { data: byParchmentId } = await supabase
    .from("profiles")
    .select("id")
    .eq("parchment_patient_id", parchmentPatientId)
    .maybeSingle()

  if (byParchmentId?.id) return byParchmentId.id

  const partnerPatientId = getMetadataString(metadata, "partner_patient_id")
  if (!partnerPatientId || !UUID_RE.test(partnerPatientId)) return null

  const { data: byPartnerId } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", partnerPatientId)
    .eq("role", "patient")
    .maybeSingle()

  return byPartnerId?.id ?? null
}

async function resolvePrescriberProfileId({
  supabase,
  metadata,
  prescriberUserId,
}: {
  supabase: ReturnType<typeof createServiceRoleClient>
  metadata: Record<string, unknown>
  prescriberUserId: string
}): Promise<string | null> {
  const metadataPrescriberProfileId = getMetadataString(metadata, "prescriber_profile_id")
  if (metadataPrescriberProfileId && UUID_RE.test(metadataPrescriberProfileId)) {
    return metadataPrescriberProfileId
  }

  const { data: prescribers } = await supabase
    .from("profiles")
    .select("id")
    .eq("parchment_user_id", prescriberUserId)
    .in("role", ["doctor", "admin"])
    .limit(2)

  if (!prescribers || prescribers.length !== 1) return null
  return prescribers[0].id
}

export async function retryParchmentWebhookFailureAction(
  auditLogId: string,
): Promise<RetryParchmentWebhookFailureActionResult> {
  if (!UUID_RE.test(auditLogId)) {
    return { success: false, error: "Invalid audit log." }
  }

  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(`parchment:webhook-retry:${authResult.profile.id}`, "sensitive")
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many Parchment webhook retries. Please wait and try again." }
  }

  const supabase = createServiceRoleClient()

  try {
    const { data: failure } = await supabase
      .from("audit_logs")
      .select("id, action, intake_id, metadata")
      .eq("id", auditLogId)
      .maybeSingle()

    if (!failure || failure.action !== "webhook_failed") {
      return { success: false, error: "Webhook failure audit event not found." }
    }

    const metadata = (failure.metadata || {}) as Record<string, unknown>
    if (getMetadataString(metadata, "eventType") !== PARCHMENT_PRESCRIPTION_EVENT) {
      return { success: false, error: "This is not a Parchment prescription webhook failure." }
    }

    const scid = getMetadataString(metadata, "scid")
    const parchmentPatientId = getMetadataString(metadata, "parchment_patient_id")
    const prescriberUserId = getMetadataString(metadata, "prescriber_user_id")
    const eventId = getMetadataString(metadata, "eventId")
    const reason = getMetadataString(metadata, "error") || "unknown_error"

    if (!scid || !parchmentPatientId || !prescriberUserId) {
      return {
        success: false,
        error: "This failure does not contain enough retry metadata. New failures will include retry context.",
      }
    }

    const patientProfileId = await resolvePatientProfileId({ supabase, metadata, parchmentPatientId })
    if (!patientProfileId) {
      return { success: false, error: "Could not match the Parchment patient to an InstantMed patient profile." }
    }

    const prescriberProfileId = await resolvePrescriberProfileId({ supabase, metadata, prescriberUserId })
    if (!prescriberProfileId) {
      return { success: false, error: "Could not match the Parchment prescriber to a linked InstantMed doctor." }
    }

    const result = await syncParchmentPrescriptionToPms({
      supabase,
      userId: prescriberUserId,
      parchmentPatientId,
      patientProfileId,
      prescriberProfileId,
      intakeId: failure.intake_id,
      scid,
      overwriteNullableLinks: false,
    })

    if (!result.success) {
      await logAuditEvent({
        action: "admin_action",
        actorId: authResult.profile.id,
        actorType: "admin",
        metadata: {
          action_type: "parchment_webhook_retry",
          failure_audit_id: auditLogId,
          event_id: eventId,
          result: "failed",
          reason: result.reason || "prescription_sync_failed",
        },
      })
      return { success: false, error: result.reason || "Could not sync the Parchment prescription." }
    }

    let markedScriptSent = false
    if (failure.intake_id && SCRIPT_COMPLETION_REASONS.has(reason)) {
      markedScriptSent = await updateScriptSent(
        failure.intake_id,
        true,
        `Manual retry from Parchment webhook failure ${auditLogId}`,
        scid,
        prescriberProfileId,
      )
      if (!markedScriptSent) {
        return { success: false, error: "Prescription synced, but the linked intake could not be marked script sent." }
      }
    }

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "parchment_webhook_retry",
        failure_audit_id: auditLogId,
        event_id: eventId,
        result: "success",
        prescription_id: result.prescriptionId,
        marked_script_sent: markedScriptSent,
      },
    })

    revalidateStaff({
      ops: true,
      patientId: patientProfileId,
      intakeId: failure.intake_id ?? undefined,
    })

    return {
      success: true,
      prescriptionId: result.prescriptionId,
      markedScriptSent,
    }
  } catch (error) {
    log.error("Failed to retry Parchment webhook failure", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { context: "parchment_webhook_retry", auditLogId } })
    return { success: false, error: "Could not retry the Parchment webhook failure." }
  }
}
