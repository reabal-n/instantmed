"use server"

/**
 * Revoke AI Auto-Approval
 *
 * Lets a doctor revoke an auto-issued certificate at any time. The certificate
 * revocation, the intake's return to in_review, and both audit events happen in
 * ONE database transaction (`revoke_auto_issued_certificate`), so a failure can
 * never strand a revoked certificate on an approved intake — the split-brain
 * the pre-2026-08-11 sequential writes allowed.
 *
 * This is the standing correction path for auto-issued certificates. It is not
 * tied to any review window: the post-approval attestation obligation was
 * removed on 2026-08-04 because risk is gated BEFORE issuance.
 *
 * Admin-only. See the role gate below for why capability alone is not
 * object-level authorization here.
 */

import * as Sentry from "@sentry/nextjs"

import { withServerAction } from "@/lib/actions/with-server-action"
import { doctorHasCapability } from "@/lib/auth/staff-capabilities"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { buildPatientIntakeHref } from "@/lib/dashboard/routes"
import { createNotification } from "@/lib/notifications/service"
import type { ActionResult } from "@/types/shared"

interface RevokeAIApprovalInput {
  intakeId: string
  reason: string
}

interface RevokeRpcRow {
  outcome:
    | "revoked_and_reopened"
    | "already_reopened"
    | "intake_not_found"
    | "not_auto_issued"
    | "wrong_category"
    | "wrong_status"
    | "certificate_not_found"
    | "certificate_not_revocable"
  certificate_id: string | null
  patient_id: string | null
}

const OUTCOME_ERRORS: Record<Exclude<RevokeRpcRow["outcome"], "revoked_and_reopened" | "already_reopened">, string> = {
  intake_not_found: "Intake not found",
  not_auto_issued: "This intake was not AI-approved",
  wrong_category: "Only medical certificates can be revoked this way",
  wrong_status:
    "This request has changed status, so it can no longer be revoked this way. Reload the case and check its current state.",
  certificate_not_found: "No certificate found for this request",
  certificate_not_revocable: "Certificate status changed. Please refresh and try again.",
}

export const revokeAIApproval = withServerAction<RevokeAIApprovalInput>(
  // Admin-only, deliberately narrower than the `review_med_certs` capability.
  //
  // The caller supplies an arbitrary `intakeId` and the RPC below runs with
  // the service role, so role + capability alone is not object-level
  // authorization: any non-admin doctor could revoke ANY patient's certificate
  // by id, bypassing the `lib/doctor/patient-access.ts` boundary that scopes
  // every other doctor surface. The only UI that reaches this action is the
  // auto-issued stream, which is already admin-gated (auto-issued certs have no
  // reviewing doctor, so no doctor has a relationship to assert). Matching the
  // action to that surface closes the gap without inventing a relationship rule
  // for records that structurally have none. If a future non-admin doctor needs
  // this, add a real doctor-patient relationship check — do not widen the role.
  { roles: ["admin"], name: "revoke-ai-approval" },
  async ({ intakeId, reason }, { supabase, profile, log }): Promise<ActionResult> => {
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: "Please provide a reason for revocation (min 5 characters)" }
    }
    if (reason.trim().length > 2000) {
      return { success: false, error: "Revocation reason must be 2,000 characters or fewer" }
    }

    // Revoking an issued certificate and reopening the intake is a clinical act
    // on the med-cert service line. Admin short-circuits `doctorHasCapability`,
    // so this stays meaningful only if the role gate above is ever widened —
    // keep both.
    if (!doctorHasCapability(profile, "review_med_certs")) {
      return {
        success: false,
        error: "You are not authorised to review medical certificates",
      }
    }

    // One transaction owns the whole correction: eligibility re-assertion under
    // FOR UPDATE locks, certificate revocation, the guarded approved ->
    // in_review reopen (the DB trigger sees the revoked certificate inside the
    // same transaction), and both audit events. Domain refusals come back as
    // outcome rows; only infrastructure failures surface as errors — and an
    // error means NOTHING was changed.
    const { data, error: rpcError } = await supabase.rpc("revoke_auto_issued_certificate", {
      p_intake_id: intakeId,
      p_actor_id: profile.id,
      p_actor_role: profile.role ?? "doctor",
      p_actor_name: profile.full_name ?? "Admin",
      p_reason: reason.trim(),
    })

    if (rpcError) {
      log.error("Auto-issued revocation transaction failed", { intakeId, error: rpcError.message })
      Sentry.captureMessage("Auto-issued revoke: transaction failed", {
        level: "error",
        tags: { subsystem: "revoke-ai-approval", intake_id: intakeId },
      })
      return {
        success: false,
        error: "The revocation could not be completed, so nothing was changed. Retry before leaving this case.",
      }
    }

    const row = (Array.isArray(data) ? data[0] : data) as RevokeRpcRow | undefined
    if (!row?.outcome) {
      log.error("Auto-issued revocation returned no outcome", { intakeId })
      return {
        success: false,
        error: "The revocation could not be completed, so nothing was changed. Retry before leaving this case.",
      }
    }

    if (row.outcome !== "revoked_and_reopened" && row.outcome !== "already_reopened") {
      log.warn("Auto-issued revocation refused", { intakeId, outcome: row.outcome })
      return { success: false, error: OUTCOME_ERRORS[row.outcome] }
    }

    // The correction is durable from here — notification and cache busting are
    // advisory and must never misreport the completed clinical correction.
    if (row.outcome === "revoked_and_reopened") {
      if (row.patient_id) {
        const notification = await createNotification({
          userId: row.patient_id,
          type: "request_update",
          title: "Certificate under review",
          message: "A doctor is reviewing your medical certificate. We'll update you shortly with the outcome.",
          actionUrl: buildPatientIntakeHref(intakeId),
          metadata: { intakeId, revoked: true },
        })
        if (!notification.success) {
          log.warn("Patient notification failed after revocation", { intakeId })
        }
      }

      // Sentry alert for monitoring. The clinical reason stays in the audit
      // tables, never in telemetry.
      Sentry.captureMessage("Auto-reviewed certificate revoked by doctor", {
        level: "warning",
        tags: {
          subsystem: "cert-pipeline",
          intake_id: intakeId,
          doctor_id: profile.id,
        },
      })
      log.info("AI-approved certificate revoked", { intakeId, doctorId: profile.id })
    } else {
      log.info("AI-approved certificate revocation already complete", { intakeId })
    }

    revalidateStaff({ intakeId, ops: true })
    revalidatePatient({ intakeId })

    return { success: true }
  }
)
