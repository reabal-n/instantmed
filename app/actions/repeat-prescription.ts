"use server"

/**
 * Repeat Prescription Server Actions
 * 
 * Actions for managing repeat prescription workflow:
 * - Mark script as sent via Parchment
 * - Track completion status
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getApiAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { logAuditEvent } from "@/lib/security/audit-log"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/email/send-email"
import { PrescriptionApprovedEmail, prescriptionApprovedSubject } from "@/components/email/templates/prescription-approved"
import { env } from "@/lib/env"

const log = createLogger("repeat-prescription")

export interface MarkScriptSentResult {
  success: boolean
  error?: string
  sentAt?: string
  sentBy?: string
}

/**
 * Mark a repeat prescription as sent via external system (Parchment)
 * This transitions the intake to completed status
 */
export async function markRepeatScriptSentAction(
  intakeId: string,
  sent: boolean,
  channel: string = "parchment"
): Promise<MarkScriptSentResult> {
  const auth = await getApiAuth()
  
  if (!auth) {
    return { success: false, error: "Unauthorized" }
  }

  if (!["doctor", "admin"].includes(auth.profile.role)) {
    return { success: false, error: "Only doctors and admins can mark scripts as sent" }
  }

  const supabase = createServiceRoleClient()
  const doctorId = auth.profile.id

  // Verify intake exists and is a repeat prescription
  const { data: intake, error: fetchError } = await supabase
    .from("intakes")
    .select(`id, service_type, status, prescription_sent_at, prescription_sent_by, user_id, answers,
        patient:profiles!patient_id (id, auth_user_id, full_name)`)
    .eq("id", intakeId)
    .single()

  if (fetchError || !intake) {
    log.error("Intake not found", { intakeId }, fetchError || new Error("Not found"))
    return { success: false, error: "Intake not found" }
  }

  // Validate service type
  if (!["repeat_rx", "repeat_prescription"].includes(intake.service_type)) {
    return { success: false, error: "This action is only for repeat prescription intakes" }
  }

  // Handle marking as sent
  if (sent) {
    // Check if already sent
    if (intake.prescription_sent_at) {
      return { success: false, error: "Prescription has already been marked as sent" }
    }

    // Validate status - should be in reviewable state
    if (!["paid", "in_review", "approved"].includes(intake.status)) {
      return { success: false, error: `Cannot mark as sent when status is ${intake.status}` }
    }

    const now = new Date().toISOString()

    // Update intake: mark as sent and transition to completed
    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        prescription_sent_at: now,
        prescription_sent_by: doctorId,
        prescription_sent_channel: channel,
        status: "completed",
        reviewed_at: intake.status !== "approved" ? now : undefined,
        reviewed_by: intake.status !== "approved" ? doctorId : undefined,
        updated_at: now,
      })
      .eq("id", intakeId)

    if (updateError) {
      log.error("Failed to mark script as sent", { intakeId }, updateError)
      return { success: false, error: "Failed to update intake" }
    }

    // Audit log (sanitized - no PHI)
    await logAuditEvent({
      action: "state_change",
      actorId: doctorId,
      actorType: "doctor",
      requestId: intakeId,
      fromState: intake.status,
      toState: "completed",
      metadata: {
        action_type: "repeat_rx_script_sent",
        sent: true,
        channel,
        service_type: intake.service_type,
      },
    })

    log.info("Repeat script marked as sent", {
      intakeId,
      doctorId,
      channel,
      previousStatus: intake.status
    })

    // Send prescription approved email to patient
    try {
      const patientArr = intake.patient as unknown as Array<{
        id: string; auth_user_id: string; full_name: string | null
      }> | null
      const patient = patientArr?.[0] ?? null
      if (patient?.auth_user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(patient.auth_user_id)
        const patientEmail = authUser?.user?.email
        if (patientEmail) {
          const answers = (intake.answers || {}) as Record<string, unknown>
          const medicationName = String(answers.medicationName || "medication")
          const patientName = patient.full_name || "there"

          await sendEmail({
            to: patientEmail,
            toName: patientName,
            subject: prescriptionApprovedSubject(medicationName),
            template: PrescriptionApprovedEmail({
              patientName,
              medicationName,
              requestId: intakeId,
              appUrl: env.appUrl,
            }),
            emailType: "prescription_approved",
            intakeId,
            patientId: patient.id,
            metadata: { medicationName, channel },
            tags: [
              { name: "category", value: "prescription_approved" },
              { name: "intake_id", value: intakeId },
            ],
          })
        }
      }
    } catch (emailErr) {
      // Don't fail the action if email fails — script is already marked as sent
      log.warn("Failed to send prescription approval email", {
        intakeId,
        error: String(emailErr),
      })
    }

    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath("/doctor/queue")

    return {
      success: true,
      sentAt: now,
      sentBy: doctorId
    }
  } 
  
  // Handle undo (only for admins or within 5 minutes)
  else {
    if (!intake.prescription_sent_at) {
      return { success: false, error: "Prescription is not marked as sent" }
    }

    // Check if admin or within 5-minute window
    const sentAt = new Date(intake.prescription_sent_at)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isWithinWindow = sentAt > fiveMinutesAgo
    const isAdmin = auth.profile.role === "admin"
    const isSameDoctor = intake.prescription_sent_by === doctorId

    if (!isAdmin && (!isSameDoctor || !isWithinWindow)) {
      return { 
        success: false, 
        error: "Can only undo within 5 minutes of marking as sent, or contact admin" 
      }
    }

    // Revert to approved status
    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        prescription_sent_at: null,
        prescription_sent_by: null,
        prescription_sent_channel: null,
        status: "approved", // Revert to approved state
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    if (updateError) {
      log.error("Failed to undo script sent", { intakeId }, updateError)
      return { success: false, error: "Failed to update intake" }
    }

    // Audit log
    await logAuditEvent({
      action: "state_change",
      actorId: doctorId,
      actorType: auth.profile.role as "doctor" | "admin",
      requestId: intakeId,
      fromState: "completed",
      toState: "approved",
      metadata: {
        action_type: "repeat_rx_script_sent_undone",
        sent: false,
        reason: isAdmin ? "admin_override" : "doctor_undo_within_window",
        service_type: intake.service_type,
      },
    })

    log.info("Repeat script sent status undone", { intakeId, doctorId, isAdmin })

    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath("/doctor/queue")

    return { success: true }
  }
}

/**
 * Get repeat prescription status for an intake
 */
export async function getRepeatPrescriptionStatus(intakeId: string): Promise<{
  hasDraft: boolean
  draftStatus: string | null
  scriptSent: boolean
  sentAt: string | null
  sentBy: string | null
  sentChannel: string | null
} | null> {
  const auth = await getApiAuth()
  
  if (!auth || !["doctor", "admin"].includes(auth.profile.role)) {
    return null
  }

  const supabase = createServiceRoleClient()

  // Get intake with prescription status
  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select("prescription_sent_at, prescription_sent_by, prescription_sent_channel")
    .eq("id", intakeId)
    .single()

  if (intakeError || !intake) {
    return null
  }

  // Check for AI draft
  const { data: draft } = await supabase
    .from("document_drafts")
    .select("status")
    .eq("intake_id", intakeId)
    .eq("is_ai_generated", true)
    .eq("type", "clinical_note")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  return {
    hasDraft: !!draft,
    draftStatus: draft?.status || null,
    scriptSent: !!intake.prescription_sent_at,
    sentAt: intake.prescription_sent_at,
    sentBy: intake.prescription_sent_by,
    sentChannel: intake.prescription_sent_channel,
  }
}
