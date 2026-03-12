"use server"

import { revalidatePath } from "next/cache"
import * as Sentry from "@sentry/nextjs"
import {
  updateIntakeStatus,
  saveDoctorNotes,
  flagForFollowup,
  markAsReviewed,
  updateScriptSent,
} from "@/lib/data/intakes"
import { requireRole } from "@/lib/auth"
import { IntakeLifecycleError } from "@/lib/data/intake-lifecycle"
import { createLogger } from "@/lib/observability/logger"
import type { IntakeStatus } from "@/types/db"
import { declineIntake as declineIntakeCanonical } from "@/app/actions/decline-intake"

const logger = createLogger("doctor-queue-actions")

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export async function updateStatusAction(
  intakeId: string,
  status: IntakeStatus,
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  // Validate clinical notes exist for approval/script statuses
  if (status === "approved" || status === "awaiting_script") {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select("doctor_notes")
      .eq("id", intakeId)
      .single()

    const notes = intake?.doctor_notes?.trim() || ""
    if (notes.length < 20) {
      return {
        success: false,
        error: "Clinical notes must be at least 20 characters before approving or sending a script.",
        code: "INSUFFICIENT_CLINICAL_NOTES",
      }
    }
  }

  // CRITICAL GUARD: Block direct approval of med certs - they MUST go through document builder
  // Med certs require PDF generation and email sending via approveAndSendCert
  if (status === "approved") {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select("service:services(type)")
      .eq("id", intakeId)
      .single()
    
    const serviceType = (intake?.service as { type?: string } | null)?.type
    if (serviceType === "med_certs") {
      return { 
        success: false, 
        error: "Medical certificates must be approved through the document builder to generate PDFs and send emails.",
        code: "MED_CERT_REQUIRES_DOCUMENT_BUILDER"
      }
    }
  }

  try {
    const result = await updateIntakeStatus(intakeId, status, profile.id)
    if (!result) {
      return { success: false, error: "Failed to update status" }
    }

    // Mark as reviewed if going to in_review
    if (status === "in_review") {
      await markAsReviewed(intakeId, profile.id)
    }

    revalidatePath("/doctor/dashboard")
    revalidatePath(`/doctor/intakes/${intakeId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof IntakeLifecycleError) {
      switch (error.code) {
        case "PAYMENT_REQUIRED":
          return {
            success: false,
            error: "Cannot update status - payment not completed",
            code: error.code,
          }
        case "TERMINAL_STATE":
          return {
            success: false,
            error: "This intake has already been finalized",
            code: error.code,
          }
        case "INVALID_TRANSITION":
          return {
            success: false,
            error: `Invalid status change. ${error.message}`,
            code: error.code,
          }
        default:
          return {
            success: false,
            error: error.message,
            code: error.code,
          }
      }
    }
    throw error
  }
}

export async function saveDoctorNotesAction(
  intakeId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await saveDoctorNotes(intakeId, notes)
  if (!success) {
    return { success: false, error: "Failed to save notes" }
  }

  return { success: true }
}

export async function declineIntakeAction(
  intakeId: string,
  reasonCode: string,
  reasonNote?: string,
): Promise<{ success: boolean; error?: string; refund?: { status: string } }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  // Use canonical decline action - handles refund + email + audit consistently
  const result = await declineIntakeCanonical({
    intakeId,
    reason: reasonNote,
    reasonCode,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  revalidatePath("/doctor/dashboard")
  revalidatePath(`/doctor/intakes/${intakeId}`)
  revalidatePath(`/patient/intakes/${intakeId}`)

  return { 
    success: true,
    refund: result.refund ? { status: result.refund.status } : undefined,
  }
}

export async function flagForFollowupAction(
  intakeId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await flagForFollowup(intakeId, reason)
  if (!success) {
    return { success: false, error: "Failed to flag" }
  }

  return { success: true }
}

export async function markScriptSentAction(
  intakeId: string,
  scriptNotes?: string,
  parchmentReference?: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await updateScriptSent(intakeId, true, scriptNotes, parchmentReference)
  if (!success) {
    return { success: false, error: "Failed to mark script sent" }
  }

  // Send email notification to patient via the centralized sendEmail pipeline
  // This ensures outbox logging, retry support, Sentry capture, and the modern React template
  try {
    const React = await import("react")
    const { sendEmail } = await import("@/lib/email/send-email")
    const { ScriptSentEmail, scriptSentEmailSubject } = await import("@/components/email/templates/script-sent")
    const { getIntakeWithDetails } = await import("@/lib/data/intakes")
    
    const intake = await getIntakeWithDetails(intakeId)
    if (intake?.patient?.email) {
      const patientName = intake.patient.full_name || "Patient"

      await sendEmail({
        to: intake.patient.email,
        toName: patientName,
        subject: scriptSentEmailSubject,
        template: React.createElement(ScriptSentEmail, {
          patientName,
          requestId: intakeId,
          escriptReference: parchmentReference,
        }),
        emailType: "script_sent",
        intakeId,
        patientId: intake.patient.id,
        metadata: parchmentReference ? { parchmentReference } : {},
      })
    }
  } catch (emailErr) {
    // Email is non-critical, don't fail the action -- but log to Sentry
    Sentry.captureException(emailErr, {
      tags: { email_type: "script_sent", intake_id: intakeId },
      level: "warning",
    })
    logger.warn("Failed to send script_sent email", { intakeId, error: emailErr })
  }

  revalidatePath("/doctor/dashboard")
  revalidatePath(`/doctor/intakes/${intakeId}`)
  revalidatePath(`/patient/intakes/${intakeId}`)

  return { success: true }
}

/**
 * Claim an intake for review (concurrent review lock)
 * Note: This feature requires the claim_intake_for_review migration to be run
 */
export async function claimIntakeAction(
  intakeId: string,
  force: boolean = false
): Promise<{ success: boolean; error?: string; claimedBy?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  Sentry.setTag("action", "claim_intake")
  Sentry.setTag("intake_id", intakeId)

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    logger.info("[ClaimIntake] Attempting claim", { intakeId, doctorId: profile.id, force })

    // Use the database function for atomic claim
    const { data, error } = await supabase.rpc("claim_intake_for_review", {
      p_intake_id: intakeId,
      p_doctor_id: profile.id,
      p_force: force,
    })

    if (error) {
      // If RPC doesn't exist (migration not run), return graceful message
      if (error.message?.includes("function") || error.code === "42883") {
        logger.info("[ClaimIntake] RPC not available, fallback to success", { intakeId })
        return { success: true }
      }
      logger.error("[ClaimIntake] RPC failed", { intakeId, error: error.message })
      Sentry.captureMessage("Intake claim RPC failed", {
        level: "error",
        tags: { action: "claim_intake", intake_id: intakeId, step_id: "rpc_call" },
        extra: { error: error.message, doctorId: profile.id },
      })
      return { success: false, error: "Failed to claim intake" }
    }

    const result = data?.[0]
    if (!result?.success) {
      logger.info("[ClaimIntake] Intake already claimed", { 
        intakeId, 
        claimedBy: result?.current_claimant 
      })
      return {
        success: false,
        error: result?.error_message || "Intake already claimed",
        claimedBy: result?.current_claimant
      }
    }

    logger.info("[ClaimIntake] Claim successful", { intakeId, doctorId: profile.id })
    return { success: true }
  } catch (error) {
    logger.error("[ClaimIntake] Unexpected error", { intakeId }, error instanceof Error ? error : undefined)
    Sentry.captureException(error, {
      tags: { action: "claim_intake", intake_id: intakeId, step_id: "claim_outer_catch" },
    })
    // Return failure — do NOT silently succeed on unknown errors
    return { success: false, error: "Failed to claim intake for review. Please try again." }
  }
}

/**
 * Release claim on an intake
 * Note: This feature requires the release_intake_claim migration to be run
 */
export async function releaseIntakeClaimAction(
  intakeId: string
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    const { error } = await supabase.rpc("release_intake_claim", {
      p_intake_id: intakeId,
      p_doctor_id: profile.id,
    })

    if (error) {
      // If RPC doesn't exist (migration not run), return graceful success
      if (error.message?.includes("function") || error.code === "42883") {
        return { success: true }
      }
      return { success: false, error: "Failed to release claim" }
    }

    return { success: true }
  } catch {
    // Graceful fallback if function doesn't exist
    return { success: true }
  }
}

/**
 * Get decline reason templates
 */
export async function getDeclineReasonTemplatesAction(): Promise<{
  success: boolean
  templates?: Array<{ code: string; label: string; description: string | null; requires_note: boolean }>
  error?: string
}> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("decline_reason_templates")
    .select("code, label, description, requires_note")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  if (error) {
    return { success: false, error: "Failed to fetch templates" }
  }

  return { success: true, templates: data }
}

/**
 * Issue a standalone Stripe refund for any paid intake.
 * Separate from the decline flow — works on any paid request regardless of status.
 */
export async function issueRefundAction(
  intakeId: string,
): Promise<{ success: boolean; error?: string; refundId?: string; amount?: number }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  Sentry.setTag("action", "issue_refund")
  Sentry.setTag("intake_id", intakeId)

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const timestamp = new Date().toISOString()

    // Fetch intake with patient info
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        status,
        category,
        payment_status,
        payment_id,
        stripe_payment_intent_id,
        amount_cents,
        patient_id,
        patient:profiles!patient_id (
          id,
          full_name,
          email
        )
      `)
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      return { success: false, error: "Request not found" }
    }

    // Guard: only refund requests with payment_status "paid".
    // Once refunded, payment_status becomes "refunded" — this naturally prevents re-runs.
    // Stripe idempotency key is a secondary backstop.
    if (intake.payment_status !== "paid") {
      return { success: false, error: "Refund can only be issued for paid requests" }
    }

    // Get payment intent ID
    let paymentIntentId = intake.stripe_payment_intent_id

    if (!paymentIntentId && intake.payment_id) {
      try {
        const { stripe } = await import("@/lib/stripe/client")
        const session = await stripe.checkout.sessions.retrieve(intake.payment_id)
        paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null
      } catch {
        logger.warn("[IssueRefund] Failed to fetch checkout session", { intakeId })
      }
    }

    if (!paymentIntentId) {
      return { success: false, error: "No payment found for this request" }
    }

    // Process Stripe refund
    const { stripe } = await import("@/lib/stripe/client")
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          intake_id: intakeId,
          category: intake.category || "unknown",
          refunded_by: profile.id,
          refund_type: "standalone",
        },
      },
      { idempotencyKey: `standalone_refund_${intakeId}` }
    )

    // Update intake
    await supabase
      .from("intakes")
      .update({
        payment_status: "refunded",
        refund_status: "succeeded",
        refund_stripe_id: refund.id,
        refund_amount_cents: refund.amount,
        refunded_at: timestamp,
        refunded_by: profile.id,
        updated_at: timestamp,
      })
      .eq("id", intakeId)

    logger.info("[IssueRefund] Refund succeeded", { intakeId, refundId: refund.id, amount: refund.amount })

    // Send patient email (non-critical)
    try {
      const patientRaw = intake.patient as unknown
      const patient = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as {
        id: string
        full_name: string | null
        email: string | null
      } | null

      if (patient?.email) {
        const { sendRefundIssuedEmail } = await import("@/lib/email/senders")
        const amountFormatted = refund.amount
          ? `$${(refund.amount / 100).toFixed(2)}`
          : undefined

        await sendRefundIssuedEmail({
          to: patient.email,
          patientName: patient.full_name || "there",
          patientId: patient.id,
          intakeId,
          requestType: intake.category || "request",
          amountFormatted,
        })
      }
    } catch (emailErr) {
      Sentry.captureException(emailErr, {
        tags: { email_type: "refund_issued", intake_id: intakeId },
        level: "warning",
      })
      logger.warn("[IssueRefund] Failed to send refund email", { intakeId })
    }

    revalidatePath("/doctor/dashboard")
    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true, refundId: refund.id, amount: refund.amount }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[IssueRefund] Failed", { intakeId }, error instanceof Error ? error : undefined)
    Sentry.captureException(error, { tags: { action: "issue_refund", intake_id: intakeId } })
    return { success: false, error: `Failed to process refund: ${msg}` }
  }
}
