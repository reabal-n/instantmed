import * as Sentry from "@sentry/nextjs"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

import { updateScriptSent } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import { verifyWebhookSignature } from "@/lib/parchment/client"
import { webhookPayloadSchema } from "@/lib/parchment/types"
import { selectParchmentWebhookIntake } from "@/lib/parchment/webhook-matching"
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

/**
 * Parchment webhook handler.
 *
 * Receives `prescription.created` events when a doctor completes
 * a prescription in the embedded Parchment portal.
 *
 * Flow:
 * 1. Verify HMAC-SHA256 signature (replay protection: 5-min window)
 * 2. Parse and validate payload
 * 3. Match patient → find their most recent `awaiting_script` intake
 * 4. Auto-mark script sent with the SCID as parchment_reference
 * 5. Patient email notification is triggered by updateScriptSent → markScriptSentAction
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

  const { patient_id, partner_patient_id, scid, user_id } = payload.data

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
      return NextResponse.json({ received: true, warning: "Prescriber not linked" })
    }

    if (prescriberProfiles.length > 1) {
      log.warn("Multiple local prescribers share a Parchment user", {
        eventId: payload.event_id,
        linkedProfileCount: prescriberProfiles.length,
      })
    }

    // PostgREST does not support UPDATE + ORDER BY + LIMIT, so we SELECT the
    // target row first, then UPDATE by ID. Redis dedup + the parchment_reference
    // IS NULL guard on the UPDATE prevent double-processing under concurrent retries.
    const { data: candidates, error: selectError } = await supabase
      .from("intakes")
      .select("id, claimed_by, reviewing_doctor_id, reviewed_by, created_at")
      .eq("patient_id", patientProfileId)
      .eq("status", "awaiting_script")
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

    const candidate = selectParchmentWebhookIntake(
      candidates ?? [],
      prescriberProfiles.map((profile) => profile.id),
    )
    let claimed: { id: string; parchment_reference: string | null } | null = null

    if (candidate) {
      const { data: claimedRow, error: claimError } = await supabase
        .from("intakes")
        .update({
          parchment_reference: scid,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidate.id)
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
    }

    // Include event_id in script_notes for webhook idempotency audit trail
    const scriptNotes = `Webhook event: ${payload.event_id}`

    // Check if already processed (idempotency) or no intake found
    if (!claimed) {
      // Could be: (a) parchment_reference already set for this SCID, (b) manually marked sent, (c) no awaiting_script intake
      const { data: existing } = await supabase
        .from("intakes")
        .select("id, parchment_reference, script_sent")
        .eq("patient_id", patientProfileId)
        .eq("parchment_reference", scid)
        .maybeSingle()

      if (existing?.script_sent) {
        log.info("Webhook already fully processed (idempotent)", { eventId: payload.event_id })
        return NextResponse.json({ received: true })
      }

      if (existing && !existing.script_sent) {
        // Claimed (parchment_reference set) but updateScriptSent failed previously - resume
        log.info("Resuming partially-processed webhook", { eventId: payload.event_id })
        const resumeSuccess = await updateScriptSent(existing.id, true, scriptNotes, scid)
        if (!resumeSuccess) {
          log.error("Failed to mark script sent (resumed)", { eventId: payload.event_id })
          Sentry.captureMessage("Parchment webhook resume failed", {
            level: "error",
            extra: { eventId: payload.event_id, context: "parchment_webhook_resume" },
          })
          return NextResponse.json({ error: "Failed to update intake" }, { status: 500 })
        }
        log.info("Webhook resumed successfully", { eventId: payload.event_id })
        return NextResponse.json({ received: true, resumed: true })
      }

      log.warn("No matching awaiting_script intake found for webhook", { eventId: payload.event_id })
      return NextResponse.json({ received: true, warning: "No awaiting_script intake found" })
    }

    const intake = claimed

    // Mark script as sent and transition status
    const success = await updateScriptSent(intake.id, true, scriptNotes, scid)

    if (!success) {
      log.error("Failed to mark script sent via webhook", { eventId: payload.event_id })
      Sentry.captureMessage("Parchment updateScriptSent failed", {
        level: "error",
        extra: { eventId: payload.event_id, context: "parchment_webhook_update_script_sent" },
      })
      return NextResponse.json({ error: "Failed to update intake" }, { status: 500 })
    }

    // Send patient notification email
    try {
      const React = await import("react")
      const { sendEmail } = await import("@/lib/email/send-email")
      const { ScriptSentEmail, scriptSentEmailSubject } = await import("@/lib/email/components/templates/script-sent")
      const { getIntakeWithDetails } = await import("@/lib/data/intakes")

      const fullIntake = await getIntakeWithDetails(intake.id)
      if (fullIntake?.patient?.email) {
        const patientName = fullIntake.patient.full_name || "Patient"
        await sendEmail({
          to: fullIntake.patient.email,
          toName: patientName,
          subject: scriptSentEmailSubject(patientName?.split(" ")[0]),
          template: React.createElement(ScriptSentEmail, {
            patientName,
            requestId: intake.id,
            escriptReference: scid,
          }),
          emailType: "script_sent",
          intakeId: intake.id,
          patientId: fullIntake.patient.id,
          metadata: { parchmentReference: scid, source: "webhook" },
        })
        log.info("Patient notification email sent via webhook", { eventId: payload.event_id })
      }
    } catch (emailError) {
      // Non-fatal - script is already marked as sent, but alert so we can follow up
      log.error("Failed to send notification email from webhook", { eventId: payload.event_id }, emailError instanceof Error ? emailError : new Error(String(emailError)))
      Sentry.captureException(emailError instanceof Error ? emailError : new Error(String(emailError)), {
        level: "warning",
        extra: { eventId: payload.event_id, context: "parchment_webhook_email" },
      })
    }

    const duration = Date.now() - startTime
    log.info("Webhook processed successfully", { eventId: payload.event_id, durationMs: duration })

    return NextResponse.json({ received: true })
  } catch (error) {
    log.error("Webhook processing error", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { eventId: payload.event_id, context: "parchment_webhook_unhandled" } })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
