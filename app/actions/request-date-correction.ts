"use server"

import { getApiAuth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { sendTelegramAlert } from "@/lib/notifications/telegram"

const logger = createLogger("date-correction")

interface RequestDateCorrectionInput {
  intakeId: string
  requestedStartDate: string
  requestedEndDate: string
  reason: string
}

export async function requestDateCorrection(
  input: RequestDateCorrectionInput
): Promise<{ success: boolean; error?: string }> {
  const { intakeId, requestedStartDate, requestedEndDate, reason } = input

  const authResult = await getApiAuth()
  if (!authResult) {
    return { success: false, error: "Please sign in" }
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

  // Notify doctor via Telegram
  const msg = `*Date Correction Request*\n\nPatient: ${(authResult.profile.full_name || "Unknown").replace(/[._>#+\-=|{!}()]/g, "\\$&")}\nIntake: ${intakeId.slice(0, 8)}\\.\\.\\.\nNew dates: ${requestedStartDate} to ${requestedEndDate}\nReason: ${reason.replace(/[._>#+\-=|{!}()]/g, "\\$&")}`
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

  // Update the certificate dates
  const { error: certUpdateError } = await supabase
    .from("issued_certificates")
    .update({
      start_date: startDate,
      end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq("intake_id", intakeId)
    .eq("status", "valid")

  if (certUpdateError) {
    logger.error("Failed to update certificate dates", { intakeId, error: certUpdateError.message })
    return { success: false, error: "Failed to update certificate" }
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
    metadata: { correction_event_id: correctionEventId, new_start_date: startDate, new_end_date: endDate },
  })

  logger.info("Date correction approved", { intakeId, correctionEventId, startDate, endDate })

  return { success: true }
}
