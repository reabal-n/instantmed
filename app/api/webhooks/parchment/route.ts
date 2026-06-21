import * as Sentry from "@sentry/nextjs"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

import { logExternalPrescribingIndicated } from "@/lib/audit/compliance-audit"
import { updateScriptSent } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import { getParchmentEnvironment, verifyWebhookSignature } from "@/lib/parchment/client"
import { syncParchmentPrescriptionToPms } from "@/lib/parchment/sync-prescription"
import { webhookPayloadSchema } from "@/lib/parchment/types"
import { selectParchmentWebhookIntake, selectParchmentWebhookPrescriberId } from "@/lib/parchment/webhook-matching"
import { logAuditEvent, logWebhookFailure } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

// Short-lived Redis dedup key - 60s window catches rapid duplicate deliveries
// before the DB claim write completes. Fails open if Redis is unavailable.
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null

async function acquireWebhookLock(scid: string): Promise<boolean> {
  if (!redis) {
    log.warn("Redis unavailable for webhook dedup - failing open")
    return true
  }
  try {
    // SET NX EX 60 - returns "OK" if set, null if key already exists
    const result = await redis.set(`parchment:lock:${scid}`, "1", { nx: true, ex: 60 })
    return result === "OK"
  } catch (error) {
    log.warn("Redis lock error for webhook dedup - failing open", {
      error: error instanceof Error ? error.message : String(error),
    })
    return true
  }
}

const log = createLogger("parchment-webhook")
const E2E_PARCHMENT_SYNC_SKIPPED_REASON = "e2e_prescription_sync_skipped"

type PrescriptionSyncOutcome = {
  success: boolean
  reason?: string
}

function isE2EParchmentSyncSkip(outcome: PrescriptionSyncOutcome): boolean {
  return outcome.reason === E2E_PARCHMENT_SYNC_SKIPPED_REASON
}

/**
 * Parchment webhook handler.
 *
 * Receives `prescription.created` events when a doctor completes
 * a prescription in the embedded Parchment portal.
 *
 * Flow:
 * 1. Verify HMAC-SHA256 signature (replay protection: 5-min window)
 * 2. Parse and validate payload
 * 3. Match patient and prescriber to the active prescribing intake
 * 4. Record script_sent with the SCID as parchment_reference
 * 5. The doctor completes the separate approval step from InstantMed
 */
// Parchment prescription payloads are tiny JSON (<1KB). Cap at 64KB so a
// flood of oversized bodies with invalid signatures can't chew up memory.
const MAX_BODY_BYTES = 64 * 1024

export async function POST(request: Request) {
  const startTime = Date.now()

  // Reject oversized payloads before reading the body into memory
  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    log.warn("Webhook body exceeds max size", { contentLength })
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  // Read raw body for signature verification
  const rawBody = await request.text()
  if (rawBody.length > MAX_BODY_BYTES) {
    log.warn("Webhook body exceeds max size (post-read)", { bodyLength: rawBody.length })
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  const signatureHeader = request.headers.get("X-Webhook-Signature")

  if (!signatureHeader) {
    log.warn("Missing webhook signature header")
    return NextResponse.json({ error: "Missing signature" }, { status: 401 })
  }

  // Verify signature
  const secret = process.env.PARCHMENT_WEBHOOK_SECRET
  if (!secret) {
    log.error("PARCHMENT_WEBHOOK_SECRET not configured")
    Sentry.captureMessage("PARCHMENT_WEBHOOK_SECRET not configured", "error")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const verification = verifyWebhookSignature(rawBody, signatureHeader, secret)
  if (!verification.valid) {
    log.warn("Webhook signature verification failed", { reason: verification.error })
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // Parse payload
  let payload
  try {
    const json = JSON.parse(rawBody)
    payload = webhookPayloadSchema.parse(json)
  } catch (error) {
    log.error("Invalid webhook payload", {}, error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Only handle prescription.created events - check early to avoid unnecessary validation
  if (payload.event_type !== "prescription.created") {
    log.info("Ignoring webhook event", { eventType: payload.event_type, eventId: payload.event_id })
    return NextResponse.json({ received: true })
  }

  // Validate organization and partner IDs match our configuration
  const expectedOrgId = process.env.PARCHMENT_ORGANIZATION_ID
  const expectedPartnerId = process.env.PARCHMENT_PARTNER_ID
  if (expectedOrgId && payload.organization_id !== expectedOrgId) {
    log.warn("Webhook organization_id mismatch", { expected: expectedOrgId, received: payload.organization_id })
    return NextResponse.json({ error: "Organization mismatch" }, { status: 403 })
  }
  if (expectedPartnerId && payload.partner_id !== expectedPartnerId) {
    log.warn("Webhook partner_id mismatch", { expected: expectedPartnerId, received: payload.partner_id })
    return NextResponse.json({ error: "Partner mismatch" }, { status: 403 })
  }

  // Block all webhook processing when Parchment is configured in sandbox mode.
  // Sandbox environment fires test prescriptions at the production endpoint;
  // none should touch real patient data or generate DLQ noise.
  const { isSandbox: parchmentIsSandbox } = getParchmentEnvironment()
  if (parchmentIsSandbox) {
    log.info("Parchment sandbox mode active; discarding webhook", { eventId: payload.event_id })
    return NextResponse.json({ received: true })
  }

  const { patient_id, partner_patient_id, scid, user_id } = payload.data

  // Defense-in-depth: Parchment sandbox fires test webhooks with a sentinel
  // patient_id even when org/partner IDs match production. Silently ack.
  if (patient_id === "nonexistent-parchment-patient") {
    log.info("Discarding Parchment sandbox test webhook", { eventId: payload.event_id })
    return NextResponse.json({ received: true })
  }

  // Fast-path dedup: Redis lock prevents duplicate processing within 60s.
  // Falls through to DB-level idempotency check on cache miss or Redis error.
  const lockAcquired = await acquireWebhookLock(scid)
  if (!lockAcquired) {
    log.info("Webhook deduplicated via Redis lock", { eventId: payload.event_id })
    return NextResponse.json({ received: true, deduplicated: true })
  }

  log.info("Processing prescription.created webhook", {
    eventId: payload.event_id,
  })

  try {
    const supabase = createServiceRoleClient()

    // Find the patient profile by parchment_patient_id or by profile.id (partner_patient_id)
    let patientProfileId: string | null = null

    // First try parchment_patient_id
    const { data: byParchmentId } = await supabase
      .from("profiles")
      .select("id")
      .eq("parchment_patient_id", patient_id)
      .single()

    if (byParchmentId) {
      patientProfileId = byParchmentId.id
    } else {
      // Fall back to partner_patient_id (which is our profile.id)
      const { data: byPartnerId } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", partner_patient_id)
        .single()

      if (byPartnerId) {
        patientProfileId = byPartnerId.id
      }
    }

    if (!patientProfileId) {
      log.warn("Patient not found for webhook", { eventId: payload.event_id })
      await recordParchmentWebhookMismatch(
        "patient_not_found",
        payload.event_id,
        buildParchmentWebhookFailureMetadata({
          scid,
          parchmentPatientId: patient_id,
          partnerPatientId: partner_patient_id,
          prescriberUserId: user_id,
        }),
        { sentry: false },
      )
      // Return 200 to prevent retries - patient genuinely doesn't exist in our system
      return NextResponse.json({ received: true, warning: "Patient not found" })
    }

    const { data: prescriberProfiles, error: prescriberError } = await supabase
      .from("profiles")
      .select("id")
      .eq("parchment_user_id", user_id)
      .in("role", ["doctor", "admin"])

    if (prescriberError) {
      const msg = prescriberError.message ?? JSON.stringify(prescriberError)
      log.error("Failed to resolve webhook prescriber", { eventId: payload.event_id }, new Error(msg))
      Sentry.captureException(new Error(`Parchment webhook prescriber lookup error: ${msg}`), {
        extra: { eventId: payload.event_id, context: "parchment_webhook_prescriber_lookup" },
      })
      return NextResponse.json({ error: "Failed to resolve prescriber" }, { status: 500 })
    }

    if (!prescriberProfiles || prescriberProfiles.length === 0) {
      log.warn("No linked prescriber found for Parchment webhook", { eventId: payload.event_id })
      await recordParchmentWebhookMismatch(
        "prescriber_not_linked",
        payload.event_id,
        buildParchmentWebhookFailureMetadata({
          scid,
          parchmentPatientId: patient_id,
          partnerPatientId: partner_patient_id,
          prescriberUserId: user_id,
          patientProfileId,
        }),
      )
      return NextResponse.json({ received: true, warning: "Prescriber not linked" })
    }

    if (prescriberProfiles.length > 1) {
      log.warn("Multiple local prescribers share a Parchment user", {
        eventId: payload.event_id,
        linkedProfileCount: prescriberProfiles.length,
      })
    }

    // PostgREST does not support UPDATE + ORDER BY + LIMIT, so we SELECT the
    // target row first, then UPDATE by ID. Only explicit awaiting_script rows
    // are eligible: opening Parchment/manual fallback moves the case there
    // before a webhook can attach SCID evidence.
    const { data: candidates, error: selectError } = await supabase
      .from("intakes")
      .select("id, status, category, subtype, claimed_by, reviewing_doctor_id, reviewed_by, created_at, service:services!service_id(type)")
      .eq("patient_id", patientProfileId)
      .eq("status", "awaiting_script")
      .eq("payment_status", "paid")
      .eq("script_sent", false)
      .is("parchment_reference", null)
      .order("created_at", { ascending: false })
      .limit(10)

    if (selectError) {
      const msg = selectError.message ?? JSON.stringify(selectError)
      log.error("Failed to find claimable intake for webhook", { eventId: payload.event_id }, new Error(msg))
      Sentry.captureException(new Error(`Parchment webhook select error: ${msg}`), {
        extra: { eventId: payload.event_id, context: "parchment_webhook_intake_select" },
      })
      return NextResponse.json({ error: "Failed to find intake" }, { status: 500 })
    }

    const prescriberProfileIds = prescriberProfiles.map((profile) => profile.id)
    const candidate = selectParchmentWebhookIntake(candidates ?? [], prescriberProfileIds)
    const webhookPrescriberId = candidate
      ? selectParchmentWebhookPrescriberId(candidate, prescriberProfileIds)
      : null
    const standalonePrescriberId = prescriberProfileIds.length === 1 ? prescriberProfileIds[0] : null
    let claimed: { id: string; parchment_reference: string | null } | null = null

    if (candidate && webhookPrescriberId) {
      const { data: claimedRow, error: claimError } = await supabase
        .from("intakes")
        .update({
          parchment_reference: scid,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidate.id)
        .eq("patient_id", patientProfileId)
        .eq("status", "awaiting_script")
        .eq("payment_status", "paid")
        .eq("script_sent", false)
        .is("parchment_reference", null)
        .select("id, parchment_reference")
        .maybeSingle()

      if (claimError) {
        const msg = claimError.message ?? JSON.stringify(claimError)
        log.error("Failed to claim intake for webhook", { eventId: payload.event_id }, new Error(msg))
        Sentry.captureException(new Error(`Parchment webhook claim error: ${msg}`), {
          extra: { eventId: payload.event_id, context: "parchment_webhook_intake_claim" },
        })
        return NextResponse.json({ error: "Failed to claim intake" }, { status: 500 })
      }

      claimed = claimedRow
    } else if (candidate) {
      log.warn("Matched Parchment webhook intake without a verified prescriber claim", { eventId: payload.event_id })
    }

    // Include event_id in script_notes for webhook idempotency audit trail
    const scriptNotes = `Webhook event: ${payload.event_id}`

    const syncPrescription = async (
      intakeId: string | null,
      prescriberProfileId: string | null,
    ): Promise<PrescriptionSyncOutcome> => {
      try {
        const result = await syncParchmentPrescriptionToPms({
          supabase,
          userId: user_id,
          parchmentPatientId: patient_id,
          patientProfileId,
          prescriberProfileId,
          intakeId,
          scid,
        })

        if (!result.success) {
          const reason = result.reason || "prescription_sync_failed"
          if (reason === E2E_PARCHMENT_SYNC_SKIPPED_REASON) {
            return { success: false, reason }
          }

          await recordParchmentPrescriptionSyncFailure(
            reason,
            payload.event_id,
            intakeId,
            buildParchmentWebhookFailureMetadata({
              scid,
              parchmentPatientId: patient_id,
              partnerPatientId: partner_patient_id,
              prescriberUserId: user_id,
              patientProfileId,
              prescriberProfileId,
            }),
          )
          return { success: false, reason }
        }

        return { success: true }
      } catch (syncError) {
        log.error(
          "Failed to sync Parchment prescription to PMS",
          { eventId: payload.event_id },
          syncError instanceof Error ? syncError : new Error(String(syncError)),
        )
        await recordParchmentPrescriptionSyncFailure(
          "prescription_sync_failed",
          payload.event_id,
          intakeId,
          buildParchmentWebhookFailureMetadata({
            scid,
            parchmentPatientId: patient_id,
            partnerPatientId: partner_patient_id,
            prescriberUserId: user_id,
            patientProfileId,
            prescriberProfileId,
          }),
        )
        return { success: false, reason: "prescription_sync_failed" }
      }
    }

    // Check if already processed (idempotency) or no intake found
    if (!claimed) {
      // Could be: (a) parchment_reference already set for this SCID, (b) manually marked sent, (c) no active prescribing intake
      const { data: existing } = await supabase
        .from("intakes")
        .select("id, parchment_reference, script_sent, claimed_by, reviewing_doctor_id, reviewed_by, created_at")
        .eq("patient_id", patientProfileId)
        .eq("parchment_reference", scid)
        .maybeSingle()

      if (existing?.script_sent) {
        const existingPrescriberId = selectParchmentWebhookPrescriberId(existing, prescriberProfileIds)
        const existingSync = await syncPrescription(existing.id, existingPrescriberId)
        if (!existingSync.success) {
          await recordParchmentWebhookSuccess({
            actionType: "parchment_webhook_already_processed",
            eventId: payload.event_id,
            intakeId: existing.id,
            partnerPatientId: partner_patient_id,
            parchmentPatientId: patient_id,
            patientProfileId,
            prescriberProfileId: existingPrescriberId,
            prescriberUserId: user_id,
            prescriptionSynced: false,
            scid,
            scriptSent: true,
          })
          if (isE2EParchmentSyncSkip(existingSync)) {
            log.info("Webhook already processed; E2E prescription PMS sync skipped", { eventId: payload.event_id })
            return NextResponse.json({ received: true, syncSkipped: true })
          }
          log.warn("Webhook already processed; prescription PMS sync still pending", { eventId: payload.event_id })
          return NextResponse.json({ received: true, syncPending: true })
        }
        await recordParchmentWebhookSuccess({
          actionType: "parchment_webhook_already_processed",
          eventId: payload.event_id,
          intakeId: existing.id,
          partnerPatientId: partner_patient_id,
          parchmentPatientId: patient_id,
          patientProfileId,
          prescriberProfileId: existingPrescriberId,
          prescriberUserId: user_id,
          prescriptionSynced: true,
          scid,
          scriptSent: true,
        })
        log.info("Webhook already fully processed (idempotent)", { eventId: payload.event_id })
        return NextResponse.json({ received: true })
      }

      if (existing && !existing.script_sent) {
        // Claimed (parchment_reference set) but updateScriptSent failed previously - resume
        log.info("Resuming partially-processed webhook", { eventId: payload.event_id })
        const resumePrescriberId = selectParchmentWebhookPrescriberId(existing, prescriberProfileIds)
        const resumeSync = await syncPrescription(existing.id, resumePrescriberId)
        const resumeSuccess = await updateScriptSent(existing.id, true, scriptNotes, scid, resumePrescriberId ?? undefined)
        if (!resumeSuccess) {
          log.error("Failed to mark script sent (resumed)", { eventId: payload.event_id })
          Sentry.captureMessage("Parchment webhook resume failed", {
            level: "error",
            extra: { eventId: payload.event_id, context: "parchment_webhook_resume" },
          })
          await recordParchmentWebhookProcessingFailure(
            "script_completion_resume_failed",
            payload.event_id,
            existing.id,
            buildParchmentWebhookFailureMetadata({
              scid,
              parchmentPatientId: patient_id,
              partnerPatientId: partner_patient_id,
              prescriberUserId: user_id,
              patientProfileId,
              prescriberProfileId: resumePrescriberId,
            }),
          )
          return NextResponse.json({ error: "Failed to update intake" }, { status: 500 })
        }
        await logWebhookPrescribingBoundary(existing.id, resumePrescriberId, scid, payload.event_id)
        if (!resumeSync.success) {
          await recordParchmentWebhookSuccess({
            actionType: "parchment_webhook_script_sent",
            eventId: payload.event_id,
            intakeId: existing.id,
            partnerPatientId: partner_patient_id,
            parchmentPatientId: patient_id,
            patientProfileId,
            prescriberProfileId: resumePrescriberId,
            prescriberUserId: user_id,
            prescriptionSynced: false,
            scid,
            scriptSent: true,
          })
          if (isE2EParchmentSyncSkip(resumeSync)) {
            log.info("Webhook resumed script completion; E2E prescription PMS sync skipped", { eventId: payload.event_id })
            return NextResponse.json({ received: true, resumed: true, syncSkipped: true })
          }
          log.warn("Webhook resumed script completion; prescription PMS sync still pending", { eventId: payload.event_id })
          return NextResponse.json({ received: true, resumed: true, syncPending: true })
        }
        await recordParchmentWebhookSuccess({
          actionType: "parchment_webhook_script_sent",
          eventId: payload.event_id,
          intakeId: existing.id,
          partnerPatientId: partner_patient_id,
          parchmentPatientId: patient_id,
          patientProfileId,
          prescriberProfileId: resumePrescriberId,
          prescriberUserId: user_id,
          prescriptionSynced: true,
          scid,
          scriptSent: true,
        })
        log.info("Webhook resumed successfully", { eventId: payload.event_id })
        return NextResponse.json({ received: true, resumed: true })
      }

      const standaloneSync = await syncPrescription(null, standalonePrescriberId)
      if (standaloneSync.success) {
        await recordParchmentWebhookSuccess({
          actionType: "parchment_webhook_prescription_synced",
          eventId: payload.event_id,
          intakeId: null,
          partnerPatientId: partner_patient_id,
          parchmentPatientId: patient_id,
          patientProfileId,
          prescriberProfileId: standalonePrescriberId,
          prescriberUserId: user_id,
          prescriptionSynced: true,
          scid,
          scriptSent: false,
        })
        log.info("Standalone Parchment prescription synced to PMS", { eventId: payload.event_id })
        return NextResponse.json({ received: true, syncedPrescription: true })
      }

      if (isE2EParchmentSyncSkip(standaloneSync)) {
        log.info("No matching active prescribing intake found; E2E prescription sync skipped", { eventId: payload.event_id })
        return NextResponse.json({ received: true, syncSkipped: true })
      }

      log.warn("No matching active prescribing intake found and prescription sync failed for webhook", { eventId: payload.event_id })
      await recordParchmentWebhookMismatch(
        "no_awaiting_script_intake",
        payload.event_id,
        buildParchmentWebhookFailureMetadata({
          scid,
          parchmentPatientId: patient_id,
          partnerPatientId: partner_patient_id,
          prescriberUserId: user_id,
          patientProfileId,
          prescriberProfileId: standalonePrescriberId,
        }),
      )
      return NextResponse.json({ received: true, warning: "No active prescribing intake found", syncPending: true })
    }

    const intake = claimed
    const prescriptionSync = await syncPrescription(intake.id, webhookPrescriberId)

    // Record durable script-sent evidence. The doctor still approves the
    // request separately from InstantMed after the webhook refreshes the case.
    const success = await updateScriptSent(intake.id, true, scriptNotes, scid, webhookPrescriberId ?? undefined)

    if (!success) {
      log.error("Failed to mark script sent via webhook", { eventId: payload.event_id })
      Sentry.captureMessage("Parchment updateScriptSent failed", {
        level: "error",
        extra: { eventId: payload.event_id, context: "parchment_webhook_update_script_sent" },
      })
      await recordParchmentWebhookProcessingFailure(
        "script_completion_failed",
        payload.event_id,
        intake.id,
        buildParchmentWebhookFailureMetadata({
          scid,
          parchmentPatientId: patient_id,
          partnerPatientId: partner_patient_id,
          prescriberUserId: user_id,
          patientProfileId,
          prescriberProfileId: webhookPrescriberId,
        }),
      )
      return NextResponse.json({ error: "Failed to update intake" }, { status: 500 })
    }

    await logWebhookPrescribingBoundary(intake.id, webhookPrescriberId, scid, payload.event_id)

    if (!prescriptionSync.success) {
      await recordParchmentWebhookSuccess({
        actionType: "parchment_webhook_script_sent",
        eventId: payload.event_id,
        intakeId: intake.id,
        partnerPatientId: partner_patient_id,
        parchmentPatientId: patient_id,
        patientProfileId,
        prescriberProfileId: webhookPrescriberId,
        prescriberUserId: user_id,
        prescriptionSynced: false,
        scid,
        scriptSent: true,
      })
      if (isE2EParchmentSyncSkip(prescriptionSync)) {
        log.info("Webhook marked script sent; E2E prescription PMS sync skipped", { eventId: payload.event_id })
        return NextResponse.json({ received: true, scriptSent: true, syncSkipped: true })
      }
      log.warn("Webhook marked script sent; prescription PMS sync still pending", { eventId: payload.event_id })
      return NextResponse.json({ received: true, scriptSent: true, syncPending: true })
    }

    const duration = Date.now() - startTime
    await recordParchmentWebhookSuccess({
      actionType: "parchment_webhook_script_sent",
      durationMs: duration,
      eventId: payload.event_id,
      intakeId: intake.id,
      partnerPatientId: partner_patient_id,
      parchmentPatientId: patient_id,
      patientProfileId,
      prescriberProfileId: webhookPrescriberId,
      prescriberUserId: user_id,
      prescriptionSynced: true,
      scid,
      scriptSent: true,
    })
    log.info("Webhook processed successfully", { eventId: payload.event_id, durationMs: duration })

    return NextResponse.json({ received: true })
  } catch (error) {
    log.error("Webhook processing error", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { eventId: payload.event_id, context: "parchment_webhook_unhandled" } })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

async function logWebhookPrescribingBoundary(
  intakeId: string,
  prescriberProfileId: string | null,
  scid: string,
  eventId: string,
) {
  if (!prescriberProfileId) {
    log.warn("Skipping Parchment prescribing boundary audit; no matched prescriber", { eventId })
    return
  }

  try {
    await logExternalPrescribingIndicated(intakeId, "repeat_rx", prescriberProfileId, scid)
  } catch (auditError) {
    log.warn(
      "Failed to log external_prescribing_indicated event for Parchment webhook",
      { eventId },
      auditError instanceof Error ? auditError : undefined,
    )
  }
}

async function recordParchmentWebhookSuccess(input: {
  actionType: "parchment_webhook_script_sent" | "parchment_webhook_prescription_synced" | "parchment_webhook_already_processed"
  eventId: string
  intakeId: string | null
  patientProfileId: string
  parchmentPatientId: string
  partnerPatientId: string
  prescriberUserId: string
  prescriberProfileId: string | null
  scid: string
  prescriptionSynced: boolean
  scriptSent: boolean
  durationMs?: number
}) {
  try {
    await logAuditEvent({
      action: "admin_action",
      actorId: input.prescriberProfileId ?? undefined,
      actorType: "system",
      intakeId: input.intakeId ?? undefined,
      metadata: {
        action_type: input.actionType,
        duration_ms: input.durationMs,
        event_id: input.eventId,
        partner_patient_id: input.partnerPatientId,
        parchment_patient_id: input.parchmentPatientId,
        patient_id: input.patientProfileId,
        prescriber_profile_id: input.prescriberProfileId,
        prescriber_user_id: input.prescriberUserId,
        prescription_synced: input.prescriptionSynced,
        scid: input.scid,
        script_sent: input.scriptSent,
      },
    })
  } catch (auditError) {
    log.warn(
      "Failed to log durable Parchment webhook success audit event",
      { eventId: input.eventId, intakeId: input.intakeId },
      auditError instanceof Error ? auditError : undefined,
    )
  }
}

interface ParchmentWebhookFailureMetadataInput {
  scid: string
  parchmentPatientId: string
  partnerPatientId: string
  prescriberUserId: string
  patientProfileId?: string | null
  prescriberProfileId?: string | null
}

function buildParchmentWebhookFailureMetadata(input: ParchmentWebhookFailureMetadataInput): Record<string, unknown> {
  return {
    scid: input.scid,
    parchment_patient_id: input.parchmentPatientId,
    partner_patient_id: input.partnerPatientId,
    patient_id: input.patientProfileId ?? input.partnerPatientId,
    prescriber_user_id: input.prescriberUserId,
    ...(input.patientProfileId ? { patient_profile_id: input.patientProfileId } : {}),
    ...(input.prescriberProfileId ? { prescriber_profile_id: input.prescriberProfileId } : {}),
  }
}

async function recordParchmentWebhookMismatch(
  reason: string,
  eventId: string,
  metadata: Record<string, unknown> = {},
  opts: { sentry?: boolean } = {},
) {
  // patient_not_found = no InstantMed profile matched by construction. The same
  // Parchment login is used for the doctor's non-InstantMed prescribing, so these
  // are external scripts (live-verified: 0/132 matched an InstantMed patient), not
  // InstantMed failures — that call site passes { sentry: false } to keep the
  // durable audit row without paging ~130 noise warnings/month. Every other reason
  // (prescriber_not_linked, no_awaiting_script_intake, ...) keeps its warning.
  if (opts.sentry !== false) {
    Sentry.captureMessage("Parchment webhook could not match prescription.created to an intake", {
      level: "warning",
      tags: {
        source: "parchment-webhook",
        unmatched_reason: reason,
      },
      extra: { eventId },
    })
  }

  try {
    await logWebhookFailure(eventId, "parchment:prescription.created", null, reason, metadata)
  } catch (auditError) {
    log.warn(
      "Failed to log durable Parchment webhook mismatch audit event",
      { eventId },
      auditError instanceof Error ? auditError : undefined,
    )
  }
}

async function recordParchmentWebhookProcessingFailure(
  reason: string,
  eventId: string,
  intakeId: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await logWebhookFailure(eventId, "parchment:prescription.created", intakeId, reason, metadata)
  } catch (auditError) {
    log.warn(
      "Failed to log durable Parchment webhook processing failure",
      { eventId, intakeId },
      auditError instanceof Error ? auditError : undefined,
    )
  }
}

async function recordParchmentPrescriptionSyncFailure(
  reason: string,
  eventId: string,
  intakeId: string | null,
  metadata: Record<string, unknown> = {},
) {
  Sentry.captureMessage("Parchment prescription could not be synced to PMS", {
    level: "warning",
    tags: {
      source: "parchment-webhook",
      unmatched_reason: reason,
    },
    extra: { eventId },
  })

  try {
    await logWebhookFailure(eventId, "parchment:prescription.created", intakeId, reason, metadata)
  } catch (auditError) {
    log.warn(
      "Failed to log durable Parchment prescription sync failure",
      { eventId, intakeId },
      auditError instanceof Error ? auditError : undefined,
    )
  }
}
