"use server"

/**
 * Approve Consult Server Action
 *
 * Approves a consultation intake, transitions status, and sends a
 * pathway-specific approval email to the patient.
 */

import * as React from "react"
import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"
import { sendEmail, type EmailType } from "@/lib/email/send-email"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRoleOrNull } from "@/lib/auth"
import { env } from "@/lib/env"
import { logger } from "@/lib/observability/logger"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createNotification } from "@/lib/notifications/service"
import { EdApprovedEmail, edApprovedSubject } from "@/components/email/templates/ed-approved"
import { HairLossApprovedEmail, hairLossApprovedSubject } from "@/components/email/templates/hair-loss-approved"
import { WomensHealthApprovedEmail, womensHealthApprovedSubject } from "@/components/email/templates/womens-health-approved"
import { WeightLossApprovedEmail, weightLossApprovedSubject } from "@/components/email/templates/weight-loss-approved"
import { ConsultApprovedEmail, consultApprovedSubject } from "@/components/email/templates/consult-approved"

interface ApproveConsultResult {
  success: boolean
  error?: string
  emailSent?: boolean
}

/**
 * Approve a consultation intake and send a pathway-specific email.
 */
export async function approveConsultAction(
  intakeId: string,
  doctorNotes?: string,
): Promise<ApproveConsultResult> {
  try {
    const authResult = await requireRoleOrNull(["doctor", "admin"])
    if (!authResult) {
      return { success: false, error: "Unauthorized or session expired" }
    }
    const doctorProfile = authResult.profile

    const supabase = createServiceRoleClient()

    // Fetch intake with patient details
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id, status, category, subtype,
        patient:profiles!patient_id (id, full_name, email)
      `)
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      return { success: false, error: "Intake not found" }
    }

    // Validate status
    if (!["paid", "in_review"].includes(intake.status)) {
      return { success: false, error: `Cannot approve intake with status '${intake.status}'` }
    }

    // Get patient array (Supabase join returns array)
    const patientRaw = intake.patient as unknown as { id: string; full_name: string | null; email: string | null }[] | { id: string; full_name: string | null; email: string | null } | null
    const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
    if (!patient) {
      return { success: false, error: "Patient not found" }
    }

    const patientEmail = patient.email
    if (!patientEmail) {
      return { success: false, error: "Patient email not found" }
    }

    const now = new Date().toISOString()

    // Transition to approved — status guard prevents double-approval race condition
    const { data: updatedRows, error: updateError } = await supabase
      .from("intakes")
      .update({
        status: "approved",
        reviewed_at: now,
        reviewed_by: doctorProfile.id,
        updated_at: now,
      })
      .eq("id", intakeId)
      .in("status", ["paid", "in_review"])
      .select("id")

    if (updateError) {
      return { success: false, error: "Failed to update intake status" }
    }

    if (!updatedRows || updatedRows.length === 0) {
      return { success: false, error: "This intake has already been processed by another doctor" }
    }

    // Audit log — written immediately after status update.
    // If this fails we log the error but do NOT revert the approval,
    // because the approval itself is the critical clinical path.
    try {
      await logAuditEvent({
        action: "state_change",
        actorId: doctorProfile.id,
        actorType: "doctor",
        intakeId,
        fromState: intake.status,
        toState: "approved",
        metadata: {
          action_type: "consult_approved",
          subtype: intake.subtype,
          category: intake.category,
        },
      })
    } catch (auditError) {
      logger.error("CRITICAL: Audit log failed for consult approval — intake was approved without audit trail", {
        intakeId,
        doctorId: doctorProfile.id,
        fromState: intake.status,
      }, auditError instanceof Error ? auditError : new Error(String(auditError)))
      Sentry.captureMessage("Consult approval audit log write failed", {
        level: "error",
        tags: { intake_id: intakeId, subsystem: "audit-trail" },
        extra: { doctorId: doctorProfile.id, fromState: intake.status },
      })
    }

    // Fetch answers from intake_answers table for email template
    const { data: intakeAnswersRow } = await supabase
      .from("intake_answers")
      .select("answers")
      .eq("intake_id", intakeId)
      .single()
    const answers = (intakeAnswersRow?.answers || {}) as Record<string, unknown>
    const consultSubtype = (answers.consultSubtype as string) || intake.subtype || "general"
    const medicationName = String(answers.medicationName || answers.selectedMedication || "medication")
    const treatmentType = answers.womensHealthType as string | undefined
    const patientName = patient.full_name || "there"

    let emailTemplate: React.ReactElement
    let emailSubject: string
    let emailType: EmailType

    switch (consultSubtype) {
      case "ed":
        emailTemplate = EdApprovedEmail({ patientName, medicationName, requestId: intakeId, appUrl: env.appUrl })
        emailSubject = edApprovedSubject(medicationName)
        emailType = "ed_approved"
        break
      case "hair_loss":
        emailTemplate = HairLossApprovedEmail({ patientName, medicationName, requestId: intakeId, appUrl: env.appUrl })
        emailSubject = hairLossApprovedSubject(medicationName)
        emailType = "hair_loss_approved"
        break
      case "womens_health":
        emailTemplate = WomensHealthApprovedEmail({ patientName, medicationName, treatmentType, requestId: intakeId, appUrl: env.appUrl })
        emailSubject = womensHealthApprovedSubject(medicationName)
        emailType = "womens_health_approved"
        break
      case "weight_loss":
        emailTemplate = WeightLossApprovedEmail({ patientName, medicationName, requestId: intakeId, appUrl: env.appUrl })
        emailSubject = weightLossApprovedSubject(medicationName)
        emailType = "weight_loss_approved"
        break
      default:
        emailTemplate = ConsultApprovedEmail({ patientName, requestId: intakeId, doctorNotes, appUrl: env.appUrl })
        emailSubject = consultApprovedSubject
        emailType = "consult_approved"
        break
    }

    // Send email
    const emailResult = await sendEmail({
      to: patientEmail,
      toName: patientName,
      subject: emailSubject,
      template: emailTemplate,
      emailType,
      intakeId,
      patientId: patient.id,
      metadata: { subtype: consultSubtype, medicationName },
      tags: [
        { name: "category", value: "consult_approved" },
        { name: "subtype", value: consultSubtype },
        { name: "intake_id", value: intakeId },
      ],
    })

    if (!emailResult.success) {
      logger.error("Failed to send consult approval email (consult still approved)", {
        intakeId,
        error: emailResult.error,
      })
      // Alert ops -- patient approved but may never learn about it
      Sentry.captureMessage("Consult approval email failed to send", {
        level: "error",
        tags: { email_type: emailType, intake_id: intakeId },
        extra: { error: emailResult.error, patientId: patient.id },
      })
    }

    // Create in-app notification
    await createNotification({
      userId: patient.id,
      type: "request_update",
      title: "Your consultation has been reviewed",
      message: "Your doctor has reviewed your request. Check your email for details.",
      metadata: { intakeId },
    }).catch((err) => {
      logger.warn("Failed to create notification", { intakeId, error: String(err) })
    })

    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath("/doctor/queue")

    return {
      success: true,
      emailSent: emailResult.success,
    }
  } catch (error) {
    logger.error("Consult approval failed", {}, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "Internal server error" }
  }
}
