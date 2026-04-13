"use server"

import { z } from "zod"

import { getApiAuth } from "@/lib/auth/helpers"
import { escapeMarkdownValue,sendTelegramAlert } from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("date-correction")

const requestDateCorrectionSchema = z.object({
  intakeId: z.string().uuid("Invalid intake ID"),
  requestedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  requestedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be 500 characters or less"),
})

type RequestDateCorrectionInput = z.infer<typeof requestDateCorrectionSchema>

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

  // Rate limit: prevent Telegram alert spam (3 corrections per hour per patient)
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

  if (!["approved", "completed"].includes(intake.status)) {
    return { success: false, error: "Can only request corrections on approved certificates" }
  }

  // Validate dates
  const start = new Date(requestedStartDate)
  const end = new Date(requestedEndDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { success: false, error: "Invalid dates" }
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
    },
  })

  if (insertError) {
    logger.error("Failed to create correction request", { intakeId, error: insertError.message })
    return { success: false, error: "Failed to submit request" }
  }

  logger.info("Date correction requested", { intakeId, requestedStartDate, requestedEndDate })

  // Notify doctor via Telegram (fire-and-forget)
  const msg = `*Date Correction Request*\n\nPatient: ${escapeMarkdownValue(authResult.profile.full_name || "Unknown")}\nIntake: ${intakeId.slice(0, 8)}\\.\\.\\.\nNew dates: ${escapeMarkdownValue(requestedStartDate)} → ${escapeMarkdownValue(requestedEndDate)}\nReason: ${escapeMarkdownValue(reason)}`
  sendTelegramAlert(msg).catch(() => {})

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
 * Approve a date correction (doctor action)
 */
export async function approveDateCorrection(
  correctionEventId: string,
  intakeId: string
): Promise<{ success: boolean; error?: string }> {
  const authResult = await getApiAuth()
  if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()

  // Fetch the correction event
  const { data: event } = await supabase
    .from("intake_events")
    .select("id, intake_id, metadata")
    .eq("id", correctionEventId)
    .eq("event_type", "date_correction_requested")
    .single()

  if (!event) {
    return { success: false, error: "Correction request not found" }
  }

  const meta = event.metadata as Record<string, unknown>
  const startDate = meta.requested_start_date as string
  const endDate = meta.requested_end_date as string

  // Regenerate the certificate with corrected dates.
  // This supersedes the old PDF, generates a new one, and emails the patient.
  const { regenerateCertificateAction } = await import("@/app/actions/regenerate-certificate")
  const regenResult = await regenerateCertificateAction({
    intakeId,
    reason: `Date correction: ${meta.reason || "dates updated"}`,
    corrections: {
      dateRange: { startDate, endDate },
    },
  })

  if (!regenResult.success) {
    logger.error("Failed to regenerate certificate for date correction", { intakeId, error: regenResult.error })
    return { success: false, error: regenResult.error || "Failed to regenerate certificate with corrected dates" }
  }

  // Mark the correction as approved
  await supabase
    .from("intake_events")
    .update({
      metadata: { ...meta, status: "approved", approved_by: authResult.profile.id, approved_at: new Date().toISOString() },
    })
    .eq("id", correctionEventId)

  // Log the correction
  await supabase.from("intake_events").insert({
    intake_id: intakeId,
    event_type: "date_correction_approved",
    actor_id: authResult.profile.id,
    actor_role: authResult.profile.role,
    metadata: {
      correction_event_id: correctionEventId,
      new_start_date: startDate,
      new_end_date: endDate,
      new_certificate_id: regenResult.certificateId,
    },
  })

  logger.info("Date correction approved - certificate regenerated", {
    intakeId,
    correctionEventId,
    startDate,
    endDate,
    newCertificateId: regenResult.certificateId,
  })

  return { success: true }
}
