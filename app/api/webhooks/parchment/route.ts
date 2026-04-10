import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { verifyWebhookSignature } from "@/lib/parchment/client"
import { webhookPayloadSchema } from "@/lib/parchment/types"
import { updateScriptSent } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

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
export async function POST(request: Request) {
  const startTime = Date.now()

  // Read raw body for signature verification
  const rawBody = await request.text()
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

  // Only handle prescription.created events
  if (payload.event_type !== "prescription.created") {
    log.info("Ignoring webhook event", { eventType: payload.event_type, eventId: payload.event_id })
    return NextResponse.json({ received: true })
  }

  const { patient_id, partner_patient_id, scid, user_id } = payload.data

  log.info("Processing prescription.created webhook", {
    eventId: payload.event_id,
    patientId: patient_id,
    partnerPatientId: partner_patient_id,
    scid,
    userId: user_id,
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
      log.error("Patient not found for webhook", { patientId: patient_id, partnerPatientId: partner_patient_id })
      // Return 200 to prevent retries — patient genuinely doesn't exist in our system
      return NextResponse.json({ received: true, warning: "Patient not found" })
    }

    // Find the most recent awaiting_script intake for this patient
    const { data: intake } = await supabase
      .from("intakes")
      .select("id, parchment_reference")
      .eq("patient_id", patientProfileId)
      .eq("status", "awaiting_script")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!intake) {
      log.warn("No awaiting_script intake found for patient", { patientProfileId, scid })
      // Return 200 — the intake may have already been processed
      return NextResponse.json({ received: true, warning: "No awaiting_script intake found" })
    }

    // Idempotency: skip if already processed with this SCID
    if (intake.parchment_reference === scid) {
      log.info("Webhook already processed (idempotent)", { intakeId: intake.id, scid })
      return NextResponse.json({ received: true })
    }

    // Mark script as sent with the SCID
    const success = await updateScriptSent(intake.id, true, undefined, scid)

    if (!success) {
      log.error("Failed to mark script sent via webhook", { intakeId: intake.id, scid })
      return NextResponse.json({ error: "Failed to update intake" }, { status: 500 })
    }

    // Send patient notification email
    try {
      const React = await import("react")
      const { sendEmail } = await import("@/lib/email/send-email")
      const { ScriptSentEmail, scriptSentEmailSubject } = await import("@/components/email/templates/script-sent")
      const { getIntakeWithDetails } = await import("@/lib/data/intakes")

      const fullIntake = await getIntakeWithDetails(intake.id)
      if (fullIntake?.patient?.email) {
        const patientName = fullIntake.patient.full_name || "Patient"
        await sendEmail({
          to: fullIntake.patient.email,
          toName: patientName,
          subject: scriptSentEmailSubject,
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
        log.info("Patient notification email sent via webhook", { intakeId: intake.id })
      }
    } catch (emailError) {
      // Non-fatal — script is already marked as sent
      log.error("Failed to send notification email from webhook", { intakeId: intake.id }, emailError instanceof Error ? emailError : new Error(String(emailError)))
    }

    const duration = Date.now() - startTime
    log.info("Webhook processed successfully", { intakeId: intake.id, scid, durationMs: duration })

    return NextResponse.json({ received: true, intakeId: intake.id })
  } catch (error) {
    log.error("Webhook processing error", {}, error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error, { extra: { eventId: payload.event_id, scid } })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
