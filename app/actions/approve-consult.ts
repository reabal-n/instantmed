"use server"

/**
 * Approve Consult Server Action
 *
 * Approves a consultation intake, transitions status, and sends a
 * pathway-specific approval email to the patient.
 */

import * as React from "react"
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
        id, status, service_type, category, subtype, answers,
        patient:profiles!patient_id (id, auth_user_id, full_name)
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
    const patientArr = intake.patient as unknown as Array<{
      id: string
      auth_user_id: string
      full_name: string | null
    }> | null
    const patient = patientArr?.[0] ?? null
    if (!patient?.auth_user_id) {
      return { success: false, error: "Patient not found" }
    }

    // Get patient email
    const { data: authUser } = await supabase.auth.admin.getUserById(patient.auth_user_id)
    const patientEmail = authUser?.user?.email
    if (!patientEmail) {
      return { success: false, error: "Patient email not found" }
    }

    const now = new Date().toISOString()

    // Transition to approved
    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        status: "approved",
        reviewed_at: now,
        reviewed_by: doctorProfile.id,
        updated_at: now,
      })
      .eq("id", intakeId)

    if (updateError) {
      return { success: false, error: "Failed to update intake status" }
    }

    // Audit log
    await logAuditEvent({
      action: "state_change",
      actorId: doctorProfile.id,
      actorType: "doctor",
      requestId: intakeId,
      fromState: intake.status,
      toState: "approved",
      metadata: {
        action_type: "consult_approved",
        subtype: intake.subtype,
        service_type: intake.service_type,
      },
    })

    // Determine email template based on subtype
    const answers = (intake.answers || {}) as Record<string, unknown>
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
    }

    // Create in-app notification
    await createNotification({
      userId: patient.auth_user_id,
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
