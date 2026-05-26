"use server"

/**
 * Undo Cert Approval
 *
 * Gives a doctor a 30-second window after approving a medical certificate
 * to retract the approval. The cert email is deferred via `email_outbox`'s
 * `scheduled_for` column; this action:
 *
 *   1. Verifies the deferred email row still exists and has not yet been
 *      claimed by the dispatcher (scheduled_for must be in the future and
 *      status must still be 'pending').
 *   2. Confirms the same doctor who approved is the one undoing.
 *   3. Deletes the queued email row (cancels the deferred send).
 *   4. Revokes the issued certificate via the existing canonical action.
 *   5. Flips the intake back to in_review so it returns to the queue.
 *
 * The window length lives in `lib/clinical/undo-cert-window.ts` so the
 * server action, the cert pipeline, and the client toast all read from a
 * single non-server module. (Next.js forbids non-async exports from a
 * "use server" file.)
 */

import * as Sentry from "@sentry/nextjs"

import { revokeCertificateAction } from "@/app/actions/revoke-cert"
import { requireRoleOrNull } from "@/lib/auth/helpers"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { logStatusChange } from "@/lib/data/intake-events"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("undo-cert-approval")

export interface UndoCertApprovalInput {
  intakeId: string
}

export interface UndoCertApprovalResult {
  success: boolean
  error?: string
}

export async function undoCertApprovalAction(
  input: UndoCertApprovalInput
): Promise<UndoCertApprovalResult> {
  const { intakeId } = input

  // 1. Authenticate doctor / admin
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) {
    return { success: false, error: "Unauthorized or session expired" }
  }
  const actingDoctorId = auth.profile.id

  const supabase = createServiceRoleClient()

  try {
    // 2. Fetch the most recent certificate for this intake
    const { data: cert, error: certError } = await supabase
      .from("issued_certificates")
      .select("id, doctor_id, status, created_at")
      .eq("intake_id", intakeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (certError) {
      log.error("Failed to fetch certificate for undo", { intakeId, error: certError.message })
      return { success: false, error: "Failed to look up certificate" }
    }

    if (!cert) {
      return { success: false, error: "No certificate found for this request" }
    }

    // 3. Same-doctor gate. Owner-admin bypass intentionally NOT granted here:
    //    the operator persona uses the admin account as their everyday clinical
    //    account, and we want the undo to be tied to the actual approver to
    //    keep accountability simple. If multi-doctor staffing makes this
    //    annoying later, loosen via a capability flag, not by removing the
    //    check entirely.
    if (cert.doctor_id && cert.doctor_id !== actingDoctorId) {
      log.warn("Undo attempted by a different doctor than the approver", {
        intakeId,
        approvingDoctor: cert.doctor_id,
        attemptingDoctor: actingDoctorId,
      })
      return { success: false, error: "Only the approving doctor can undo this approval" }
    }

    // 4. Look up the queued cert email row and verify the window is still open.
    //    A row missing means we cannot prove the email has not fired, so we
    //    fail closed.
    const { data: outboxRow, error: outboxError } = await supabase
      .from("email_outbox")
      .select("id, status, scheduled_for, sent_at")
      .eq("intake_id", intakeId)
      .eq("email_type", "med_cert_patient")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (outboxError) {
      log.error("Failed to fetch deferred email row for undo", { intakeId, error: outboxError.message })
      return { success: false, error: "Failed to look up queued email" }
    }

    const nowMs = Date.now()
    const scheduledMs = outboxRow?.scheduled_for ? new Date(outboxRow.scheduled_for).getTime() : null
    const windowStillOpen =
      outboxRow &&
      outboxRow.status === "pending" &&
      !outboxRow.sent_at &&
      scheduledMs !== null &&
      scheduledMs > nowMs

    if (!windowStillOpen) {
      log.info("Undo window has closed", {
        intakeId,
        outboxRowFound: Boolean(outboxRow),
        outboxStatus: outboxRow?.status,
        scheduledFor: outboxRow?.scheduled_for,
        sentAt: outboxRow?.sent_at,
      })
      return {
        success: false,
        error: "Undo window has passed. The patient has been notified.",
      }
    }

    // 5. Cancel the queued email. We delete rather than soft-update so the
    //    dispatcher cannot race with us and pick it up between the schedule
    //    check and our cancellation. Restrict the delete to rows that are
    //    still strictly pending AND still in the future so the dispatcher
    //    cannot have claimed the row in-memory in the window between our
    //    schedule check above and this delete. Zero rows deleted means the
    //    dispatcher already grabbed it (the in-memory send may still fire);
    //    we fail the undo and tell the doctor the patient was notified.
    const nowIso = new Date().toISOString()
    const { data: deletedRows, error: deleteError } = await supabase
      .from("email_outbox")
      .delete()
      .eq("id", outboxRow.id)
      .eq("status", "pending")
      .gt("scheduled_for", nowIso)
      .select("id")

    if (deleteError) {
      log.error("Failed to cancel queued cert email", { intakeId, outboxId: outboxRow.id, error: deleteError.message })
      return { success: false, error: "Failed to cancel queued email. Please try again." }
    }

    if (!deletedRows || deletedRows.length === 0) {
      log.warn("Undo lost the race: dispatcher already claimed the queued email row", {
        intakeId,
        outboxId: outboxRow.id,
      })
      return {
        success: false,
        error: "Undo window has just closed. The patient may already have been notified.",
      }
    }

    // 6. Revoke the certificate. If it was already revoked, the canonical
    //    action returns alreadyRevoked=true which we treat as a soft success.
    const revokeResult = await revokeCertificateAction({
      intakeId,
      reason: "Undo: approval retracted within 30s undo window",
    })

    if (!revokeResult.success && !revokeResult.alreadyRevoked) {
      log.error("Failed to revoke cert during undo", { intakeId, error: revokeResult.error })
      // Email was already cancelled; surface the error but log the partial
      // state so ops can audit.
      Sentry.captureMessage("Cert undo partial failure: email cancelled but cert NOT revoked", {
        level: "error",
        tags: { subsystem: "cert-undo", intake_id: intakeId },
        extra: { revokeError: revokeResult.error },
      })
      return {
        success: false,
        error: revokeResult.error || "Failed to revoke certificate during undo",
      }
    }

    // 7. Flip the intake back to in_review so the case returns to the queue.
    const previousStatus = "approved"
    const nextStatus = "in_review"
    const { error: intakeError } = await supabase
      .from("intakes")
      .update({
        status: nextStatus,
        reviewed_by: null,
        reviewed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    if (intakeError) {
      log.error("Failed to flip intake back to in_review during undo", { intakeId, error: intakeError.message })
      Sentry.captureMessage("Cert undo partial failure: cert revoked but intake status not reset", {
        level: "warning",
        tags: { subsystem: "cert-undo", intake_id: intakeId },
        extra: { dbError: intakeError.message },
      })
      // Email cancelled and cert revoked - operator can manually re-queue from
      // the queue page. Don't return error to avoid spooking the doctor.
    }

    // 8. Audit log + cache busts. Fire-and-forget for the status log; the
    //    primary action has already succeeded.
    void logStatusChange(intakeId, previousStatus, nextStatus, actingDoctorId, "doctor", {
      reason: "cert_approval_undo",
    })

    log.info("Cert approval undone", {
      intakeId,
      doctorId: actingDoctorId,
      certificateId: cert.id,
      outboxId: outboxRow.id,
    })

    Sentry.captureMessage("Cert approval undone within window", {
      level: "info",
      tags: { subsystem: "cert-undo", intake_id: intakeId, doctor_id: actingDoctorId },
      extra: { certificateId: cert.id, outboxId: outboxRow.id },
    })

    revalidateStaff({ intakeId })
    revalidatePatient({ intakeId, documents: true })

    return { success: true }
  } catch (err) {
    log.error("Unexpected error during cert approval undo", {
      intakeId,
      error: err instanceof Error ? err.message : String(err),
    })
    Sentry.captureException(err, { tags: { action: "undo_cert_approval", intake_id: intakeId } })
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error",
    }
  }
}
