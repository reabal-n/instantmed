"use server"

import { z } from "zod"

import { reissueCertificateAction } from "@/app/actions/reissue-cert"
import { getApiAuth } from "@/lib/auth/helpers"
import { doctorHasCapability, hasDoctorAccess } from "@/lib/auth/staff-capabilities"
import {
  getCertificateCorrectionCount,
  getCertificateForIntake,
} from "@/lib/data/issued-certificates"
import { validateCertificateDateRange } from "@/lib/medical-certificates/date-policy"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { getAbsenceDays } from "@/lib/stripe/price-mapping"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("date-correction")

const requestDateCorrectionSchema = z.object({
  intakeId: z.string().uuid("Invalid intake ID"),
  requestedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  requestedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be 500 characters or less"),
})

type RequestDateCorrectionInput = z.infer<typeof requestDateCorrectionSchema>
export type PatientDateCorrectionState = "pending" | "none" | "unavailable"

export async function getPatientDateCorrectionState(
  intakeId: string,
): Promise<PatientDateCorrectionState> {
  if (!z.string().uuid().safeParse(intakeId).success) return "none"

  const authResult = await getApiAuth()
  if (!authResult || authResult.profile.role !== "patient") return "none"

  const supabase = createServiceRoleClient()
  const { data: ownedIntake, error: intakeError } = await supabase
    .from("intakes")
    .select("id")
    .eq("id", intakeId)
    .eq("patient_id", authResult.profile.id)
    .eq("category", "medical_certificate")
    .maybeSingle()

  // On a transient verification failure, hide the affordance rather than let
  // the patient create a duplicate request they only discover on submission.
  if (intakeError) return "unavailable"
  if (!ownedIntake) return "none"

  const { data: pendingEvent, error: pendingError } = await supabase
    .from("intake_events")
    .select("id")
    .eq("intake_id", intakeId)
    .eq("event_type", "date_correction_requested")
    .eq("metadata->>status", "pending")
    .limit(1)
    .maybeSingle()

  if (pendingError) return "unavailable"
  return pendingEvent ? "pending" : "none"
}

export async function requestDateCorrection(
  rawInput: RequestDateCorrectionInput
): Promise<{ success: boolean; error?: string }> {
  const parsed = requestDateCorrectionSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" }
  }
  const { intakeId, requestedStartDate, requestedEndDate, reason } = parsed.data

  const authResult = await getApiAuth()
  if (!authResult) {
    return { success: false, error: "Please sign in" }
  }

  // Rate limit: prevent correction request spam (3 corrections per hour per patient)
  const rateLimit = await checkServerActionRateLimit(authResult.profile.id, "sensitive")
  if (!rateLimit.success) {
    return { success: false, error: "Too many correction requests. Please try again later." }
  }

  const supabase = createServiceRoleClient()

  // Verify patient owns this intake
  const { data: intake } = await supabase
    .from("intakes")
    .select("id, patient_id, status, category")
    .eq("id", intakeId)
    .single()

  if (!intake || intake.patient_id !== authResult.profile.id) {
    return { success: false, error: "Request not found" }
  }

  if (intake.category !== "medical_certificate") {
    return { success: false, error: "Date corrections are only available for medical certificates" }
  }

  if (!["approved", "completed"].includes(intake.status)) {
    return { success: false, error: "Can only request corrections on approved certificates" }
  }

  // Corrections only apply to the current valid certificate. This prevents a
  // patient from opening a request against a revoked/superseded document and
  // gives the doctor workflow the same canonical-document precondition as the
  // eventual reissue action.
  const currentCertificate = await getCertificateForIntake(intakeId)
  if (
    !currentCertificate ||
    currentCertificate.status !== "valid" ||
    currentCertificate.patient_id !== authResult.profile.id
  ) {
    return { success: false, error: "No valid certificate found for this request" }
  }

  if (
    currentCertificate.start_date === requestedStartDate &&
    currentCertificate.end_date === requestedEndDate
  ) {
    return {
      success: false,
      error: "The requested dates already match your current certificate",
    }
  }

  const correctionCountResult = await getCertificateCorrectionCount(currentCertificate.id)
  if (!correctionCountResult.success) {
    logger.error("Failed to verify correction count for patient request", {
      intakeId,
      certificateId: currentCertificate.id,
    })
    return {
      success: false,
      error: "Could not verify the certificate correction history. Please try again.",
    }
  }
  if ((correctionCountResult.count ?? 0) >= 3) {
    return {
      success: false,
      error: "Maximum corrections reached (3). Contact support.",
    }
  }

  const dateRangeValidation = validateCertificateDateRange(requestedStartDate, requestedEndDate, {
    maxBackdateDays: null,
    maxDurationDays: 30,
  })
  if (!dateRangeValidation.valid) {
    return { success: false, error: dateRangeValidation.error }
  }

  // Reject impossible requests before they enter the doctor's queue. The
  // reissue action repeats this paid-tier check as the final clinical write
  // guard, but the patient should not be able to submit dates that can never be
  // approved under the certificate tier they purchased.
  const { data: intakeAnswersRow, error: intakeAnswersError } = await supabase
    .from("intake_answers")
    .select("answers")
    .eq("intake_id", intakeId)
    .maybeSingle()

  if (intakeAnswersError || !intakeAnswersRow?.answers) {
    logger.error("Failed to verify paid tier for correction request", {
      intakeId,
      error: intakeAnswersError?.message,
    })
    return {
      success: false,
      error: "Could not verify your certificate tier. Please try again.",
    }
  }

  const paidDays = getAbsenceDays(intakeAnswersRow.answers as Record<string, unknown>)
  if (![1, 2, 3].includes(paidDays)) {
    logger.error("Invalid paid tier on correction request", { intakeId, paidDays })
    return {
      success: false,
      error: "Could not verify your certificate tier. Please contact support.",
    }
  }

  if (dateRangeValidation.durationDays > paidDays) {
    const requestedDays = dateRangeValidation.durationDays
    return {
      success: false,
      error: `Requested duration (${requestedDays} day${requestedDays === 1 ? "" : "s"}) exceeds the paid certificate tier (${paidDays} day${paidDays === 1 ? "" : "s"}). Contact support if you need a longer certificate.`,
    }
  }

  // Check for existing pending correction
  const { data: existing } = await supabase
    .from("intake_events")
    .select("id")
    .eq("intake_id", intakeId)
    .eq("event_type", "date_correction_requested")
    .eq("metadata->>status", "pending")
    .maybeSingle()

  if (existing) {
    return { success: false, error: "A correction request is already pending" }
  }

  // Store the correction request
  const { error: insertError } = await supabase.from("intake_events").insert({
    intake_id: intakeId,
    event_type: "date_correction_requested",
    actor_id: authResult.profile.id,
    actor_role: "patient",
    metadata: {
      status: "pending",
      requested_start_date: requestedStartDate,
      requested_end_date: requestedEndDate,
      reason,
      patient_name: authResult.profile.full_name,
      certificate_id: currentCertificate.id,
      certificate_storage_path: currentCertificate.storage_path,
    },
  })

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: false, error: "A correction request is already pending" }
    }
    logger.error("Failed to create correction request", { intakeId, error: insertError.message })
    return { success: false, error: "Failed to submit request" }
  }

  logger.info("Date correction requested", { intakeId, requestedStartDate, requestedEndDate })

  return { success: true }
}

/**
 * Get pending date correction for an intake (used by doctor view)
 */
export async function getPendingDateCorrection(intakeId: string): Promise<{
  id: string
  requestedStartDate: string
  requestedEndDate: string
  reason: string
  patientName: string
  createdAt: string
} | null> {
  const authResult = await getApiAuth()
  if (
    !authResult ||
    !hasDoctorAccess(authResult.profile) ||
    !doctorHasCapability(authResult.profile, "review_med_certs")
  ) {
    return null
  }

  const supabase = createServiceRoleClient()

  const { data } = await supabase
    .from("intake_events")
    .select("id, metadata, created_at")
    .eq("intake_id", intakeId)
    .eq("event_type", "date_correction_requested")
    .eq("metadata->>status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  const meta = data.metadata as Record<string, unknown>
  return {
    id: data.id,
    requestedStartDate: meta.requested_start_date as string,
    requestedEndDate: meta.requested_end_date as string,
    reason: (meta.reason as string) || "",
    patientName: (meta.patient_name as string) || "Patient",
    createdAt: data.created_at,
  }
}

/**
 * Close a pending patient correction request without changing the certificate.
 * The request event itself remains the audit record and records who closed it
 * and when; changing its status releases the one-pending-request index.
 */
export async function rejectDateCorrection(
  correctionEventId: string,
  intakeId: string,
): Promise<{ success: boolean; error?: string }> {
  const parsedIds = z.object({
    correctionEventId: z.string().uuid(),
    intakeId: z.string().uuid(),
  }).safeParse({ correctionEventId, intakeId })
  if (!parsedIds.success) {
    return { success: false, error: "Invalid correction request" }
  }

  const authResult = await getApiAuth()
  if (
    !authResult ||
    !hasDoctorAccess(authResult.profile) ||
    !doctorHasCapability(authResult.profile, "review_med_certs")
  ) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()
  const { data: event, error: eventError } = await supabase
    .from("intake_events")
    .select("id, metadata")
    .eq("id", correctionEventId)
    .eq("intake_id", intakeId)
    .eq("event_type", "date_correction_requested")
    .eq("metadata->>status", "pending")
    .maybeSingle()

  if (eventError || !event) {
    return { success: false, error: "Pending correction request not found" }
  }

  const metadata = event.metadata as Record<string, unknown>
  const { data: rejectedEvent, error: rejectError } = await supabase
    .from("intake_events")
    .update({
      metadata: {
        ...metadata,
        status: "rejected",
        rejected_by: authResult.profile.id,
        rejected_at: new Date().toISOString(),
      },
    })
    .eq("id", correctionEventId)
    .eq("intake_id", intakeId)
    .eq("event_type", "date_correction_requested")
    .eq("metadata->>status", "pending")
    .select("id")
    .maybeSingle()

  if (rejectError || !rejectedEvent) {
    logger.error("Failed to close pending date correction", {
      intakeId,
      correctionEventId,
      error: rejectError?.message,
    })
    return { success: false, error: "Correction request changed before it could be closed" }
  }

  logger.info("Date correction request rejected", {
    intakeId,
    correctionEventId,
    actorId: authResult.profile.id,
  })
  return { success: true }
}

/**
 * Approve a date correction (doctor action)
 */
export async function approveDateCorrection(
  correctionEventId: string,
  intakeId: string
): Promise<{ success: boolean; error?: string }> {
  const authResult = await getApiAuth()
  if (
    !authResult ||
    !hasDoctorAccess(authResult.profile) ||
    !doctorHasCapability(authResult.profile, "review_med_certs")
  ) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()

  // Fetch the correction event
  const { data: event } = await supabase
    .from("intake_events")
    .select("id, intake_id, metadata")
    .eq("id", correctionEventId)
    .eq("event_type", "date_correction_requested")
    .eq("metadata->>status", "pending")
    .single()

  if (!event) {
    return { success: false, error: "Correction request not found" }
  }

  if (event.intake_id !== intakeId) {
    return { success: false, error: "Correction event does not belong to this intake" }
  }

  const meta = event.metadata as Record<string, unknown>
  const startDate = meta.requested_start_date as string
  const endDate = meta.requested_end_date as string

  const cert = await getCertificateForIntake(intakeId)
  if (!cert || cert.status !== "valid") {
    return { success: false, error: "No valid certificate found for this request" }
  }

  const certificateType =
    cert.certificate_type === "study" || cert.certificate_type === "carer" ? cert.certificate_type : "work"

  const reissueResult = await reissueCertificateAction({
    intakeId,
    patientName: cert.patient_name,
    patientDob: cert.patient_dob,
    certificateType,
    startDate,
    endDate,
    medicalReason: "date_correction",
    notifyPatient: true,
    correctionEventId,
  })

  if (!reissueResult.success) {
    logger.error("Failed to reissue certificate for date correction", { intakeId, error: reissueResult.error })
    return { success: false, error: reissueResult.error || "Failed to reissue certificate with corrected dates" }
  }

  logger.info("Date correction approved - certificate reissued", {
    intakeId,
    correctionEventId,
    certificateId: reissueResult.certificateId,
  })

  return { success: true }
}
