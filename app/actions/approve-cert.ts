"use server"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { logger } from "@/lib/observability/logger"
import { checkCertificateRateLimit } from "@/lib/rate-limit/doctor"
import * as Sentry from "@sentry/nextjs"
import type { CertReviewData } from "@/types/db"
import { executeCertApproval, type ApproveCertResult } from "@/lib/clinical/execute-cert-approval"

/**
 * Server action to approve a medical certificate intake, generate PDF, and email it to the patient.
 * Uses intakes table as the canonical case object.
 *
 * @param intakeId - The ID of the intake to approve
 * @param reviewData - The edited certificate data from the review modal
 */
export async function approveAndSendCert(
  intakeId: string,
  reviewData: CertReviewData
): Promise<ApproveCertResult> {
  try {
    // 1. Authenticate doctor or admin (non-redirecting for server actions)
    const authResult = await requireRoleOrNull(["doctor", "admin"])
    if (!authResult) {
      logger.warn("APPROVE_CORE_UNAUTHORIZED", { intakeId })
      return { success: false, error: "Unauthorized or session expired" }
    }
    const doctorProfile = authResult.profile

    // P0 SECURITY: Rate limiting to prevent mass-approval attacks
    const rateLimitResult = await checkCertificateRateLimit(doctorProfile.id)
    if (!rateLimitResult.allowed) {
      logger.warn("Certificate rate limit exceeded", {
        doctorId: doctorProfile.id,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      })
      return {
        success: false,
        error: `Rate limit exceeded. You can issue more certificates after ${rateLimitResult.resetAt.toLocaleTimeString()}. Contact support if this is urgent.`,
      }
    }

    // P2 FIX: Early verification that doctor has required credentials configured
    if (!doctorProfile.provider_number || !doctorProfile.ahpra_number) {
      logger.warn("Doctor attempted approval without credentials", {
        doctorId: doctorProfile.id,
        hasProvider: !!doctorProfile.provider_number,
        hasAhpra: !!doctorProfile.ahpra_number,
      })
      return {
        success: false,
        error: "Your certificate credentials are not configured. Please complete your Certificate Identity in Settings before approving certificates."
      }
    }

    // P2 FIX: Validate AHPRA number format (3 uppercase letters + 10 digits)
    if (!/^[A-Z]{3}\d{10}$/.test(doctorProfile.ahpra_number)) {
      logger.warn("Doctor AHPRA number failed format validation", {
        doctorId: doctorProfile.id,
      })
      return {
        success: false,
        error: "Invalid AHPRA number format. Please update your profile.",
      }
    }

    // SELF-APPROVAL PREVENTION: Checked here because we need both auth + intake data
    // The shared executeCertApproval doesn't have this check since auto-approval uses a system doctor
    // We pass the doctorProfile.id and let the shared function handle intake fetching,
    // but we need to do a lightweight self-approval check first
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const { data: intakeCheck } = await supabase
      .from("intakes")
      .select("patient_id")
      .eq("id", intakeId)
      .single()

    if (intakeCheck && intakeCheck.patient_id === doctorProfile.id) {
      logger.warn("Doctor attempted self-approval", { doctorId: doctorProfile.id, intakeId })
      return {
        success: false,
        error: "You cannot approve your own medical certificate request. Please have another doctor review this case."
      }
    }

    // Delegate to shared approval pipeline
    return await executeCertApproval({
      intakeId,
      reviewData,
      doctorProfile: {
        id: doctorProfile.id,
        full_name: doctorProfile.full_name,
        provider_number: doctorProfile.provider_number,
        ahpra_number: doctorProfile.ahpra_number,
      },
      skipClaim: false,
    })
  } catch (error) {
    logger.error("[ApproveCert] Error approving certificate", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    Sentry.captureException(error, {
      tags: {
        action: "approve_med_cert",
        service_type: "medical_certificate",
        intake_id: intakeId,
        step_id: "approve_cert_outer_catch",
      },
      extra: {
        intakeId,
        reviewDataKeys: Object.keys(reviewData),
      },
    })

    return {
      success: false,
      error: (error instanceof Error && error.message) ? error.message : "We hit an unexpected bump. Please try again.",
    }
  }
}
