"use server"

import * as Sentry from "@sentry/nextjs"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { updateScriptSent } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import { syncParchmentPrescriptionToPms } from "@/lib/parchment/sync-prescription"
import { type ParchmentWebhookIntakeCandidate,selectParchmentWebhookPrescriberId } from "@/lib/parchment/webhook-matching"
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
  parchmentPatientId,
  intakeId,
  scid,
}: {
  supabase: ReturnType<typeof createServiceRoleClient>
  parchmentPatientId: string
  intakeId: string | null
  scid: string
}): Promise<{
  patientProfileId: string
  intake: ParchmentWebhookIntakeCandidate | null
} | null> {
  if (intakeId) {
    // A retry must retain the exact request/SCID association and its current
    // patient's external link, even when an older partner profile also exists.
    const { data: intake, error } = await supabase
      .from("intakes")
      .select("id, created_at, patient_id, claimed_by, reviewing_doctor_id, reviewed_by, patient:profiles!patient_id!inner(id)")
      .eq("id", intakeId)
      .eq("parchment_reference", scid)
      .eq("patient.parchment_patient_id", parchmentPatientId)
      .eq("patient.role", "patient")
      .is("patient.merged_into_profile_id", null)
      .maybeSingle()

    return !error && intake ? { patientProfileId: intake.patient_id, intake } : null
  }

  const { data: byParchmentId, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("parchment_patient_id", parchmentPatientId)
    .eq("role", "patient")
    .is("merged_into_profile_id", null)
    .limit(2)

  // Historical partner IDs cannot disambiguate duplicate active links or
  // replace a missing current link. Stop for identity recovery in that case.
  return !error && byParchmentId?.length === 1 ? { patientProfileId: byParchmentId[0].id, intake: null } : null
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
    const { data: metadataPrescriber } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", metadataPrescriberProfileId)
      .eq("parchment_user_id", prescriberUserId)
      .in("role", ["doctor", "admin"])
      .maybeSingle()

    if (metadataPrescriber?.id) return metadataPrescriber.id
  }

  // Retry against the current identity link, not a historical profile id from
  // the failure receipt. A removed clinical role or relinked Parchment user
  // must fail closed unless exactly one current prescriber owns the external id.
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

    const patient = await resolvePatientProfileId({
      supabase,
      parchmentPatientId,
      intakeId: failure.intake_id,
      scid,
    })
    if (!patient) {
      return { success: false, error: "Could not verify one patient for this prescription. Check the request and Parchment patient links before retrying." }
    }
    const patientProfileId = patient.patientProfileId

    const prescriberProfileId = await resolvePrescriberProfileId({ supabase, metadata, prescriberUserId })
    if (!prescriberProfileId) {
      return { success: false, error: "Could not match the Parchment prescriber to a linked InstantMed doctor." }
    }
    if (patient.intake && !selectParchmentWebhookPrescriberId(patient.intake, [prescriberProfileId])) {
      return { success: false, error: "The Parchment prescriber does not match this request's reviewing doctor. Verify the request before retrying." }
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
        intakeId: failure.intake_id ?? undefined,
        metadata: {
          action_type: "parchment_webhook_retry",
          failure_audit_id: auditLogId,
          event_id: eventId,
          patient_profile_id: patientProfileId,
          prescriber_profile_id: prescriberProfileId,
          result: "failed",
          reason: result.reason || "prescription_sync_failed",
          scid,
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
        { externalEvidenceAlreadyIssued: true },
      )
      if (!markedScriptSent) {
        await logAuditEvent({
          action: "admin_action",
          actorId: authResult.profile.id,
          actorType: "admin",
          intakeId: failure.intake_id,
          metadata: {
            action_type: "parchment_webhook_retry",
            failure_audit_id: auditLogId,
            event_id: eventId,
            patient_profile_id: patientProfileId,
            prescriber_profile_id: prescriberProfileId,
            result: "failed",
            reason: "script_sent_update_failed",
            scid,
          },
        })
        return { success: false, error: "Prescription synced, but the linked intake could not be marked script sent." }
      }
    }

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      intakeId: failure.intake_id ?? undefined,
      metadata: {
        action_type: "parchment_webhook_retry",
        failure_audit_id: auditLogId,
        event_id: eventId,
        result: "success",
        patient_profile_id: patientProfileId,
        prescriber_profile_id: prescriberProfileId,
        prescription_id: result.prescriptionId,
        marked_script_sent: markedScriptSent,
        scid,
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
